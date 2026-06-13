<?php

namespace Tests\Feature;

use App\Models\ServerAnalyticsEvent;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardServerAnalyticsApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_analytics_events_index_returns_empty_envelope_when_no_rows_exist(): void
    {
        $this->getJson('/api/dashboard/analytics-events')
            ->assertOk()
            ->assertExactJson([
                'data' => [],
                'meta' => [
                    'current_page' => 1,
                    'per_page' => 25,
                    'total' => 0,
                    'last_page' => 1,
                ],
                'filters' => [
                    'event' => null,
                    'donation_attempt_id' => null,
                    'checkout_event_row_id' => null,
                    'search' => null,
                    'sort' => '-created_at',
                ],
            ]);
    }

    public function test_completed_checkout_fixture_surfaces_server_analytics_in_dashboard_api(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $list = $this->getJson('/api/dashboard/analytics-events')
            ->assertOk()
            ->json('data');

        $this->assertGreaterThanOrEqual(1, count($list));
        $this->assertSame(
            'DonationCompleted',
            collect($list)->firstWhere('event', 'DonationCompleted')['event'] ?? null,
        );
        $this->assertSame('h4j_attempt_demo_loaves_0001', collect($list)->firstWhere('event', 'DonationCompleted')['donation_attempt_id']);
        $this->assertSame('evt_h4j_demo_20260527_0001', collect($list)->firstWhere('event', 'DonationCompleted')['stored_checkout_event_id']);

        $recordId = ServerAnalyticsEvent::query()->where('event', 'DonationCompleted')->firstOrFail()->id;

        $detail = $this->getJson('/api/dashboard/analytics-events/'.$recordId)
            ->assertOk()
            ->json('data');

        $this->assertSame('DonationCompleted', $detail['payload']['event']);
        $this->assertSame('server', $detail['payload']['producer']);
        $this->assertArrayNotHasKey('donor_email', $detail['payload']);
    }

    public function test_checkout_event_detail_includes_related_server_analytics_summaries(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $checkoutEventId = (int) $this->getJson('/api/dashboard/events')->json('data.0.checkout_event_id');

        $detail = $this->getJson('/api/dashboard/events/'.$checkoutEventId)
            ->assertOk()
            ->json('data');

        $this->assertTrue(
            collect($detail['server_analytics_events'])->contains('event', 'DonationCompleted'),
        );
    }

    public function test_analytics_events_by_attempt_returns_all_records_for_attempt(): void
    {
        $this->postJson('/api/checkout/events', $this->fixture('donation-created.one-time.json'))
            ->assertAccepted();

        $records = $this->getJson('/api/dashboard/analytics-events/by-attempt/h4j_attempt_demo_loaves_0001')
            ->assertOk()
            ->json('data');

        $this->assertNotEmpty($records);
        $this->assertSame('DonationCompleted', $records[0]['event']);
    }

    /**
     * @return array<string, mixed>
     */
    private function fixture(string $fileName): array
    {
        return json_decode(
            file_get_contents(base_path('../examples/checkout-events/'.$fileName)),
            true,
            512,
            JSON_THROW_ON_ERROR,
        );
    }
}
