<?php

namespace App\Http\Controllers\Api;

use App\Exceptions\ApiException;
use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Http\Resources\RegistrationResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Support\Api;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Fitur peserta (role user):
 *   POST   /api/events/{id}/register   -> tombol "Register for Event"
 *   DELETE /api/events/{id}/register   -> tombol "Cancel Registration"
 *   GET    /api/my-events              -> halaman My Events & Dashboard peserta
 * Tabel: event_registrations (penghubung users <-> events).
 */
class RegistrationController extends Controller
{
    use ResolvesEvents;

    public function store(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $event = Event::query()->published()->find($id);

        if (! $event) {
            throw new ApiException('Event not found.', 404);
        }

        if ($event->hasStarted()) {
            throw new ApiException('Registration is closed because this event has already started.', 422);
        }

        try {
            DB::transaction(function () use ($event, $user) {
                // Kunci baris event agar dua pendaftaran bersamaan tidak sama-sama lolos saat kursi tinggal satu.
                $locked = Event::query()->whereKey($event->id)->lockForUpdate()->first();

                // Cek ulang SETELAH kunci didapat: status/waktu event bisa berubah (dibatalkan, dihapus,
                // sudah mulai) di antara pengecekan awal di atas dan saat transaksi ini berjalan.
                if (! $locked || $locked->status !== Event::APPROVED) {
                    throw new ApiException('Event not found.', 404);
                }
                if ($locked->hasStarted()) {
                    throw new ApiException('Registration is closed because this event has already started.', 422);
                }

                $existing = EventRegistration::query()
                    ->where('event_id', $event->id)
                    ->where('user_id', $user->id)
                    ->lockForUpdate()
                    ->first();

                if ($existing && $existing->status !== EventRegistration::CANCELLED) {
                    throw new ApiException('You are already registered for this event.', 422);
                }

                if ($locked->capacity !== null && $locked->activeRegistrationsCount() >= $locked->capacity) {
                    throw new ApiException('Sorry, this event is full.', 422);
                }

                if ($existing) {
                    // Daftar ulang setelah batal = memakai baris yang sama (UNIQUE event_id,user_id).
                    $existing->status = EventRegistration::REGISTERED;
                    $existing->registered_at = now();
                    $existing->cancelled_at = null;
                    $existing->save();
                } else {
                    $registration = new EventRegistration([
                        'event_id' => $event->id,
                        'user_id' => $user->id,
                        'status' => EventRegistration::REGISTERED,
                        'registered_at' => now(),
                    ]);
                    $registration->save();
                }
            });
        } catch (UniqueConstraintViolationException) {
            // Balapan: request lain sudah menyimpan baris yang sama. Constraint DB menjaga data tetap benar.
            throw new ApiException('You are already registered for this event.', 422);
        }

        return Api::created('You are registered for this event.', $this->freshEvent($request, $event->id));
    }

    public function destroy(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $event = Event::query()->find($id);

        $registration = $event ? EventRegistration::query()
            ->where('event_id', $event->id)
            ->where('user_id', $user->id)
            ->where('status', EventRegistration::REGISTERED)
            ->first() : null;

        if (! $registration) {
            throw new ApiException('No active registration found.', 404);
        }

        if ($event->hasStarted()) {
            throw new ApiException('You can only cancel before the event starts.', 422);
        }

        // Baris tidak dihapus: status jadi "cancelled" agar riwayat tetap ada.
        $registration->status = EventRegistration::CANCELLED;
        $registration->cancelled_at = now();
        $registration->save();

        return Api::ok('Registration cancelled.', $this->freshEvent($request, $event->id));
    }

    public function myEvents(Request $request): JsonResponse
    {
        $user = $request->user();

        $registrations = EventRegistration::query()
            ->where('user_id', $user->id)
            ->whereHas('event')   // event yang sudah di-soft-delete tidak ikut
            ->with(['event' => fn ($q) => $q->with(['category', 'organizer:id,name,organization_name'])->withRegisteredCount()])
            ->get()
            ->sortByDesc(fn ($r) => $r->event->start_at)
            ->values();

        $this->attachMyRegistration($registrations->pluck('event'), $user);

        $rows = $registrations->map(function (EventRegistration $r) use ($request) {
            $row = RegistrationResource::one($r, $request);
            $row['event'] = EventResource::one($r->event, $request);

            return $row;
        })->all();

        return Api::ok('My events retrieved successfully', $rows);
    }

    private function freshEvent(Request $request, int $eventId): array
    {
        $event = $this->eventQuery()->findOrFail($eventId);
        $this->attachMyRegistration([$event], $request->user());

        return EventResource::one($event, $request);
    }
}
