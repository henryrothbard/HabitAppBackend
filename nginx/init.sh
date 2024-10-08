#!/bin/bash

set -e

ENVIRONMENT=$1
DOMAIN=$2
EMAIL=$3

MYCONFIGS=/usr/local/etc/nginx
CONFIG=/etc/nginx/conf.d
CERTS=/etc/nginx/ssl
WEBROOT=/var/www/html

mkdir -p "$CERTS/private"
apk add --no-cache openssl

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

if [ "$ENVIRONMENT" == "production" ]; then 
    apk add --no-cache socat curl

    curl https://get.acme.sh | sh -s email="$EMAIL"

    echo "Installed acme.sh"

    mkdir -p "$WEBROOT"

    copy_nginx_conf "$MYCONFIGS/prod.conf"

    nginx -g "daemon off;"

    ~/.acme.sh/acme.sh --issue -d "$DOMAIN" -w "$WEBROOT"
    ~/.acme.sh/acme.sh --install-cert -d "$DOMAIN" \
        --key-file       "$CERTS/private/key.pem" \
        --fullchain-file "$CERTS/cert.pem" \
        --reloadcmd     "nginx -s reload"
else
    if [ -z "$DOMAIN" ]; then
        echo "No domain provided, using 'localhost' for development..."
        DOMAIN="localhost"
    fi

    copy_nginx_conf "$MYCONFIGS/dev.conf" 

    nginx -g "daemon off;"

    openssl req -new -newkey rsa:2048 -days 365 -nodes -x509 \
        -subj "/CN=$DOMAIN" \
        -keyout "$CERTS/private/key.pem" \
        -out "$CERTS/cert.pem"
fi