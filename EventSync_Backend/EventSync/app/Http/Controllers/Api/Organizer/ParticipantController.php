<?php

namespace App\Http\Controllers\Api\Organizer;

use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\RegistrationResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Support\Api;
use App\Support\Sql;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Peserta event: organizer/participants.html. Organizer hanya melihat peserta event miliknya; admin boleh semua. */
class ParticipantController extends Controller
{
    use ResolvesEvents;

    /** GET /api/organizer/participants?event=&status=&q= (semua event milik organizer) */
    public function index(Request $request): JsonResponse
    {
        $query = EventRegistration::query()
            ->whereHas('event', fn ($e) => $e->where('organizer_id', $request->user()->id));

        return $this->respond($query, $request);
    }

    /** GET /api/events/{id}/participants */
    public function forEvent(Request $request, string $id): JsonResponse
    {
        $event = $this->manageableEvent($request, $id, allowLocked: true);

        return $this->respond(EventRegistration::query()->where('event_id', $event->id), $request);
    }

    private function respond($query, Request $request): JsonResponse
    {
        if ($request->filled('event')) {
            $query->where('event_id', (int) $request->query('event'));
        }

        if ($request->filled('status') && in_array($request->query('status'), [
            EventRegistration::REGISTERED, EventRegistration::CANCELLED, EventRegistration::ATTENDED,
        ], true)) {
            $query->where('status', $request->query('status'));
        }

        if (($q = trim((string) $request->query('q'))) !== '') {
            $like = Sql::contains($q);
            $query->whereHas('user', fn ($u) => $u->where('name', 'like', $like)->orWhere('email', 'like', $like));
        }

        $rows = $query->with(['user:id,name,email', 'event' => fn ($e) => $e->select('id', 'title')])
            ->orderByDesc('registered_at')
            ->get();

        return Api::ok('Participants retrieved successfully', RegistrationResource::list($rows, $request));
    }
}
