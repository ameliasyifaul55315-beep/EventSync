<?php

namespace App\Policies;

use App\Models\Event;
use App\Models\User;
use Illuminate\Auth\Access\Response;

/**
 * Siapa yang boleh mengelola sebuah event?
 *   - admin: semua event (moderasi)
 *   - organizer: HANYA event miliknya (organizer_id = id dia)
 *   - user biasa: tidak pernah
 * Dipanggil lewat Gate::forUser($user)->authorize('manage', $event).
 */
class EventPolicy
{
    public function manage(User $user, Event $event): Response
    {
        if ($user->isAdmin()) {
            return Response::allow();
        }

        if ($user->isOrganizer()) {
            return $event->organizer_id === $user->id
                ? Response::allow()
                : Response::deny('This event belongs to another organizer.');
        }

        return Response::deny('You are not allowed to do this.');
    }
}
