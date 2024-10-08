#!/bin/bash

set -e

ENVIRONMENT=$1
DOMAIN=$2
EMAIL=$3

echo "Starting nginx in: ${ENVIRONMENT}"

MYCONFIGS=/usr/local/etc/nginx
CONFIG=/etc/nginx/conf.d
CERTS=/etc/nginx/ssl
WEBROOT=/var/www/html

mkdir -p "$CERTS/private"
apk add --no-cache openssl

# Function to copy the nginx configuration
copy_nginx_conf() {
    if [ -f "$1" ]; then
        cp "$1" "$CONFIG/nginx.conf"
    elif [ -f "$MYCONFIGS/nginx.conf" ]; then 
        cp "$MYCONFIGS/nginx.conf" "$CONFIG/nginx.conf"
    else
        echo "No nginx config found at $1 or $CONFIG/nginx.conf"
        exit 1
    fi
}

# Function to set up a temporary HTTP config for the ACME challenge
copy_temp_http_conf() {
    echo "Setting up temporary NGINX configuration for ACME challenge..."
    cat > "$CONFIG/nginx.conf" <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
        allow all;
    }

    location / {
        return 503; # Temporarily return 503 during the challenge
    }
}
EOF
}

# Check if we're in production mode
if [ "$ENVIRONMENT" == "production" ]; then 
    apk add --no-cache socat curl

    curl https://get.acme.sh | sh -s email="$EMAIL"

    echo "Installed acme.sh"

    mkdir -p "$WEBROOT"

    # Set up temporary config for ACME challenge
    copy_temp_http_conf

    # Start nginx temporarily to serve the ACME challenge
    echo "Starting NGINX temporarily for ACME challenge..."
    nginx -g "daemon off;" &

    # Check if the certificate already exists before issuing a new one
    if [ ! -f "$CERTS/private/key.pem" ] || [ ! -f "$CERTS/cert.pem" ]; then
        echo "Issuing new certificate using acme.sh..."
        ~/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$WEBROOT"
    else
        echo "Certificate already exists, skipping issuance."
    fi

    # Stop the temporary nginx instance after the ACME challenge is done
    echo "Stopping temporary NGINX..."
    nginx -s stop

    # Copy the production config with SSL
    copy_nginx_conf "$MYCONFIGS/prod.conf"

    # Install the SSL certificate and set up NGINX to reload when it updates
    ~/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
        --key-file "$CERTS/private/key.pem" \
        --fullchain-file "$CERTS/cert.pem" \
        --reloadcmd "nginx -s reload"

    # Finally, start NGINX with SSL enabled
    echo "Starting NGINX with SSL..."
    nginx -g "daemon off;"

else
    # Development mode
    if [ -z "$DOMAIN" ]; then
        echo "No domain provided, using 'localhost' for development..."
        DOMAIN="localhost"
    fi

    # Copy the development config
    copy_nginx_conf "$MYCONFIGS/dev.conf"

    # Generate a self-signed certificate for development if not already present
    if [ ! -f "$CERTS/private/key.pem" ] || [ ! -f "$CERTS/cert.pem" ]; then
        echo "Generating self-signed certificate for development..."
        openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
            -subj "/CN=$DOMAIN" \
            -keyout "$CERTS/private/key.pem" \
            -out "$CERTS/cert.pem"
    fi

    # Start NGINX in development mode
    echo "Starting NGINX in development mode..."
    nginx -g "daemon off;"
fi