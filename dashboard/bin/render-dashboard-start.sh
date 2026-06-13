#!/bin/sh
set -eu

PORT="${PORT:-8080}"
TARGET="${MIDDLEWARE_API_TARGET:-https://hungry-4-joy-middleware.onrender.com}"
TARGET="${TARGET%/}"
HOST="${TARGET#https://}"
HOST="${HOST#http://}"
HOST="${HOST%%/*}"

cat > /etc/nginx/conf.d/default.conf <<EOF
server {
    listen ${PORT};
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass ${TARGET}/api/;
        proxy_ssl_server_name on;
        proxy_set_header Host ${HOST};
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

exec nginx -g 'daemon off;'
