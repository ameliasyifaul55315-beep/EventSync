<?php

namespace App\Http\Controllers\Api\Admin;

use App\Exceptions\ApiException;
use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Event;
use App\Services\EventService;
use App\Support\Api;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Admin: kelola semua event + review (approve / reject).
 * Halaman: admin/events.html, admin/event-review.html, aksi di admin/dashboard.html.
 */
class EventController extends Controller
{
    use ResolvesEvents;

    public function __construct(private readonly EventService $events)
    {
    }

    public function index(Request $request): JsonResponse
    {
        $query = $this->eventQuery();

        if ($request->filled('status') && in_array($request->query('status'), Event::STATUSES, true)) {
            $query->where('status', $request->query('status'));
        }

        if ($request->filled('category')) {
            $query->where('category_id', (int) $request->query('category'));
        }

        if ($request->filled('organizer')) {
            $query->where('organizer_id', (int) $request->query('organizer'));
        }

        if (($q = trim((string) $request->query('q'))) !== '') {
            $query->where('title', 'like', Sql::contains($q));
        }

        $events = $query->orderByRaw('COALESCE(submitted_at, created_at) DESC')->orderByDesc('id')->get();

        return Api::ok('Events retrieved successfully', EventResource::list($events, $request));
    }

    /** Admin hanya mengubah field "pengelolaan" (judul, kategori, lokasi, kapasitas, featured), bukan isi/jadwal organizer. */
    public function update(Request $request, string $id): JsonResponse
    {
        $event = Event::query()->find($id) ?? throw new ApiException('Event not found.', 404);

        $data = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'category_id' => ['required', 'integer', 'exists:categories,id'],
            'location' => ['required', 'string', 'max:200'],
            'capacity' => ['nullable', 'integer', 'min:1', 'max:1000000'],
        ], ['category_id.exists' => 'Choose a valid category.']);

        $this->events->assertCapacityFits($event, $data['capacity'] ?? null);
        $titleChanged = $event->title !== $data['title'];

        $event->title = trim($data['title']);
        $event->category_id = (int) $data['category_id'];
        $event->location = trim($data['location']);
        $event->capacity = $data['capacity'] ?? null;
        $event->is_featured = $request->boolean('is_featured');

        if ($titleChanged) {
            $event->slug = Event::uniqueSlug($event->title, $event->id);
        }

        $event->save();

        return Api::ok('Event updated.', EventResource::one($this->eventQuery()->findOrFail($event->id), $request));
    }

    public function destroy(string $id): JsonResponse
    {
        $event = Event::query()->find($id) ?? throw new ApiException('Event not found.', 404);
        $this->events->delete($event);

        return Api::ok('Event deleted.');
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['review_note' => ['nullable', 'string', 'max:1000']]);

        $event = $this->review($request, $id, Event::APPROVED, $data['review_note'] ?? null);

        return Api::ok('Event approved and published.', EventResource::one($event, $request));
    }

    /** Menolak WAJIB disertai alasan (min. 5 karakter) agar organizer tahu apa yang harus diperbaiki. */
    public function reject(Request $request, string $id): JsonResponse
    {
        $data = $request->validate(['review_note' => ['required', 'string', 'min:5', 'max:1000']]);

        $event = $this->review($request, $id, Event::REJECTED, $data['review_note']);

        return Api::ok('Event rejected.', EventResource::one($event, $request));
    }

    private function review(Request $request, string $id, string $status, ?string $note): Event
    {
        $event = Event::query()->find($id) ?? throw new ApiException('Event not found.', 404);

        if ($event->status !== Event::PENDING) {
            throw new ApiException('Only events with status pending_review can be reviewed.', 422);
        }

        $event->status = $status;
        $event->reviewed_by = $request->user()->id;
        $event->reviewed_at = now();
        $event->review_note = $note;
        $event->save();

        return $this->eventQuery()->findOrFail($event->id);
    }
}
