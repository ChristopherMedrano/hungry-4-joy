<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ServerAnalyticsEvent;
use App\Support\Dashboard\DashboardServerAnalyticsPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardServerAnalyticsController extends Controller
{
    public function __construct(private readonly DashboardServerAnalyticsPresenter $presenter) {}

    public function index(Request $request): JsonResponse
    {
        $filters = $this->validatedFilters($request);
        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);
        $sort = $this->sortColumn((string) $request->string('sort', '-created_at'));

        $query = ServerAnalyticsEvent::query()
            ->with('checkoutEvent')
            ->when($filters['event'], fn (Builder $query, string $value) => $query->where('event', $value))
            ->when(
                $filters['donation_attempt_id'],
                fn (Builder $query, string $value) => $query->where('donation_attempt_id', $value)
            )
            ->when(
                $filters['checkout_event_row_id'],
                fn (Builder $query, string $value) => $query->where('checkout_event_id', $value)
            )
            ->when($filters['search'], function (Builder $query, string $value): void {
                $like = '%'.$value.'%';
                $query->where(function (Builder $inner) use ($like): void {
                    $inner->where('analytics_event_id', 'like', $like)
                        ->orWhere('donation_attempt_id', 'like', $like)
                        ->orWhere('event', 'like', $like)
                        ->orWhereHas('checkoutEvent', fn (Builder $checkout) => $checkout
                            ->where('event_id', 'like', $like));
                });
            });

        $paginator = $query
            ->orderBy($sort['column'], $sort['direction'])
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn (ServerAnalyticsEvent $record) => $this->presenter->summary($record))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => $filters + [
                'sort' => (string) $request->string('sort', '-created_at'),
            ],
        ]);
    }

    public function show(int $serverAnalyticsEvent): JsonResponse
    {
        $record = ServerAnalyticsEvent::query()
            ->with('checkoutEvent')
            ->findOrFail($serverAnalyticsEvent);

        return response()->json([
            'data' => $this->presenter->detail($record),
        ]);
    }

    public function showByAttempt(string $donationAttemptId): JsonResponse
    {
        $records = ServerAnalyticsEvent::query()
            ->with('checkoutEvent')
            ->where('donation_attempt_id', $donationAttemptId)
            ->orderByDesc('created_at')
            ->get();

        return response()->json([
            'data' => $records
                ->map(fn (ServerAnalyticsEvent $record) => $this->presenter->detail($record))
                ->values(),
        ]);
    }

    /**
     * @return array<string, string|null>
     */
    private function validatedFilters(Request $request): array
    {
        return [
            'event' => $request->string('event')->toString() ?: null,
            'donation_attempt_id' => $request->string('donation_attempt_id')->toString() ?: null,
            'checkout_event_row_id' => $request->string('checkout_event_row_id')->toString() ?: null,
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
            'created_at',
            'event',
            'donation_attempt_id',
        ];

        if (! in_array($column, $allowed, true)) {
            $column = 'created_at';
            $direction = 'desc';
        }

        return ['column' => $column, 'direction' => $direction];
    }
}
