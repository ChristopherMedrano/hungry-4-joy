<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ServerAnalyticsEvent extends Model
{
    protected $fillable = [
        'analytics_event_id',
        'event',
        'checkout_event_id',
        'donation_attempt_id',
        'payload',
    ];

    protected function casts(): array
    {
        return [
            'payload' => 'array',
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
