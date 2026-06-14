<?php

namespace App\Support\Dashboard;

use App\Models\IntegrationStepLog;

class DashboardIntegrationStepPresenter
{
    /**
     * @return array<string, mixed>
     */
    public function summary(IntegrationStepLog $log): array
    {
        return [
            'integration_step_log_id' => $log->id,
            'donation_attempt_id' => $log->donation_attempt_id,
            'step' => $log->step,
            'status' => $log->status,
            'producer' => $log->producer,
            'summary' => $log->summary,
            'error_code' => $log->error_code,
            'occurrence_count' => $log->occurrence_count,
            'checkout_event_id' => $log->checkout_event_id,
            'checkout_handoff_id' => $log->checkout_handoff_id,
            'crm_sync_attempt_id' => $log->crm_sync_attempt_id,
            'recorded_at' => $log->updated_at?->toIso8601String() ?? $log->created_at?->toIso8601String(),
        ];
    }
}
