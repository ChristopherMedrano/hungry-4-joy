<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmSyncAttempt extends Model
{
    protected $fillable = [
        'checkout_event_id',
        'status',
        'hubspot_contact_id',
        'hubspot_deal_id',
        'hubspot_donation_attempt_id',
        'error_code',
        'error_message',
        'retry_count',
        'last_attempted_at',
        'next_retry_at',
    ];

    protected function casts(): array
    {
        return [
            'retry_count' => 'integer',
            'last_attempted_at' => 'datetime',
            'next_retry_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<CheckoutEvent, $this>
     */
    public function checkoutEvent(): BelongsTo
    {
        return $this->belongsTo(CheckoutEvent::class);
    }
}
