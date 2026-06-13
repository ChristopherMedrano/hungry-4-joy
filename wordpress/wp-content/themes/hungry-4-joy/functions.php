<?php
/**
 * Hungry-4-Joy child theme functions.
 */

add_action( 'wp_enqueue_scripts', 'h4j_enqueue_child_theme_assets' );
add_action( 'wp_head', 'h4j_print_favicon_links', 1 );
add_action( 'init', 'h4j_serve_root_favicon', 0 );

/**
 * Print favicon link tags for browsers that read the document head first.
 */
function h4j_print_favicon_links() {
	$icon_dir = get_stylesheet_directory_uri() . '/assets/images';
	?>
	<link rel="icon" href="<?php echo esc_url( $icon_dir . '/favicon.ico' ); ?>" sizes="any">
	<link rel="icon" href="<?php echo esc_url( $icon_dir . '/favicon.svg' ); ?>" type="image/svg+xml">
	<?php
}

/**
 * Serve /favicon.ico from the child theme when no docroot icon is present.
 */
function h4j_serve_root_favicon() {
	if ( is_admin() || wp_doing_ajax() || ( defined( 'REST_REQUEST' ) && REST_REQUEST ) ) {
		return;
	}

	$request_path = isset( $_SERVER['REQUEST_URI'] )
		? (string) wp_parse_url( $_SERVER['REQUEST_URI'], PHP_URL_PATH )
		: '';

	if ( '/favicon.ico' !== $request_path ) {
		return;
	}

	$icon_path = get_stylesheet_directory() . '/assets/images/favicon.ico';

	if ( ! file_exists( $icon_path ) ) {
		return;
	}

	header( 'Content-Type: image/x-icon' );
	header( 'Cache-Control: public, max-age=604800' );
	readfile( $icon_path );
	exit;
}

/**
 * Enqueue child theme assets.
 */
function h4j_enqueue_child_theme_assets() {
	$style_path = get_stylesheet_directory() . '/assets/css/style.css';
	$style_version = file_exists( $style_path ) ? filemtime( $style_path ) : wp_get_theme()->get( 'Version' );

	wp_enqueue_style(
		'h4j-fonts',
		'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;600;700;800&family=Fraunces:opsz,wght,SOFT,WONK@9..144,700..900,50,1&family=Spline+Sans+Mono:wght@600;700&display=swap',
		array(),
		null
	);

	wp_enqueue_style(
		'h4j-child-style',
		get_stylesheet_directory_uri() . '/assets/css/style.css',
		array( 'twentytwentyfive-style', 'h4j-fonts' ),
		$style_version
	);

	$donation_attempt_path = get_stylesheet_directory() . '/assets/js/donation-attempt.js';
	$donation_attempt_version = file_exists( $donation_attempt_path ) ? filemtime( $donation_attempt_path ) : wp_get_theme()->get( 'Version' );

	$analytics_consent_path = get_stylesheet_directory() . '/assets/js/analytics-consent.js';
	$analytics_consent_version = file_exists( $analytics_consent_path ) ? filemtime( $analytics_consent_path ) : wp_get_theme()->get( 'Version' );

	$donation_analytics_path = get_stylesheet_directory() . '/assets/js/donation-analytics.js';
	$donation_analytics_version = file_exists( $donation_analytics_path ) ? filemtime( $donation_analytics_path ) : wp_get_theme()->get( 'Version' );

	wp_enqueue_script(
		'h4j-analytics-consent',
		get_stylesheet_directory_uri() . '/assets/js/analytics-consent.js',
		array(),
		$analytics_consent_version,
		true
	);

	wp_enqueue_script(
		'h4j-donation-analytics',
		get_stylesheet_directory_uri() . '/assets/js/donation-analytics.js',
		array( 'h4j-analytics-consent' ),
		$donation_analytics_version,
		true
	);

	wp_localize_script(
		'h4j-donation-analytics',
		'H4J_ANALYTICS_CONFIG',
		array(
			'providersEnabled' => false,
			'sourcePage'       => 'home',
		)
	);

	wp_localize_script(
		'h4j-donation-attempt',
		'H4J_HANDOFF_CONFIG',
		array(
			'apiUrl'     => getenv( 'MIDDLEWARE_API_URL' ) ?: '',
			'sourcePage' => 'home',
		)
	);

	// Register before the Foxy loader so click-time attempt ids are on the href first.
	wp_enqueue_script(
		'h4j-donation-attempt',
		get_stylesheet_directory_uri() . '/assets/js/donation-attempt.js',
		array( 'h4j-donation-analytics' ),
		$donation_attempt_version,
		true
	);

	wp_enqueue_script(
		'h4j-foxy-loader',
		'https://cdn.foxycart.com/hungry-4-joy/loader.js',
		array(),
		null,
		true
	);
}
