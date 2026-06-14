<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CheckoutHandoff;
use App\Support\Dashboard\DashboardHandoffPresenter;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardHandoffController extends Controller
{
    public function __construct(private readonly DashboardHandoffPresenter $presenter) {}

    public function index(Request $request): JsonResponse
    {
        $search = $request->string('search')->toString() ?: null;
        $perPage = min(max((int) $request->integer('per_page', 25), 1), 100);
        $sort = $this->sortColumn((string) $request->string('sort', '-handoff_at'));

        $query = CheckoutHandoff::query()
            ->whereNull('checkout_event_id')
            ->when($search, function (Builder $query, string $value): void {
                $like = '%'.$value.'%';
                $query->where(function (Builder $inner) use ($like): void {
                    $inner->where('donation_attempt_id', 'like', $like)
                        ->orWhere('campaign_name', 'like', $like)
                        ->orWhere('campaign_id', 'like', $like)
                        ->orWhere('reconciliation_note', 'like', $like);
                });
            });

        $paginator = $query
            ->orderBy($sort['column'], $sort['direction'])
            ->paginate($perPage);

        return response()->json([
            'data' => $paginator->getCollection()
                ->map(fn (CheckoutHandoff $handoff) => $this->presenter->listItem($handoff))
                ->values(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ],
            'filters' => [
                'search' => $search,
                'sort' => (string) $request->string('sort', '-handoff_at'),
            ],
        ]);
    }

    /**
     * @return array{column: string, direction: 'asc'|'desc'}
     */
    private function sortColumn(string $sort): array
    {
        $direction = str_starts_with($sort, '-') ? 'desc' : 'asc';
        $column = ltrim($sort, '-');

        $allowed = [
            'handoff_at',
            'created_at',
            'donation_amount',
            'reconcile_attempts',
        ];

        if (! in_array($column, $allowed, true)) {
            $column = 'handoff_at';
            $direction = 'desc';
        }

        return ['column' => $column, 'direction' => $direction];
    }
}
