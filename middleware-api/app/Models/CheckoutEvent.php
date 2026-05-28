<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CheckoutEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'event_created_at',
        'checkout_provider',
        'checkout_session_id',
        'transaction_id',
        'transaction_status',
        'idempotency_key',
        'source_page',
        'campaign_id',
        'campaign_name',
        'donation_amount',
        'donation_currency',
        'donation_label',
        'donation_type',
        'donor_email',
        'donor_first_name',
        'donor_last_name',
        'donor_phone',
        'failure_code',
        'failure_message',
        'failure_provider_status',
    ];

    protected function casts(): array
    {
        return [
            'event_created_at' => 'datetime',
            'donation_amount' => 'decimal:2',
        ];
    }
}
