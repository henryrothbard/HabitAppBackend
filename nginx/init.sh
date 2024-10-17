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
apk add --no-cache openssl gettext

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

if [ "$ENVIRONMENT" == "production" ]; then 
    apk add --no-cache socat curl

    curl https://get.acme.sh | sh -s email="$EMAIL"

    echo "Installed acme.sh"

    mkdir -p "$WEBROOT"

    copy_temp_http_conf

    echo "Starting NGINX temporarily for ACME challenge..."
    nginx

    if [ ! -f "$CERTS/private/key.pem" ] || [ ! -f "$CERTS/cert.pem" ]; then
        echo "Issuing new certificate using acme.sh..."
        ~/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$WEBROOT"
    else
        echo "Certificate already exists, skipping issuance."
    fi

    copy_nginx_conf "$MYCONFIGS/prod.conf"

    envsubst '$PORT $DOMAIN' < $CONFIG/nginx.conf > $CONFIG/nginx.conf.tmp
    mv $CONFIG/nginx.conf.tmp $CONFIG/nginx.conf

    echo "Reloading NGINX with SSL..."
    ~/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
        --key-file "$CERTS/private/key.pem" \
        --fullchain-file "$CERTS/cert.pem" \
        --reloadcmd "nginx -s reload"

    echo "success!"

    tail -f /var/log/nginx/error.log
else
    if [ -z "$DOMAIN" ]; then
        echo "No domain provided, using 'localhost' for development..."
        DOMAIN="localhost"
    fi

    copy_nginx_conf "$MYCONFIGS/dev.conf"

    if [ ! -f "$CERTS/private/key.pem" ] || [ ! -f "$CERTS/cert.pem" ]; then
        echo "Generating self-signed certificate for development..."
        openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
            -subj "/CN=$DOMAIN" \
            -keyout "$CERTS/private/key.pem" \
            -out "$CERTS/cert.pem"
    fi

    echo "Starting NGINX in development mode..."

    
    envsubst '$PORT $DOMAIN' < $CONFIG/nginx.conf > $CONFIG/nginx.conf.tmp
    mv $CONFIG/nginx.conf.tmp $CONFIG/nginx.conf

    echo $PORT $DOMAIN

    nginx 
    tail -f /var/log/nginx/error.log
fi