<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Support\Api;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Event publik: GET /api/events dan GET /api/events/{id|slug}.
 * Dipakai: index.html (Home), events.html (list + filter), event-detail.html.
 * Hanya event berstatus "approved" yang tampil ke publik.
 */
class EventController extends Controller
{
    use ResolvesEvents;

    public function index(Request $request): JsonResponse
    {
        $viewer = $this->viewer($request);
        $now = now()->toDateTimeString();

        $query = $this->eventQuery()->published();

        if (($search = trim((string) $request->query('q'))) !== '') {
            $like = Sql::contains($search);
            $query->where(function ($w) use ($like) {
                $w->where('title', 'like', $like)
                    ->orWhere('location', 'like', $like)
                    ->orWhere('description', 'like', $like)
                    ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $like))
                    ->orWhereHas('organizer', fn ($o) => $o->where('name', 'like', $like));
            });
        }

        if (($category = (string) $request->query('category')) !== '') {
            $query->whereHas('category', fn ($c) => $c->where('slug', $category)
                ->orWhere('id', ctype_digit($category) ? (int) $category : 0));
        }

        $date = (string) $request->query('date');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $query->whereDate('start_at', '<=', $date)->whereDate('end_at', '>=', $date);
        }

        match ((string) $request->query('lifecycle')) {
            'upcoming' => $query->where('start_at', '>', $now),
            'ongoing' => $query->where('start_at', '<=', $now)->where('end_at', '>=', $now),
            'completed' => $query->where('end_at', '<', $now),
            default => null,
        };

        if ($request->boolean('featured')) {
            $query->where('is_featured', true);
        }

        match ((string) $request->query('sort')) {
            'newest' => $query->orderByDesc('start_at'),
            'title' => $query->orderBy('title'),
            // "soonest": sedang berlangsung -> akan datang (terdekat dulu) -> selesai (terbaru dulu)
            default => $query
                ->orderByRaw('CASE WHEN end_at < ? THEN 2 WHEN start_at <= ? THEN 0 ELSE 1 END', [$now, $now])
                ->orderByRaw('CASE WHEN end_at < ? THEN start_at END DESC', [$now])
                ->orderByRaw('CASE WHEN end_at >= ? THEN start_at END ASC', [$now]),
        };
        $query->orderBy('id');

        $total = $query->toBase()->getCountForPagination();

        if ($request->filled('limit')) {
            $events = $query->limit(max(1, min(100, (int) $request->query('limit'))))->get();
            $meta = ['total' => $total];
        } else {
            $per = max(1, min(50, (int) $request->query('per_page', 9)));
            $last = max(1, (int) ceil($total / $per));
            $page = min(max(1, (int) $request->query('page', 1)), $last);
            $events = $query->forPage($page, $per)->get();
            $meta = ['page' => $page, 'per_page' => $per, 'total' => $total, 'last_page' => $last];
        }

        $this->attachMyRegistration($events, $viewer);

        return Api::ok('Events retrieved successfully', EventResource::list($events, $request), ['meta' => $meta]);
    }

    public function show(Request $request, string $key): JsonResponse
    {
        $viewer = $this->viewer($request);
        $event = $this->findEvent($key, detail: true);

        if (! $event || ! $this->canSee($event, $viewer)) {
            throw new ApiException('Event not found.', 404);
        }

        $this->attachMyRegistration([$event], $viewer);

        return Api::ok('Event retrieved successfully', $this->eventDetail($event, $request, $viewer));
    }
}
