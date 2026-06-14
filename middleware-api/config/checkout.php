<?php

return [

    'handoff_registration_enabled' => env('CHECKOUT_HANDOFF_REGISTRATION_ENABLED', true),

    'handoff_reconcile_backoff_minutes' => [2, 10, 60, 1440],

    'handoff_abandon_after_hours' => (int) env('CHECKOUT_HANDOFF_ABANDON_AFTER_HOURS', 24),

    'handoff_scheduled_reconcile_enabled' => env('CHECKOUT_HANDOFF_SCHEDULED_RECONCILE', false),

    'handoff_sweep_default_hours' => (int) env('CHECKOUT_HANDOFF_SWEEP_DEFAULT_HOURS', 24),

    'handoff_sweep_max_transactions' => (int) env('CHECKOUT_HANDOFF_SWEEP_MAX_TRANSACTIONS', 50),

];
