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

if ( isset( $_SERVER['HTTP_X_FORWARDED_PROTO'] ) && str_contains( $_SERVER['HTTP_X_FORWARDED_PROTO'], 'https' ) ) {
	$_SERVER['HTTPS'] = 'on';
}

$site_url = getenv( 'WP_SITE_URL' );
if ( $site_url ) {
	define( 'WP_HOME', $site_url );
	define( 'WP_SITEURL', $site_url );
}

define( 'FORCE_SSL_ADMIN', true );

define( 'WP_DEBUG', filter_var( getenv( 'WP_DEBUG' ) ?: false, FILTER_VALIDATE_BOOLEAN ) );

function hungry_4_joy_required_environment_value( string $name ): string {
	$value = getenv( $name );

	if ( ! is_string( $value ) || '' === $value ) {
		throw new RuntimeException( sprintf( 'Required environment variable %s is not set.', $name ) );
	}

	return $value;
}

define( 'AUTH_KEY', hungry_4_joy_required_environment_value( 'WP_AUTH_KEY' ) );
define( 'SECURE_AUTH_KEY', hungry_4_joy_required_environment_value( 'WP_SECURE_AUTH_KEY' ) );
define( 'LOGGED_IN_KEY', hungry_4_joy_required_environment_value( 'WP_LOGGED_IN_KEY' ) );
define( 'NONCE_KEY', hungry_4_joy_required_environment_value( 'WP_NONCE_KEY' ) );
define( 'AUTH_SALT', hungry_4_joy_required_environment_value( 'WP_AUTH_SALT' ) );
define( 'SECURE_AUTH_SALT', hungry_4_joy_required_environment_value( 'WP_SECURE_AUTH_SALT' ) );
define( 'LOGGED_IN_SALT', hungry_4_joy_required_environment_value( 'WP_LOGGED_IN_SALT' ) );
define( 'NONCE_SALT', hungry_4_joy_required_environment_value( 'WP_NONCE_SALT' ) );

$table_prefix = getenv( 'WP_TABLE_PREFIX' ) ?: 'wp_';

if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

require_once ABSPATH . 'wp-settings.php';
