<?php
/**
 * Hungry-4-Joy child theme functions.
 */

add_action( 'wp_enqueue_scripts', 'h4j_enqueue_child_theme_assets' );

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

	// Register before the Foxy loader so click-time attempt ids are on the href first.
	wp_enqueue_script(
		'h4j-donation-attempt',
		get_stylesheet_directory_uri() . '/assets/js/donation-attempt.js',
		array(),
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
