<?php

namespace App\Http\Resources;

use App\Support\Dt;
use Illuminate\Http\Request;

/**
 * Bentuk objek event untuk frontend (sama dengan eventRes() di api.js).
 *
 * Field review (submitted_at, reviewed_*, review_note) hanya dikirim ke admin dan organizer pemilik event;
 * peserta/publik tidak perlu melihatnya.
 * Controller harus meng-eager-load: category, organizer; dan withRegisteredCount() untuk hindari N+1.
 */
class EventResource extends BaseResource
{
    public function toArray(Request $request): array
    {
        $e = $this->resource;
        $viewer = $request->attributes->get('viewer') ?? $request->user();
        $privileged = $viewer && ($viewer->isAdmin() || $viewer->id === $e->organizer_id);

        $count = $e->registered_count ?? $e->activeRegistrationsCount();
        $count = (int) $count;

        $data = [
            'id' => $e->id,
            'organizer_id' => $e->organizer_id,
            'category_id' => $e->category_id,
            'title' => $e->title,
            'slug' => $e->slug,
            'description' => $e->description,
            'location' => $e->location,
            'start_at' => Dt::iso($e->start_at),
            'end_at' => Dt::iso($e->end_at),
            'capacity' => $e->capacity,
            'poster_path' => $e->poster_path,
            'is_featured' => (bool) $e->is_featured,
            'status' => $e->status,
            'created_at' => Dt::iso($e->created_at),
            'category' => $e->relationLoaded('category') && $e->category ? CategoryResource::one($e->category, $request) : null,
            'organizer' => $e->relationLoaded('organizer') && $e->organizer ? [
                'id' => $e->organizer->id,
                'name' => $e->organizer->name,
                'organization_name' => $e->organizer->organization_name,
            ] : null,
            'lifecycle' => $e->lifecycle(),
            'registered_count' => $count,
            'seats_left' => $e->capacity === null ? null : max(0, $e->capacity - $count),
            'is_full' => $e->capacity !== null && $count >= $e->capacity,
            'my_registration' => null,
        ];

        if ($e->relationLoaded('myRegistration') && $e->myRegistration) {
            $r = $e->myRegistration;
            $data['my_registration'] = [
                'id' => $r->id,
                'status' => $r->status,
                'registered_at' => Dt::iso($r->registered_at),
            ];
        }

        if ($privileged) {
            $data['submitted_at'] = Dt::iso($e->submitted_at);
            $data['reviewed_by'] = $e->reviewed_by;
            $data['reviewed_at'] = Dt::iso($e->reviewed_at);
            $data['review_note'] = $e->review_note;
        }

        return $data;
    }
}
