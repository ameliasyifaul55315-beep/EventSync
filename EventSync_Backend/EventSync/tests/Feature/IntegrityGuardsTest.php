<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Test untuk guard integritas yang ditambahkan pada revisi audit. */
class IntegrityGuardsTest extends TestCase
{
    use RefreshDatabase;

    public function test_capacity_cannot_be_lowered_below_active_registrants(): void
    {
        $organizer = User::factory()->organizer()->create();
        $event = Event::factory()->approved()->create(['organizer_id' => $organizer->id, 'capacity' => 10]);
        foreach (User::factory()->count(3)->create() as $u) {
            EventRegistration::create(['event_id' => $event->id, 'user_id' => $u->id, 'status' => 'registered', 'registered_at' => now()]);
        }
        Sanctum::actingAs($organizer);

        $payload = [
            'title' => $event->title,
            'category_id' => $event->category_id,
            'description' => 'A description that is longer than twenty characters.',
            'location' => $event->location,
            'start_at' => $event->start_at->format('Y-m-d\TH:i:s'),
            'end_at' => $event->end_at->format('Y-m-d\TH:i:s'),
        ];

        $this->putJson("/api/organizer/events/{$event->id}", $payload + ['capacity' => 2])->assertStatus(422);
        $this->putJson("/api/organizer/events/{$event->id}", $payload + ['capacity' => 3])->assertOk();
    }

    public function test_organizer_with_events_cannot_be_demoted(): void
    {
        $admin = User::factory()->admin()->create();
        $organizer = User::factory()->organizer()->create();
        Event::factory()->create(['organizer_id' => $organizer->id]);
        Sanctum::actingAs($admin);

        $this->putJson("/api/admin/users/{$organizer->id}", [
            'name' => $organizer->name,
            'email' => $organizer->email,
            'role' => 'user',
        ])->assertStatus(422);

        $this->assertSame('organizer', $organizer->fresh()->role);
    }
}
