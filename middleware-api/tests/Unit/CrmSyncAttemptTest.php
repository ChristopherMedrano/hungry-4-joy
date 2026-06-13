<?php

namespace Tests\Unit;

use App\Models\CrmSyncAttempt;
use Tests\TestCase;

class CrmSyncAttemptTest extends TestCase
{
    public function test_manual_retry_eligible_for_failed_retryable_and_list_warning(): void
    {
        $this->assertTrue((new CrmSyncAttempt(['status' => 'retryable']))->manualRetryEligible());
        $this->assertTrue((new CrmSyncAttempt(['status' => 'failed']))->manualRetryEligible());
        $this->assertTrue((new CrmSyncAttempt([
            'status' => 'succeeded',
            'error_code' => 'hubspot_list_warning',
        ]))->manualRetryEligible());
        $this->assertFalse((new CrmSyncAttempt(['status' => 'pending']))->manualRetryEligible());
        $this->assertFalse((new CrmSyncAttempt(['status' => 'succeeded']))->manualRetryEligible());
    }
}
