<?php

namespace App\Support\Dashboard;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use App\Services\CheckoutEventIngestor;
use App\Services\HubSpot\HubSpotDonationSyncer;
use Illuminate\Support\Facades\File;

class DashboardStatusDemoSeeder
{
    /**
     * @var list<array{file: string, crm: string, label: string}>
     */
    private const SCENARIOS = [
        [
            'file' => 'synced-fixture-receiver.json',
            'crm' => 'sync_success',
            'label' => 'CRM synced (fixture ingest)',
        ],
        [
            'file' => 'foxy-webhook-donation.json',
            'crm' => 'sync_success',
            'label' => 'Foxy webhook + CRM synced',
        ],
        [
            'file' => 'crm-warning-donation.json',
            'crm' => 'warning',
            'label' => 'CRM synced with list warning',
        ],
        [
            'file' => 'crm-pending-donation.json',
            'crm' => 'pending',
            'label' => 'CRM sync pending',
        ],
        [
            'file' => 'crm-failed-donation.json',
            'crm' => 'failed',
            'label' => 'CRM sync failed',
        ],
        [
            'file' => 'crm-retryable-donation.json',
            'crm' => 'retryable',
            'label' => 'CRM sync retryable',
        ],
        [
            'file' => 'checkout-pending-donation.json',
            'crm' => 'none',
            'label' => 'Checkout pending (CRM n/a)',
        ],
        [
            'file' => 'payment-failed-donation.json',
            'crm' => 'none',
            'label' => 'Payment failed (CRM n/a)',
        ],
    ];

    public function __construct(
        private readonly CheckoutEventIngestor $ingestor,
        private readonly HubSpotDonationSyncer $syncer,
        private readonly DashboardEventPresenter $presenter,
    ) {}

    public function fixtureDirectory(?string $path = null): string
    {
        return $path ?: base_path('../examples/dashboard-status-demo');
    }

    /**
     * @return list<string>
     */
    public function seed(?string $fixtureDirectory = null): array
    {
        $lines = [];

        foreach (self::SCENARIOS as $scenario) {
            $fixturePath = $this->fixtureDirectory($fixtureDirectory).DIRECTORY_SEPARATOR.$scenario['file'];
            $payload = $this->readFixture($fixturePath);
            $event = $this->resolveEvent($payload);
            $this->applyCrmState($event, $scenario['crm'], $payload);
            $summary = $this->presenter->summary($event->fresh(['crmSyncAttempt']));

            $lines[] = sprintf(
                '%s: transaction=%s crm=%s (%s)',
                $scenario['file'],
                $summary['transaction_status'],
                $summary['crm_status_summary'],
                $scenario['label'],
            );
        }

        return $lines;
    }

    /**
     * @return array<string, mixed>
     */
    private function readFixture(string $fixturePath): array
    {
        if (! File::isFile($fixturePath)) {
            throw new \RuntimeException('Fixture not found: '.$fixturePath);
        }

        $payload = json_decode(File::get($fixturePath), true, 512, JSON_THROW_ON_ERROR);

        if (! is_array($payload)) {
            throw new \RuntimeException('Fixture must decode to an object: '.$fixturePath);
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveEvent(array $payload): CheckoutEvent
    {
        $result = $this->ingestor->ingest($payload);

        if ($result['checkout_event'] instanceof CheckoutEvent) {
            return $result['checkout_event'];
        }

        return CheckoutEvent::query()
            ->where('event_id', $payload['event_id'])
            ->firstOrFail();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function applyCrmState(CheckoutEvent $event, string $state, array $payload): void
    {
        match ($state) {
            'sync_success' => $this->syncer->sync($event),
            'warning' => $this->seedWarningState($event),
            'pending' => $this->seedPendingState($event),
            'failed' => $this->seedFailedState($event, $payload),
            'retryable' => $this->seedRetryableState($event, $payload),
            'none' => null,
            default => throw new \InvalidArgumentException('Unknown CRM demo state: '.$state),
        };
    }

    private function seedWarningState(CheckoutEvent $event): void
    {
        $this->syncer->sync($event);

        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->update([
            'status' => 'succeeded',
            'error_code' => 'hubspot_list_warning',
            'error_message' => 'Newsletter list enrollment failed with status 403.',
        ]);
    }

    private function seedPendingState(CheckoutEvent $event): void
    {
        CrmSyncAttempt::query()->where('checkout_event_id', $event->id)->delete();
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function seedFailedState(CheckoutEvent $event, array $payload): void
    {
        CrmSyncAttempt::query()->updateOrCreate(
            ['checkout_event_id' => $event->id],
            [
                'status' => 'failed',
                'hubspot_contact_id' => null,
                'hubspot_deal_id' => null,
                'error_code' => 'hubspot_terminal_error',
                'error_message' => 'HubSpot contact upsert failed with status 400.',
                'retry_count' => 0,
                'last_attempted_at' => now()->subMinutes(20),
                'next_retry_at' => null,
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function seedRetryableState(CheckoutEvent $event, array $payload): void
    {
        CrmSyncAttempt::query()->updateOrCreate(
            ['checkout_event_id' => $event->id],
            [
                'status' => 'retryable',
                'hubspot_contact_id' => $this->fakeContactId($payload),
                'hubspot_deal_id' => null,
                'error_code' => 'hubspot_retryable_error',
                'error_message' => 'HubSpot deal creation failed with status 503.',
                'retry_count' => 1,
                'last_attempted_at' => now()->subMinutes(10),
                'next_retry_at' => now()->addMinutes(15),
            ],
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function fakeContactId(array $payload): string
    {
        $email = (string) data_get($payload, 'donor.email', 'unknown@example.test');

        return 'fake_contact_'.str_replace(['@', '.', '+', '-'], '_', strtolower($email));
    }
}
