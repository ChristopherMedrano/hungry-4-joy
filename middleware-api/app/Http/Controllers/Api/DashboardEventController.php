<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutEvent;
use App\Support\Dashboard\DashboardEventPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardEventController extends Controller
{
    public function __construct(private readonly DashboardEventPresenter $presenter) {}

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
            ->with('crmSyncAttempt')
            ->findOrFail($checkoutEvent);

        return response()->json([
            'data' => $this->presenter->detail($event),
        ]);
    }

    public function showByAttempt(string $donationAttemptId): JsonResponse
    {
        $event = CheckoutEvent::query()
            ->with('crmSyncAttempt')
            ->where('donation_attempt_id', $donationAttemptId)
            ->firstOrFail();

        return response()->json([
            'data' => $this->presenter->detail($event),
        ]);
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
