FROM wordpress:php8.4-apache

ARG SQLITE_PLUGIN_VERSION=2.2.23

RUN apt-get update \
    && apt-get install -y --no-install-recommends unzip \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL "https://downloads.wordpress.org/plugin/sqlite-database-integration.${SQLITE_PLUGIN_VERSION}.zip" -o /tmp/sqlite-database-integration.zip \
    && unzip -q /tmp/sqlite-database-integration.zip -d /usr/src/wordpress/wp-content/plugins \
    && cp /usr/src/wordpress/wp-content/plugins/sqlite-database-integration/db.copy /usr/src/wordpress/wp-content/db.php \
    && rm /tmp/sqlite-database-integration.zip

RUN curl -fsSL https://raw.githubusercontent.com/wp-cli/builds/gh-pages/phar/wp-cli.phar -o /usr/local/bin/wp \
    && chmod +x /usr/local/bin/wp

COPY wp-config-render.php /usr/src/wordpress/wp-config.php
COPY wp-content/themes/hungry-4-joy/ /usr/src/wordpress/wp-content/themes/hungry-4-joy/
COPY bin/render-wordpress-start.sh /usr/local/bin/render-wordpress-start

RUN chmod +x /usr/local/bin/render-wordpress-start \
    && chown -R www-data:www-data /usr/src/wordpress/wp-content

ENTRYPOINT []
CMD ["render-wordpress-start"]
