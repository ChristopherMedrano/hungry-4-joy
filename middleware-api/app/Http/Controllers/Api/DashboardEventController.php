<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutEvent;
use App\Models\CheckoutHandoff;
use App\Services\Foxy\FoxyApiClient;
use App\Support\Dashboard\DashboardEventPresenter;
use App\Support\Dashboard\DashboardHandoffPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardEventController extends Controller
{
    public function __construct(
        private readonly DashboardEventPresenter $presenter,
        private readonly DashboardHandoffPresenter $handoffPresenter,
        private readonly FoxyApiClient $foxyApi,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);
        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);
        $sort = $this->sortColumn((string) $request->string('sort', '-event_created_at'));

        $query = CheckoutEvent::query()
            ->with('crmSyncAttempt')
            ->when($filters['campaign_id'], fn (Builder $query, string $value) => $query->where('campaign_id', $value))
            ->when($filters['event_type'], fn (Builder $query, string $value) => $query->where('event_type', $value))
            ->when($filters['transaction_status'], fn (Builder $query, string $value) => $query->where('transaction_status', $value))
            ->when($filters['checkout_provider'], fn (Builder $query, string $value) => $query->where('checkout_provider', $value))
            ->when($filters['source_page'], fn (Builder $query, string $value) => $query->where('source_page', $value))
            ->when(
                $filters['ingest_channel'] === 'foxy_webhook',
                fn (Builder $query) => $query->where('event_id', 'like', 'foxy_transaction_%')
            )
            ->when(
                $filters['ingest_channel'] === 'fixture_receiver',
                fn (Builder $query) => $query->where('event_id', 'not like', 'foxy_transaction_%')
            )
            ->when($filters['event_created_from'], fn (Builder $query, string $value) => $query->where('event_created_at', '>=', $value))
            ->when($filters['event_created_to'], fn (Builder $query, string $value) => $query->where('event_created_at', '<=', $value))
            ->when($filters['search'], function (Builder $query, string $value): void {
                $like = '%'.$value.'%';
                $query->where(function (Builder $inner) use ($like): void {
                    $inner->where('donation_attempt_id', 'like', $like)
                        ->orWhere('event_id', 'like', $like)
                        ->orWhere('transaction_id', 'like', $like)
                        ->orWhere('donor_email', 'like', $like);
                });
            });

        $this->applyCrmSyncStatusFilter($query, $filters['crm_sync_status']);
        $this->applyRetryActivityFilter($query, $request->boolean('retry_activity'));

        $paginator = $query
            ->orderBy($sort['column'], $sort['direction'])
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn (CheckoutEvent $event) => $this->presenter->summary($event))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => $filters + [
                'sort' => (string) $request->string('sort', '-event_created_at'),
                'retry_activity' => $request->boolean('retry_activity') ? '1' : null,
            ],
        ]);
    }

    public function show(int $checkoutEvent): JsonResponse
    {
        $event = CheckoutEvent::query()
            ->with(['crmSyncAttempt', 'serverAnalyticsEvents.checkoutEvent'])
            ->findOrFail($checkoutEvent);

        return response()->json([
            'data' => $this->presenter->detail($event),
        ]);
    }

    public function showByAttempt(string $donationAttemptId): JsonResponse
    {
        return response()->json([
            'data' => $this->compositeByAttempt($donationAttemptId),
        ]);
    }

    public function showByCart(int $cartId): JsonResponse
    {
        if (! $this->foxyApi->configured()) {
            return response()->json([
                'message' => 'foxy_api_not_configured',
            ], 503);
        }

        try {
            $cart = $this->foxyApi->findCartById((string) $cartId);
        } catch (RequestException) {
            return response()->json([
                'message' => 'foxy_api_error',
            ], 502);
        }

        if ($cart === null) {
            abort(404);
        }

        $attemptIds = $this->foxyApi->donationAttemptIdsFromCart($cart);

        if ($attemptIds === []) {
            abort(404, 'foxy_cart_missing_attempt_id');
        }

        $donationAttemptId = $this->resolveAttemptIdForCart($attemptIds);
        $composite = $this->compositeByAttempt($donationAttemptId, requireMiddlewareRecord: false);

        return response()->json([
            'data' => $composite + [
                'foxy_cart_id' => (string) $cartId,
                'donation_attempt_ids' => $attemptIds,
                'foxy_cart' => $this->foxyCartSummary($cart, $attemptIds),
            ],
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function compositeByAttempt(string $donationAttemptId, bool $requireMiddlewareRecord = true): array
    {
        $handoff = CheckoutHandoff::query()
            ->where('donation_attempt_id', $donationAttemptId)
            ->first();

        $event = CheckoutEvent::query()
            ->with(['crmSyncAttempt', 'serverAnalyticsEvents.checkoutEvent'])
            ->where('donation_attempt_id', $donationAttemptId)
            ->first();

        if ($requireMiddlewareRecord && $handoff === null && $event === null) {
            abort(404);
        }

        return [
            'donation_attempt_id' => $donationAttemptId,
            'handoff' => $handoff ? $this->handoffPresenter->summary($handoff) : null,
            'checkout_event' => $event ? $this->presenter->detail($event) : null,
        ];
    }

    /**
     * @param  list<string>  $attemptIds
     */
    private function resolveAttemptIdForCart(array $attemptIds): string
    {
        foreach ($attemptIds as $attemptId) {
            $hasHandoff = CheckoutHandoff::query()
                ->where('donation_attempt_id', $attemptId)
                ->exists();

            $hasEvent = CheckoutEvent::query()
                ->where('donation_attempt_id', $attemptId)
                ->exists();

            if ($hasHandoff || $hasEvent) {
                return $attemptId;
            }
        }

        return $attemptIds[0];
    }

    /**
     * @param  array<string, mixed>  $cart
     * @param  list<string>  $attemptIds
     * @return array<string, mixed>
     */
    private function foxyCartSummary(array $cart, array $attemptIds): array
    {
        $items = $cart['_embedded']['fx:items'] ?? [];
        $summarizedItems = [];

        if (is_array($items)) {
            foreach ($items as $item) {
                if (! is_array($item)) {
                    continue;
                }

                $itemAttemptId = null;
                $options = $item['_embedded']['fx:item_options'] ?? $item['options'] ?? [];

                if (is_array($options)) {
                    foreach ($options as $option) {
                        if (! is_array($option)) {
                            continue;
                        }

                        if (($option['name'] ?? null) === 'donation_attempt_id') {
                            $value = $option['value'] ?? null;
                            $itemAttemptId = is_string($value) && $value !== '' ? $value : null;
                            break;
                        }
                    }
                }

                $summarizedItems[] = [
                    'name' => (string) ($item['name'] ?? ''),
                    'price' => $item['price'] ?? null,
                    'quantity' => $item['quantity'] ?? null,
                    'donation_attempt_id' => $itemAttemptId,
                ];
            }
        }

        return [
            'total_order' => $cart['total_order'] ?? null,
            'total_item_price' => $cart['total_item_price'] ?? null,
            'customer_email' => $cart['customer_email'] ?? null,
            'date_created' => $cart['date_created'] ?? null,
            'date_modified' => $cart['date_modified'] ?? null,
            'item_count' => count($summarizedItems),
            'donation_attempt_ids' => $attemptIds,
            'items' => $summarizedItems,
        ];
    }

    /**
     * @return array<string, string|null>
     */
    private function validatedFilters(Request $request): array
    {
        return [
            'campaign_id' => $request->string('campaign_id')->toString() ?: null,
            'event_type' => $request->string('event_type')->toString() ?: null,
            'transaction_status' => $request->string('transaction_status')->toString() ?: null,
            'crm_sync_status' => $request->string('crm_sync_status')->toString() ?: null,
            'checkout_provider' => $request->string('checkout_provider')->toString() ?: null,
            'source_page' => $request->string('source_page')->toString() ?: null,
            'ingest_channel' => $request->string('ingest_channel')->toString() ?: null,
            'event_created_from' => $request->string('event_created_from')->toString() ?: null,
            'event_created_to' => $request->string('event_created_to')->toString() ?: null,
            'search' => $request->string('search')->toString() ?: null,
        ];
    }

    /**
     * @return array{column: string, direction: 'asc'|'desc'}
     */
    private function sortColumn(string $sort): array
    {
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowed = [
            'event_created_at',
            'created_at',
            'donation_amount',
            'campaign_name',
        ];

        if (! in_array($column, $allowed, true)) {
            $column = 'event_created_at';
            $direction = 'desc';
        }

        return ['column' => $column, 'direction' => $direction];
    }

    private function applyCrmSyncStatusFilter(Builder $query, ?string $crmSyncStatus): void
    {
        if ($crmSyncStatus === null || $crmSyncStatus === '') {
            return;
        }

        if ($crmSyncStatus === 'not_applicable') {
            $query->where(function (Builder $inner): void {
                $inner->where('event_type', '!=', 'donation.created')
                    ->orWhere('transaction_status', '!=', 'completed')
                    ->orWhereNull('donation_attempt_id')
                    ->orWhere('donation_attempt_id', '')
                    ->orWhereNull('donor_email')
                    ->orWhere('donor_email', '');
            });

            return;
        }

        $query->where('event_type', 'donation.created')
            ->where('transaction_status', 'completed')
            ->whereNotNull('donation_attempt_id')
            ->where('donation_attempt_id', '!=', '')
            ->whereNotNull('donor_email')
            ->where('donor_email', '!=', '');

        if ($crmSyncStatus === 'pending') {
            $query->where(function (Builder $inner): void {
                $inner->doesntHave('crmSyncAttempt')
                    ->orWhereHas('crmSyncAttempt', fn (Builder $attempt) => $attempt->where('status', 'pending'));
            });

            return;
        }

        $query->whereHas('crmSyncAttempt', fn (Builder $attempt) => $attempt->where('status', $crmSyncStatus));
    }

    private function applyRetryActivityFilter(Builder $query, bool $retryActivity): void
    {
        if (! $retryActivity) {
            return;
        }

        $query->where('event_type', 'donation.created')
            ->where('transaction_status', 'completed')
            ->whereNotNull('donation_attempt_id')
            ->where('donation_attempt_id', '!=', '')
            ->whereNotNull('donor_email')
            ->where('donor_email', '!=', '')
            ->whereHas('crmSyncAttempt', function (Builder $attempt): void {
                $attempt->where(function (Builder $inner): void {
                    $inner->where('retry_count', '>', 0)
                        ->orWhereIn('status', ['failed', 'retryable'])
                        ->orWhere('error_code', 'hubspot_list_warning');
                });
            });
    }
}
