<?php

namespace App\Jobs;

use App\Models\CheckoutEvent;
use App\Services\HubSpot\HubSpotDonationSyncer;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class SyncDonationToHubSpot implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly int $checkoutEventId) {}

    public function handle(HubSpotDonationSyncer $syncer): void
    {
        $event = CheckoutEvent::find($this->checkoutEventId);

        if (! $event instanceof CheckoutEvent) {
            return;
        }

        $syncer->sync($event);
    }
}
