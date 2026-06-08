<?php

namespace App\Services\HubSpot;

use App\Contracts\HubSpotClient;
use App\Models\CheckoutEvent;

class HubSpotDonationSyncer
{
    public function __construct(private readonly HubSpotClient $hubSpot) {}

    /**
     * @return array<string, mixed>
     */
    public function sync(CheckoutEvent $event): array
    {
        if (! $event->hubSpotSyncEligible()) {
            return ['status' => 'skipped_ineligible'];
        }

        $contactId = $this->hubSpot->upsertContact(
            $event->donor_email,
            $event->donor_first_name,
            $event->donor_last_name,
            $event->donor_phone,
        );

        $dealId = $this->hubSpot->createDeal($this->dealProperties($event));

        $this->hubSpot->associateDealToContact($dealId, $contactId);

        $listResult = $this->hubSpot->addContactToList(
            $contactId,
            (string) config('services.hubspot.newsletter_list_id', '9'),
        );

        return [
            'status' => 'synced',
            'contact_id' => $contactId,
            'deal_id' => $dealId,
            'list_result' => $listResult,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function dealProperties(CheckoutEvent $event): array
    {
        return [
            'h4j_donation_attempt_id' => $event->donation_attempt_id,
            'dealname' => $event->campaign_name.' - '.$event->donation_label,
            'amount' => (float) $event->donation_amount,
            'deal_currency_code' => $event->donation_currency,
            'h4j_campaign_id' => $event->campaign_id,
            'h4j_campaign_name' => $event->campaign_name,
            'h4j_donation_label' => $event->donation_label,
            'h4j_donation_type' => $event->donation_type,
            'h4j_checkout_provider' => $event->checkout_provider,
            'h4j_transaction_id' => $event->transaction_id,
            'h4j_checkout_session_id' => $event->checkout_session_id,
            'h4j_source_page' => $event->source_page,
            'h4j_checkout_event_id' => $event->event_id,
            'closedate' => $event->event_created_at?->toIso8601String(),
        ];
    }
}
