<?php

namespace Tests\Unit;

use App\Services\Foxy\FoxyTransactionMapper;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class FoxyTransactionMapperTest extends TestCase
{
    private FoxyTransactionMapper $mapper;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mapper = new FoxyTransactionMapper;
    }

    #[DataProvider('statusMappingProvider')]
    public function test_status_mapping(string $foxyStatus, string $eventType, string $transactionStatus, ?string $failureCode = null): void
    {
        $transaction = $this->baseTransaction(['status' => $foxyStatus]);
        $mapped = $this->mapper->toCheckoutEvent($transaction, 'test');

        $this->assertSame($eventType, $mapped['event_type']);
        $this->assertSame($transactionStatus, $mapped['transaction_status']);

        if ($failureCode !== null) {
            $this->assertSame($failureCode, $mapped['failure']['failure_code']);
        } else {
            $this->assertArrayNotHasKey('failure', $mapped);
        }
    }

    /**
     * @return array<string, array{0: string, 1: string, 2: string, 3?: string|null}>
     */
    public static function statusMappingProvider(): array
    {
        return [
            'completed' => ['completed', 'donation.created', 'completed'],
            'approved' => ['approved', 'donation.created', 'completed'],
            'declined' => ['declined', 'payment.failed', 'failed', 'card_declined'],
            'rejected' => ['rejected', 'payment.failed', 'failed', 'card_declined'],
            'pending' => ['pending', 'donation.created', 'pending'],
        ];
    }

    public function test_empty_unfed_transaction_maps_to_checkout_incomplete_failure(): void
    {
        $transaction = $this->baseTransaction([
            'status' => '',
            'data_is_fed' => false,
        ]);

        $mapped = $this->mapper->toCheckoutEvent($transaction, 'reconcile');

        $this->assertSame('payment.failed', $mapped['event_type']);
        $this->assertSame('checkout_incomplete', $mapped['failure']['failure_code']);
        $this->assertSame('incomplete', $mapped['failure']['provider_status']);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function baseTransaction(array $overrides = []): array
    {
        return array_replace_recursive([
            'id' => 2246566861,
            'date_created' => '2026-06-13T12:00:00-0400',
            'customer_email' => 'john@test.com',
            'customer_first_name' => 'John',
            'customer_last_name' => 'Donor',
            'total_order' => 10,
            'currency_code' => 'USD',
            'cart' => 'foxy-cart-test',
            '_embedded' => [
                'fx:items' => [
                    [
                        'name' => 'Loaves 4 Joy',
                        'code' => 'loaves-campaign-01',
                        'price' => 10,
                        'options' => [
                            ['name' => 'donation_attempt_id', 'value' => 'h4j_attempt_mapper_test_0001'],
                            ['name' => 'donation_label', 'value' => '1 loaf'],
                            ['name' => 'donation_type', 'value' => 'one_time'],
                            ['name' => 'source_page', 'value' => 'home'],
                            ['name' => 'campaign_name', 'value' => 'Loaves 4 Joy'],
                        ],
                    ],
                ],
            ],
        ], $overrides);
    }
}
