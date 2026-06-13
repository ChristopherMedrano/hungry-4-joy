<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Analytics Provider Writes
    |--------------------------------------------------------------------------
    |
    | Server conversion events are always stored locally for inspection.
    | External provider writes (Meta CAPI, etc.) stay disabled unless enabled.
    |
    */

    'providers_enabled' => env('ANALYTICS_PROVIDERS_ENABLED', false),

    'log_channel' => env('ANALYTICS_LOG_CHANNEL', 'stack'),

];
