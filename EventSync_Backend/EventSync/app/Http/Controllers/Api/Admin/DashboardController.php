<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\Concerns\ResolvesEvents;
use App\Http\Controllers\Controller;
use App\Http\Resources\EventResource;
use App\Models\Category;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use App\Support\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** admin/dashboard.html: 5 statistik, antrean review, event per status, pendaftaran per kategori. */
class DashboardController extends Controller
{
    use ResolvesEvents;

    public function index(Request $request): JsonResponse
    {
        $byStatus = Event::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        $registrationsByCategory = DB::table('event_registrations as r')
            ->join('events as e', 'e.id', '=', 'r.event_id')
            ->whereNull('e.deleted_at')
            ->where('r.status', '!=', EventRegistration::CANCELLED)
            ->groupBy('e.category_id')
            ->selectRaw('e.category_id, count(*) as total')
            ->pluck('total', 'category_id');

        $pending = $this->eventQuery()->where('status', Event::PENDING)->orderBy('submitted_at')->get();

        return Api::ok('Dashboard retrieved successfully', [
            'stats' => [
                'total_users' => User::query()->count(),
                'total_organizers' => User::query()->where('role', User::ROLE_ORGANIZER)->count(),
                'total_events' => Event::query()->count(),
                'pending_events' => (int) ($byStatus[Event::PENDING] ?? 0),
                'total_registrations' => EventRegistration::query()->where('status', '!=', EventRegistration::CANCELLED)->count(),
            ],
            'pending' => EventResource::list($pending, $request),
            'by_status' => collect(Event::STATUSES)->map(fn ($s) => [
                'status' => $s,
                'count' => (int) ($byStatus[$s] ?? 0),
            ])->all(),
            'by_category' => Category::query()->orderBy('id')->get()->map(fn (Category $c) => [
                'name' => $c->name,
                'color' => $c->color,
                'registrations' => (int) ($registrationsByCategory[$c->id] ?? 0),
            ])->all(),
        ]);
    }
}
