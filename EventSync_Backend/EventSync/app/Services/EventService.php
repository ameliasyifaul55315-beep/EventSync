<?php

namespace App\Services;

use App\Exceptions\ApiException;
use App\Models\Event;

/** Aturan bisnis event yang dipakai Organizer maupun Admin (satu tempat, tidak diduplikasi). */
class EventService
{
    /** Event approved yang sudah punya pendaftar tidak boleh dihapus, harus dibatalkan. Soft delete. */
    public function delete(Event $event): void
    {
        if ($event->status === Event::APPROVED && $event->activeRegistrationsCount() > 0) {
            throw new ApiException('This event already has registrants. Cancel the event instead of deleting it.', 422);
        }

        $event->delete();
    }

    public function cancel(Event $event): void
    {
        if ($event->status !== Event::APPROVED) {
            throw new ApiException('Only approved events can be cancelled.', 422);
        }

        $event->status = Event::CANCELLED;
        $event->save();
    }

    /** Kapasitas baru tidak boleh lebih kecil dari jumlah pendaftar aktif (cegah event "over-booked"). */
    public function assertCapacityFits(Event $event, ?int $capacity): void
    {
        if ($capacity !== null && $capacity < $event->activeRegistrationsCount()) {
            throw new ApiException('Capacity cannot be lower than the number of active registrants ('.$event->activeRegistrationsCount().').', 422);
        }
    }
}
