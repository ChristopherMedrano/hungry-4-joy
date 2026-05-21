<?php
/**
 * Hungry-4-Joy child theme functions.
 */

add_action( 'wp_enqueue_scripts', 'h4j_enqueue_child_theme_assets' );

/**
 * Enqueue child theme assets.
 */
function h4j_enqueue_child_theme_assets() {
	$theme = wp_get_theme();

	wp_enqueue_style(
		'h4j-child-style',
		get_stylesheet_directory_uri() . '/assets/css/style.css',
		array( 'twentytwentyfive-style' ),
		$theme->get( 'Version' )
	);
}
