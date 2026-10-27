<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Exceptions\ApiException;
use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Requests\EventRequest;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\EventService;
use App\Services\ImageStorage;
use App\Support\Api;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;

/**
 * CRUD event milik organizer.  Dipakai: organizer/dashboard, events, create-event (create + edit ?id=).
 * Aturan keamanan: organizer HANYA bisa melihat/ubah/hapus event miliknya — dicek di server
 * (query difilter organizer_id + EventPolicy), bukan hanya dengan menyembunyikan tombol di frontend.
 */
class EventController extends Controller
{
    use ResolvesEvents;

    public function __construct(private readonly ImageStorage $images, private readonly EventService $events)
    {
    }

    public function dashboard(Request $request): JsonResponse
    {
        $user = $request->user();
        $events = $this->eventQuery()->where('organizer_id', $user->id)->orderByDesc('start_at')->get();

        $stats = [
            'total_events' => $events->count(),
            'published_events' => $events->where('status', Event::APPROVED)->count(),
            'pending_events' => $events->where('status', Event::PENDING)->count(),
            'draft_events' => $events->whereIn('status', [Event::DRAFT, Event::REJECTED])->count(),
            'total_participants' => (int) $events->sum('registered_count'),
        ];

        return Api::ok('Dashboard retrieved successfully', [
            'stats' => $stats,
            'events' => EventResource::list($events, $request),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->eventQuery()->where('organizer_id', $request->user()->id);

        if ($request->filled('status') && in_array($request->query('status'), Event::STATUSES, true)) {
            $query->where('status', $request->query('status'));
        }

        if (($q = trim((string) $request->query('q'))) !== '') {
            $query->where('title', 'like', Sql::contains($q));
        }

        $events = $query->orderByDesc('start_at')->get();

        return Api::ok('Events retrieved successfully', EventResource::list($events, $request));
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $this->manageableEvent($request, $id, allowLocked: true);
        $event = $this->findEvent($id, detail: true);

        return Api::ok('Event retrieved successfully', $this->eventDetail($event, $request, $request->user()));
    }

    public function store(EventRequest $request): JsonResponse
    {
        $data = $request->validated();

        $poster = $this->images->resolve($data['poster_path'] ?? null, 'posters', 'poster_path', 2 * 1024 * 1024);

        $event = new Event(Arr::except($data, ['poster_path']));
        $event->poster_path = $poster ?? Event::DEFAULT_POSTER;
        $event->organizer_id = $request->user()->id;      // dari token, BUKAN dari request
        $event->slug = Event::uniqueSlug($event->title);
        $event->status = Event::DRAFT;                    // event baru selalu draft
        $event->is_featured = false;
        $event->save();

        return Api::created('Event saved as draft.', EventResource::one($this->reload($event), $request));
    }

    public function update(EventRequest $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);

        if ($event->status === Event::CANCELLED) {
            throw new ApiException('A cancelled event can no longer be edited.', 409);
        }

        $data = $request->validated();
        $this->events->assertCapacityFits($event, $data['capacity'] ?? null);
        $poster = $this->images->resolve($data['poster_path'] ?? null, 'posters', 'poster_path', 2 * 1024 * 1024);

        $titleChanged = $event->title !== $data['title'];
        $event->fill(Arr::except($data, ['poster_path']));

        if ($poster !== null && $poster !== $event->poster_path) {
            $this->images->deleteIfUploaded($event->poster_path);
            $event->poster_path = $poster;
        }

        if ($titleChanged) {
            $event->slug = Event::uniqueSlug($event->title, $event->id);
        }

        // Event yang ditolak lalu diedit kembali menjadi draft (siap diajukan ulang).
        if ($event->status === Event::REJECTED) {
            $event->status = Event::DRAFT;
        }

        $event->save();

        return Api::ok('Event updated.', EventResource::one($this->reload($event), $request));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);
        $this->events->delete($event);

        return Api::ok('Event deleted.');
    }

    /** Draft / rejected -> pending_review. Setelah itu event terkunci sampai admin memutuskan. */
    public function submit(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);

        if (! in_array($event->status, [Event::DRAFT, Event::REJECTED], true)) {
            throw new ApiException('Only draft or rejected events can be submitted.', 422);
        }

        $event->status = Event::PENDING;
        $event->submitted_at = now();
        $event->reviewed_by = null;
        $event->reviewed_at = null;
        $event->review_note = null;
        $event->save();

        return Api::ok('Event submitted for review.', EventResource::one($this->reload($event), $request));
    }

    /** POST /api/events/{id}/cancel — organizer pemilik atau admin. */
    public function cancel(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id);
        $this->events->cancel($event);

        return Api::ok('Event cancelled.', EventResource::one($this->reload($event), $request));
    }

    private function reload(Event $event): Event
    {
        return $this->eventQuery()->findOrFail($event->id);
    }
}
