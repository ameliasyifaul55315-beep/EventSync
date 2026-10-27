<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Exceptions\ApiException;
use App\Http\Resources\CommitteeResource;
use App\Http\Resources\EventResource;
use App\Http\Resources\ScheduleResource;
use App\Http\Resources\SpeakerResource;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** Cara standar mencari event + memeriksa hak akses, dipakai banyak controller. */
trait ResolvesEvents
{
    /** Query dasar event untuk response: relasi ringan + jumlah pendaftar aktif. */
    protected function eventQuery()
    {
        return Event::query()
            ->with(['category', 'organizer:id,name,organization_name'])
            ->withRegisteredCount();
    }

    /** Cari event berdasarkan id angka ATAU slug. */
    protected function findEvent(string $key, bool $detail = false): ?Event
    {
        $query = $this->eventQuery()->where(function ($w) use ($key) {
            if (ctype_digit($key)) {
                $w->where('id', (int) $key)->orWhere('slug', $key);
            } else {
                $w->where('slug', $key);
            }
        });

        if ($detail) {
            $query->with(['schedules.speaker', 'speakers', 'committees']);
        }

        return $query->first();
    }

    /** Event yang boleh dikelola user ini, atau lempar 404/403/409. */
    protected function manageableEvent(Request $request, string $id, bool $allowLocked = false): Event
    {
        $user = $request->user();
        $event = Event::query()->find($id);

        if (! $event) {
            throw new ApiException('Event not found.', 404);
        }

        // Policy: admin = semua, organizer = hanya miliknya, lainnya ditolak (403).
        Gate::forUser($user)->authorize('manage', $event);

        // Event yang sedang direview terkunci untuk organizer (admin tetap boleh moderasi).
        if (! $allowLocked && $user->isOrganizer() && $event->status === Event::PENDING) {
            throw new ApiException('This event is locked while it is being reviewed by an admin.', 409);
        }

        return $event;
    }

    /** Apakah event ini boleh dilihat viewer? Publik hanya melihat event approved. */
    protected function canSee(Event $event, ?User $viewer): bool
    {
        if ($event->status === Event::APPROVED) {
            return true;
        }

        return $viewer && ($viewer->isAdmin() || ($viewer->isOrganizer() && $event->organizer_id === $viewer->id));
    }

    /** Tempelkan my_registration (status pendaftaran viewer) ke tiap event tanpa N+1 query. */
    protected function attachMyRegistration(iterable $events, ?User $viewer): void
    {
        if (! $viewer) {
            return;
        }

        $events = collect($events);

        if ($events->isEmpty()) {
            return;
        }

        $mine = EventRegistration::query()
            ->where('user_id', $viewer->id)
            ->whereIn('event_id', $events->pluck('id'))
            ->get()
            ->keyBy('event_id');

        foreach ($events as $event) {
            $event->setRelation('myRegistration', $mine->get($event->id));
        }
    }

    /** Event + schedules + speakers + committees (untuk halaman detail). */
    protected function eventDetail(Event $event, Request $request, ?User $viewer): array
    {
        $privileged = $viewer && ($viewer->isAdmin() || $viewer->id === $event->organizer_id);

        $data = EventResource::one($event, $request);
        $data['schedules'] = ScheduleResource::list($event->schedules, $request);
        $data['speakers'] = SpeakerResource::list($event->speakers, $request);
        $data['committees'] = array_map(function (array $c) use ($privileged) {
            if (! $privileged) {
                unset($c['contact']);   // kontak panitia hanya untuk organizer pemilik & admin
            }

            return $c;
        }, CommitteeResource::list($event->committees, $request));

        return $data;
    }
}
