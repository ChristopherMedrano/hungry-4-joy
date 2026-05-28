#!/usr/bin/env bash
set -euo pipefail

: "${WP_SITE_URL:?Set WP_SITE_URL to the public WordPress URL.}"
: "${WP_ADMIN_USER:?Set WP_ADMIN_USER for the demo WordPress admin.}"
: "${WP_ADMIN_PASSWORD:?Set WP_ADMIN_PASSWORD as a Render secret.}"
: "${WP_ADMIN_EMAIL:?Set WP_ADMIN_EMAIL as a Render secret.}"

export APACHE_RUN_DIR="${APACHE_RUN_DIR:-/var/run/apache2}"
export APACHE_PID_FILE="${APACHE_PID_FILE:-/var/run/apache2/apache2.pid}"
export APACHE_RUN_USER="${APACHE_RUN_USER:-www-data}"
export APACHE_RUN_GROUP="${APACHE_RUN_GROUP:-www-data}"
export APACHE_LOG_DIR="${APACHE_LOG_DIR:-/var/log/apache2}"
export APACHE_LOCK_DIR="${APACHE_LOCK_DIR:-/var/lock/apache2}"

if [ ! -e /var/www/html/wp-includes/version.php ]; then
    mkdir -p /var/www/html
    tar cf - --one-file-system -C /usr/src/wordpress . | tar xf - -C /var/www/html
fi

mkdir -p "${WP_SQLITE_DIR:-/tmp/hungry-4-joy-wordpress}"
chown -R www-data:www-data /var/www/html "${WP_SQLITE_DIR:-/tmp/hungry-4-joy-wordpress}"

wp_cli=(wp --allow-root --path=/var/www/html)

if ! "${wp_cli[@]}" core is-installed --url="$WP_SITE_URL" >/dev/null 2>&1; then
    "${wp_cli[@]}" core install \
        --url="$WP_SITE_URL" \
        --title="${WP_SITE_TITLE:-Hungry 4 Joy}" \
        --admin_user="$WP_ADMIN_USER" \
        --admin_password="$WP_ADMIN_PASSWORD" \
        --admin_email="$WP_ADMIN_EMAIL" \
        --skip-email
fi

"${wp_cli[@]}" option update home "$WP_SITE_URL"
"${wp_cli[@]}" option update siteurl "$WP_SITE_URL"
"${wp_cli[@]}" option update blogdescription "Small gifts. Full tables."
"${wp_cli[@]}" plugin activate sqlite-database-integration || true
"${wp_cli[@]}" theme activate hungry-4-joy
"${wp_cli[@]}" rewrite structure '/%postname%/' --hard || true

chown -R www-data:www-data "${WP_SQLITE_DIR:-/tmp/hungry-4-joy-wordpress}"

exec apache2-foreground
