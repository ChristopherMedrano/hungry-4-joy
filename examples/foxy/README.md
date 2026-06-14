# Foxy checkout demo banner

The **hosted Foxy checkout page** uses Foxy `template_config.custom_script_values.footer`, updated through the middleware Foxy hAPI.

## Sync the banner to Foxy checkout

From `middleware-api/` with `FOXY_*` OAuth credentials configured:

```bash
php artisan foxy:sync-checkout-demo-banner
```

This command:

1. Loads [`checkout-demo-banner-footer.twig`](checkout-demo-banner-footer.twig)
2. Fetches the store's primary `template_config`
3. Merges the snippet into `custom_script_values.footer` (idempotent markers: `h4j-foxy-demo-banner:start/end`)
4. `PATCH`es the template config via Foxy hAPI

The footer snippet only renders on checkout (`{% if context == "checkout" %}`) and documents:

- **Demo only**
- Approved: card `4111111111111111`
- Declined: billing ZIP `46282`

ZIP `46282` matches Authorize.net sandbox decline testing in [`docs/contracts.md`](../../docs/contracts.md) Section 2.

## Optional custom snippet path

```bash
php artisan foxy:sync-checkout-demo-banner --path=/absolute/path/to/footer.twig
```

## Manual fallback

If API credentials are unavailable, paste [`checkout-demo-banner.html`](checkout-demo-banner.html) into Foxy admin → template config → custom footer.
