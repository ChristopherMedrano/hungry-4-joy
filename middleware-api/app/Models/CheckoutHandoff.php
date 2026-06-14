<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CheckoutHandoff extends Model
{
    public const STATUS_CART_HANDOFF_CREATED = 'cart_handoff_created';

    public const STATUS_CHECKOUT_EVENT_RECONCILED = 'checkout_event_reconciled';

    public const STATUS_ABANDONED = 'abandoned';

    protected $fillable = [
        'donation_attempt_id',
        'handoff_status',
        'handoff_at',
        'next_reconcile_at',
        'reconcile_attempts',
        'foxy_transaction_id',
        'checkout_event_id',
        'reconciliation_note',
        'checkout_provider',
        'source_page',
        'campaign_id',
        'campaign_name',
        'donation_amount',
        'donation_currency',
        'donation_label',
        'donation_type',
    ];

    protected function casts(): array
    {
        return [
            'handoff_at' => 'datetime',
            'next_reconcile_at' => 'datetime',
            'donation_amount' => 'decimal:2',
        ];
    }

    public function isTerminal(): bool
    {
        return in_array($this->handoff_status, [
            self::STATUS_CHECKOUT_EVENT_RECONCILED,
            self::STATUS_ABANDONED,
        ], true);
    }

    public function manualReconcileEligible(): bool
    {
        return ! $this->isTerminal();
    }

    /**
     * @return BelongsTo<CheckoutEvent, $this>
     */
    public function checkoutEvent(): BelongsTo
    {
        return $this->belongsTo(CheckoutEvent::class);
    }
}
