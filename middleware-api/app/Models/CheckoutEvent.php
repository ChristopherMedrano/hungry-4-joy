<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class CheckoutEvent extends Model
{
    protected $fillable = [
        'event_id',
        'event_type',
        'event_created_at',
        'donation_attempt_id',
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

    public function hubSpotSyncEligible(): bool
    {
        return $this->event_type === 'donation.created'
            && $this->transaction_status === 'completed'
            && filled($this->donation_attempt_id)
            && filled($this->donor_email);
    }

    /**
     * @return HasOne<CrmSyncAttempt, $this>
     */
    public function crmSyncAttempt(): HasOne
    {
        return $this->hasOne(CrmSyncAttempt::class);
    }

    /**
     * @return HasMany<ServerAnalyticsEvent, $this>
     */
    public function serverAnalyticsEvents(): HasMany
    {
        return $this->hasMany(ServerAnalyticsEvent::class);
    }
}
