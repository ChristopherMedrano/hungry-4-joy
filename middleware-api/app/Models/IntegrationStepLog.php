<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class IntegrationStepLog extends Model
{
    public const STATUS_SUCCEEDED = 'succeeded';

    public const STATUS_FAILED = 'failed';

    public const STATUS_SKIPPED = 'skipped';

    public const STATUS_RETRYABLE = 'retryable';

    public const STEP_FOXY_WEBHOOK_RECEIVED = 'foxy_webhook_received';

    public const STEP_FOXY_WEBHOOK_REJECTED = 'foxy_webhook_rejected';

    public const STEP_CHECKOUT_EVENT_INGESTED = 'checkout_event_ingested';

    public const STEP_CHECKOUT_EVENT_DUPLICATE = 'checkout_event_duplicate';

    public const STEP_HANDOFF_REGISTERED = 'handoff_registered';

    public const STEP_HANDOFF_RECONCILE_ATTEMPTED = 'handoff_reconcile_attempted';

    public const STEP_CRM_SYNC_DISPATCHED = 'crm_sync_dispatched';

    public const STEP_CRM_SYNC_COMPLETED = 'crm_sync_completed';

    public const PRODUCER_FOXY_WEBHOOK = 'foxy_webhook';

    public const PRODUCER_LARAVEL_INGEST = 'laravel_ingest';

    public const PRODUCER_LARAVEL_HANDOFF = 'laravel_handoff';

    public const PRODUCER_LARAVEL_RECONCILE = 'laravel_reconcile';

    public const PRODUCER_LARAVEL_CRM = 'laravel_crm';

    public const PRODUCER_LARAVEL_QUEUE = 'laravel_queue';

    protected $fillable = [
        'donation_attempt_id',
        'step',
        'status',
        'producer',
        'summary',
        'error_code',
        'checkout_event_id',
        'checkout_handoff_id',
        'crm_sync_attempt_id',
        'occurrence_count',
    ];

    /**
     * @return BelongsTo<CheckoutEvent, $this>
     */
    public function checkoutEvent(): BelongsTo
    {
        return $this->belongsTo(CheckoutEvent::class);
    }

    /**
     * @return BelongsTo<CheckoutHandoff, $this>
     */
    public function checkoutHandoff(): BelongsTo
    {
        return $this->belongsTo(CheckoutHandoff::class);
    }

    /**
     * @return BelongsTo<CrmSyncAttempt, $this>
     */
    public function crmSyncAttempt(): BelongsTo
    {
        return $this->belongsTo(CrmSyncAttempt::class);
    }
}
