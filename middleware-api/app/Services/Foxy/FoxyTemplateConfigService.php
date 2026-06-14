<?php

namespace App\Services\Foxy;

use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class FoxyTemplateConfigService
{
    private const DEMO_BANNER_START = '<!-- h4j-foxy-demo-banner:start -->';

    private const DEMO_BANNER_END = '<!-- h4j-foxy-demo-banner:end -->';

    public function __construct(private readonly FoxyApiClient $foxyApi) {}

    /**
     * @return array{template_config_id: int, footer_updated: bool}
     */
    public function syncCheckoutDemoBanner(?string $bannerPath = null): array
    {
        if (! $this->foxyApi->configured()) {
            throw new RuntimeException('foxy_api_not_configured');
        }

        $templateConfig = $this->primaryTemplateConfig();
        $templateConfigId = (int) ($templateConfig['id'] ?? 0);
        $selfHref = (string) data_get($templateConfig, '_links.self.href', '');

        if ($templateConfigId === 0 && $selfHref === '') {
            throw new RuntimeException('foxy_template_config_not_found');
        }

        $settings = $this->decodeTemplateConfigJson($templateConfig);
        $existingFooter = (string) data_get($settings, 'custom_script_values.footer', '');
        $banner = $this->loadBannerFooter($bannerPath);

        if ($this->footerAlreadyContainsBanner($existingFooter, $banner)) {
            return [
                'template_config_id' => $templateConfigId,
                'footer_updated' => false,
            ];
        }

        $mergedFooter = $this->mergeDemoBannerFooter($existingFooter, $banner);

        data_set($settings, 'custom_script_values.footer', $mergedFooter);

        $patchUrl = $selfHref !== ''
            ? $selfHref
            : "https://api.foxycart.com/template_configs/{$templateConfigId}";

        $this->foxyApi->patchResource($patchUrl, [
            'json' => json_encode($settings, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        ]);

        return [
            'template_config_id' => $templateConfigId,
            'footer_updated' => true,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function primaryTemplateConfig(): array
    {
        $storeId = (string) config('services.foxy.store_id');
        $collection = $this->foxyApi->getResource("https://api.foxycart.com/stores/{$storeId}/template_configs");
        $configs = $collection['_embedded']['fx:template_configs']
            ?? $collection['_embedded']['template_configs']
            ?? [];

        if (! is_array($configs) || $configs === []) {
            throw new RuntimeException('foxy_template_config_not_found');
        }

        $config = array_values($configs)[0];

        if (! is_array($config)) {
            throw new RuntimeException('foxy_template_config_not_found');
        }

        if (! isset($config['id']) && isset($config['_links']['self']['href'])) {
            $href = (string) $config['_links']['self']['href'];
            if (preg_match('/\/template_configs\/(\d+)/', $href, $matches) === 1) {
                $config['id'] = (int) $matches[1];
            }
        }

        return $config;
    }

    /**
     * @param  array<string, mixed>  $templateConfig
     * @return array<string, mixed>
     */
    private function decodeTemplateConfigJson(array $templateConfig): array
    {
        $json = $templateConfig['json'] ?? '{}';
        $decoded = is_string($json) ? json_decode($json, true) : $json;

        if (! is_array($decoded)) {
            throw new RuntimeException('foxy_template_config_invalid');
        }

        if (! isset($decoded['custom_script_values']) || ! is_array($decoded['custom_script_values'])) {
            $decoded['custom_script_values'] = [
                'header' => '',
                'footer' => '',
                'checkout_fields' => '',
                'multiship_checkout_fields' => '',
            ];
        }

        return $decoded;
    }

    private function loadBannerFooter(?string $bannerPath): string
    {
        $path = $bannerPath ?? dirname(base_path()).'/examples/foxy/checkout-demo-banner-footer.twig';

        if (! is_readable($path)) {
            throw new RuntimeException('foxy_demo_banner_template_missing');
        }

        $contents = file_get_contents($path);

        if ($contents === false || trim($contents) === '') {
            throw new RuntimeException('foxy_demo_banner_template_missing');
        }

        return trim($contents);
    }

    private function mergeDemoBannerFooter(string $existingFooter, string $banner): string
    {
        $pattern = '/'.preg_quote(self::DEMO_BANNER_START, '/').'.*?'.preg_quote(self::DEMO_BANNER_END, '/').'/s';
        $cleaned = trim(preg_replace($pattern, '', $existingFooter) ?? '');
        $block = self::DEMO_BANNER_START."\n".$banner."\n".self::DEMO_BANNER_END;

        return $cleaned === '' ? $block : $cleaned."\n\n".$block;
    }

    private function footerAlreadyContainsBanner(string $existingFooter, string $banner): bool
    {
        $pattern = '/'.preg_quote(self::DEMO_BANNER_START, '/').'(.*?)'.preg_quote(self::DEMO_BANNER_END, '/').'/s';

        if (preg_match($pattern, $existingFooter, $matches) !== 1) {
            return false;
        }

        return trim((string) ($matches[1] ?? '')) === trim($banner);
    }
}
