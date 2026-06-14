<?php

namespace App\Services\Integration;

use App\Models\IntegrationStepLog;

class IntegrationStepLogger
{
    public function record(
        string $step,
        string $status,
        string $producer,
        string $summary,
        ?string $donationAttemptId = null,
        ?string $errorCode = null,
        ?int $checkoutEventId = null,
        ?int $checkoutHandoffId = null,
        ?int $crmSyncAttemptId = null,
    ): IntegrationStepLog {
        $summary = mb_substr($summary, 0, 500);
        $windowStart = now()->subMinutes(5);

        $existing = IntegrationStepLog::query()
            ->where('donation_attempt_id', $donationAttemptId)
            ->where('step', $step)
            ->where('error_code', $errorCode)
            ->where('created_at', '>=', $windowStart)
            ->orderByDesc('id')
            ->first();

        if ($existing instanceof IntegrationStepLog) {
            $existing->update([
                'occurrence_count' => $existing->occurrence_count + 1,
                'summary' => $summary,
                'status' => $status,
                'checkout_event_id' => $checkoutEventId ?? $existing->checkout_event_id,
                'checkout_handoff_id' => $checkoutHandoffId ?? $existing->checkout_handoff_id,
                'crm_sync_attempt_id' => $crmSyncAttemptId ?? $existing->crm_sync_attempt_id,
                'updated_at' => now(),
            ]);

            return $existing->fresh();
        }

        return IntegrationStepLog::create([
            'donation_attempt_id' => $donationAttemptId,
            'step' => $step,
            'status' => $status,
            'producer' => $producer,
            'summary' => $summary,
            'error_code' => $errorCode,
            'checkout_event_id' => $checkoutEventId,
            'checkout_handoff_id' => $checkoutHandoffId,
            'crm_sync_attempt_id' => $crmSyncAttemptId,
            'occurrence_count' => 1,
        ]);
    }

}
