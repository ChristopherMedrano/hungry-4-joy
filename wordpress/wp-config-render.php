<?php
/**
 * Render demo WordPress configuration.
 *
 * This file is copied into the WordPress Docker image. It uses the
 * SQLite Database Integration drop-in so the hosted demo does not need
 * a separate MySQL service.
 */

define( 'DB_NAME', 'hungry_4_joy_demo' );
define( 'DB_USER', 'hungry_4_joy_demo' );
define( 'DB_PASSWORD', 'hungry_4_joy_demo' );
define( 'DB_HOST', 'localhost' );
define( 'DB_CHARSET', getenv( 'DB_CHARSET' ) ?: 'utf8' );
define( 'DB_COLLATE', getenv( 'DB_COLLATE' ) ?: '' );

define( 'DB_ENGINE', 'sqlite' );
define( 'DB_DIR', getenv( 'WP_SQLITE_DIR' ) ?: '/tmp/hungry-4-joy-wordpress' );
define( 'DB_FILE', getenv( 'WP_SQLITE_FILE' ) ?: 'demo.sqlite' );

$site_url = getenv( 'WP_SITE_URL' );
if ( $site_url ) {
	define( 'WP_HOME', $site_url );
	define( 'WP_SITEURL', $site_url );
}

define( 'WP_DEBUG', filter_var( getenv( 'WP_DEBUG' ) ?: false, FILTER_VALIDATE_BOOLEAN ) );

define( 'AUTH_KEY', getenv( 'WP_AUTH_KEY' ) ?: 'demo-auth-key-hungry-4-joy' );
define( 'SECURE_AUTH_KEY', getenv( 'WP_SECURE_AUTH_KEY' ) ?: 'demo-secure-auth-key-hungry-4-joy' );
define( 'LOGGED_IN_KEY', getenv( 'WP_LOGGED_IN_KEY' ) ?: 'demo-logged-in-key-hungry-4-joy' );
define( 'NONCE_KEY', getenv( 'WP_NONCE_KEY' ) ?: 'demo-nonce-key-hungry-4-joy' );
define( 'AUTH_SALT', getenv( 'WP_AUTH_SALT' ) ?: 'demo-auth-salt-hungry-4-joy' );
define( 'SECURE_AUTH_SALT', getenv( 'WP_SECURE_AUTH_SALT' ) ?: 'demo-secure-auth-salt-hungry-4-joy' );
define( 'LOGGED_IN_SALT', getenv( 'WP_LOGGED_IN_SALT' ) ?: 'demo-logged-in-salt-hungry-4-joy' );
define( 'NONCE_SALT', getenv( 'WP_NONCE_SALT' ) ?: 'demo-nonce-salt-hungry-4-joy' );

$table_prefix = getenv( 'WP_TABLE_PREFIX' ) ?: 'wp_';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
