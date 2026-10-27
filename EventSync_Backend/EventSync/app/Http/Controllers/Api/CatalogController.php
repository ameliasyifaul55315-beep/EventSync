<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ScheduleResource;
use App\Http\Resources\SpeakerResource;
use App\Models\Event;
use App\Models\Schedule;
use App\Models\Speaker;
use App\Support\Api;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Daftar publik lintas event: GET /api/schedules (schedule.html) dan GET /api/speakers (speakers.html, Home).
 * Hanya milik event approved.
 */
class CatalogController extends Controller
{
    public function schedules(Request $request): JsonResponse
    {
        $query = Schedule::query()
            ->with(['speaker', 'event.category'])
            ->whereHas('event', fn ($e) => $e->where('status', Event::APPROVED));

        if ($request->filled('event')) {
            $query->where('event_id', (int) $request->query('event'));
        }

        if ($request->filled('category')) {
            $slug = (string) $request->query('category');
            $query->whereHas('event.category', fn ($c) => $c->where('slug', $slug));
        }

        $date = (string) $request->query('date');
        if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $query->whereDate('start_at', $date);
        }

        $rows = $query->orderBy('start_at')->orderBy('sort_order')->get()->map(function (Schedule $s) use ($request) {
            $row = ScheduleResource::one($s, $request);
            $row['event'] = [
                'id' => $s->event->id,
                'title' => $s->event->title,
                'slug' => $s->event->slug,
                'category' => $s->event->category ? [
                    'id' => $s->event->category->id,
                    'name' => $s->event->category->name,
                    'slug' => $s->event->category->slug,
                    'color' => $s->event->category->color,
                ] : null,
                'lifecycle' => $s->event->lifecycle(),
            ];

            return $row;
        })->all();

        return Api::ok('Schedules retrieved successfully', $rows);
    }

    public function speakers(Request $request): JsonResponse
    {
        $query = Speaker::query()
            ->with('event:id,title,slug,status')
            ->whereHas('event', fn ($e) => $e->where('status', Event::APPROVED));

        if ($request->filled('event')) {
            $query->where('event_id', (int) $request->query('event'));
        }

        $rows = $query->orderBy('id')->get()->map(function (Speaker $s) use ($request) {
            $row = SpeakerResource::one($s, $request);
            $row['event'] = ['id' => $s->event->id, 'title' => $s->event->title, 'slug' => $s->event->slug];

            return $row;
        })->all();

        return Api::ok('Speakers retrieved successfully', $rows);
    }
}
