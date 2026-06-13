<?php

namespace App\Services\Analytics;

use App\Models\CheckoutEvent;
use App\Models\CrmSyncAttempt;
use App\Models\ServerAnalyticsEvent;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Log;

class ServerAnalyticsEmitter
{
    public function __construct(private readonly ServerAnalyticsEventBuilder $builder) {}

    public function emitCheckoutConversion(CheckoutEvent $event): ?ServerAnalyticsEvent
    {
        $payload = $this->builder->fromCheckoutEvent($event);

        if ($payload === null) {
            return null;
        }

        return $this->record($event, (string) $payload['event'], $payload);
    }

    public function emitCrmSyncConversion(CheckoutEvent $event, CrmSyncAttempt $attempt): ?ServerAnalyticsEvent
    {
        $payload = $this->builder->fromCrmSyncAttempt($event, $attempt);

        if ($payload === null) {
            return null;
        }

        return $this->record($event, (string) $payload['event'], $payload);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function record(CheckoutEvent $event, string $eventName, array $payload): ?ServerAnalyticsEvent
    {
        $existing = ServerAnalyticsEvent::query()
            ->where('checkout_event_id', $event->id)
            ->where('event', $eventName)
            ->first();

        if ($existing instanceof ServerAnalyticsEvent) {
            return $existing;
        }

        $envelope = array_merge($payload, [
            'analytics_event_id' => $this->builder->createAnalyticsEventId($eventName),
            'event_created_at' => now()->toIso8601String(),
            'producer' => 'server',
        ]);

        try {
            $record = ServerAnalyticsEvent::create([
                'analytics_event_id' => $envelope['analytics_event_id'],
                'event' => $eventName,
                'checkout_event_id' => $event->id,
                'donation_attempt_id' => $event->donation_attempt_id,
                'payload' => $envelope,
            ]);
        } catch (QueryException $exception) {
            if (! $this->isUniqueConstraintViolation($exception)) {
                throw $exception;
            }

            return ServerAnalyticsEvent::query()
                ->where('checkout_event_id', $event->id)
                ->where('event', $eventName)
                ->first();
        }

        $this->logDemoEvent($envelope);
        $this->writeToProviders($envelope);

        return $record;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function logDemoEvent(array $payload): void
    {
        Log::channel((string) config('analytics.log_channel', 'stack'))->info(
            '[H4J analytics demo]',
            $payload,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function writeToProviders(array $payload): void
    {
        if (! config('analytics.providers_enabled', false)) {
            return;
        }

        Log::channel((string) config('analytics.log_channel', 'stack'))->info(
            '[H4J analytics provider write disabled]',
            ['event' => $payload['event'] ?? null],
        );
    }

    private function isUniqueConstraintViolation(QueryException $exception): bool
    {
        return in_array($exception->getCode(), ['23000', '23505'], true);
    }
}
