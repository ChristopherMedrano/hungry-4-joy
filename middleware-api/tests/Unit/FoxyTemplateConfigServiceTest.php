<?php

namespace Tests\Unit;

use App\Services\Foxy\FoxyTemplateConfigService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class FoxyTemplateConfigServiceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'services.foxy.client_id' => 'test-client',
            'services.foxy.client_secret' => 'test-secret',
            'services.foxy.refresh_token' => 'test-refresh',
            'services.foxy.store_id' => '120139',
        ]);
    }

    public function test_sync_checkout_demo_banner_patches_template_config_footer(): void
    {
        $bannerPath = dirname(base_path()).'/examples/foxy/checkout-demo-banner-footer.twig';

        Http::fake(function (\Illuminate\Http\Client\Request $request) use ($bannerPath) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/stores/120139/template_configs') && $request->method() === 'GET') {
                return Http::response([
                    '_embedded' => [
                        'fx:template_configs' => [
                            [
                                'id' => 97256,
                                '_links' => [
                                    'self' => [
                                        'href' => 'https://api.foxycart.com/template_configs/97256',
                                    ],
                                ],
                                'json' => json_encode([
                                    'custom_script_values' => [
                                        'header' => '',
                                        'footer' => '',
                                        'checkout_fields' => '',
                                        'multiship_checkout_fields' => '',
                                    ],
                                ]),
                            ],
                        ],
                    ],
                ], 200);
            }

            if (
                $request->method() === 'PATCH'
                && str_contains($request->url(), '/template_configs/97256')
            ) {
                $payload = $request->data();
                $settings = json_decode((string) ($payload['json'] ?? '{}'), true);
                $footer = (string) data_get($settings, 'custom_script_values.footer', '');

                $this->assertStringContainsString('h4j-foxy-demo-banner:start', $footer);
                $this->assertStringContainsString('h4j-foxy-demo-banner-top', $footer);
                $this->assertStringContainsString('h4j-foxy-demo-banner-bottom', $footer);
                $this->assertStringContainsString('DO NOT USE REAL CARD DATA', $footer);
                $this->assertStringContainsString('Test Card Data:', $footer);

                return Http::response(['id' => 97256], 200);
            }

            return Http::response([], 404);
        });

        $result = app(FoxyTemplateConfigService::class)->syncCheckoutDemoBanner($bannerPath);

        $this->assertSame(97256, $result['template_config_id']);
        $this->assertTrue($result['footer_updated']);
    }

    public function test_sync_checkout_demo_banner_is_idempotent_when_banner_already_present(): void
    {
        $bannerPath = dirname(base_path()).'/examples/foxy/checkout-demo-banner-footer.twig';
        $service = app(FoxyTemplateConfigService::class);
        $existingFooter = '<!-- h4j-foxy-demo-banner:start -->'."\n".trim((string) file_get_contents($bannerPath))."\n".'<!-- h4j-foxy-demo-banner:end -->';

        Http::fake(function (\Illuminate\Http\Client\Request $request) use ($existingFooter) {
            if (str_contains($request->url(), '/token')) {
                return Http::response(['access_token' => 'test-access-token'], 200);
            }

            if (str_contains($request->url(), '/stores/120139/template_configs')) {
                return Http::response([
                    '_embedded' => [
                        'fx:template_configs' => [
                            [
                                'id' => 97256,
                                '_links' => [
                                    'self' => [
                                        'href' => 'https://api.foxycart.com/template_configs/97256',
                                    ],
                                ],
                                'json' => json_encode([
                                    'custom_script_values' => [
                                        'footer' => $existingFooter,
                                    ],
                                ]),
                            ],
                        ],
                    ],
                ], 200);
            }

            return Http::response([], 404);
        });

        $result = $service->syncCheckoutDemoBanner($bannerPath);

        $this->assertFalse($result['footer_updated']);
    }
}
