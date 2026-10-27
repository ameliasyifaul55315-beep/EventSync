<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventRegistrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_sees_only_approved_events(): void
    {
        $approved = Event::factory()->approved()->create();
        Event::factory()->create();            // draft
        Event::factory()->pending()->create();

        $res = $this->getJson('/api/events')->assertOk()->assertJsonPath('meta.total', 1);

        $this->assertSame($approved->id, $res->json('data.0.id'));
        // Waktu "naif" tanpa zona, persis seperti yang diharapkan frontend.
        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/', $res->json('data.0.start_at'));
        $this->assertSame('upcoming', $res->json('data.0.lifecycle'));
        $this->assertArrayNotHasKey('review_note', $res->json('data.0'));
    }

    public function test_event_detail_by_id_and_slug_and_hidden_when_not_published(): void
    {
        $event = Event::factory()->approved()->create();
        $draft = Event::factory()->create();

        $this->getJson("/api/events/{$event->id}")->assertOk()->assertJsonPath('data.title', $event->title)
            ->assertJsonStructure(['data' => ['schedules', 'speakers', 'committees']]);
        $this->getJson("/api/events/{$event->slug}")->assertOk()->assertJsonPath('data.id', $event->id);
        $this->getJson("/api/events/{$draft->id}")->assertStatus(404)->assertJsonPath('success', false);
    }

    public function test_search_and_lifecycle_filters(): void
    {
        Event::factory()->approved()->create(['title' => 'Technology Conference']);
        Event::factory()->approved()->completed()->create(['title' => 'Old Workshop']);

        $this->getJson('/api/events?q=Conference')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/events?lifecycle=completed')->assertJsonPath('meta.total', 1)
            ->assertJsonPath('data.0.title', 'Old Workshop');
    }

    public function test_user_can_register_for_event(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->approved()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/events/{$event->id}/register")
            ->assertCreated()
            ->assertJsonPath('data.my_registration.status', 'registered')
            ->assertJsonPath('data.registered_count', 1);

        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id, 'user_id' => $user->id, 'status' => 'registered']);
    }

    public function test_duplicate_registration_is_rejected(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->approved()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        $this->postJson("/api/events/{$event->id}/register")
            ->assertStatus(422)
            ->assertJson(['success' => false, 'message' => 'You are already registered for this event.']);

        $this->assertSame(1, EventRegistration::count());
    }

    public function test_cancel_then_register_again_reuses_the_same_row(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->approved()->create();
        Sanctum::actingAs($user);

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        $this->deleteJson("/api/events/{$event->id}/register")->assertOk();
        $this->assertDatabaseHas('event_registrations', ['event_id' => $event->id, 'status' => 'cancelled']);

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
        $this->assertSame(1, EventRegistration::count());
        $this->assertSame('registered', EventRegistration::first()->status);
        $this->assertNull(EventRegistration::first()->cancelled_at);
    }

    public function test_cannot_cancel_without_active_registration(): void
    {
        $event = Event::factory()->approved()->create();
        Sanctum::actingAs(User::factory()->create());

        $this->deleteJson("/api/events/{$event->id}/register")->assertStatus(404);
    }

    public function test_cannot_register_for_started_full_or_unpublished_event(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $ongoing = Event::factory()->approved()->ongoing()->create();
        $this->postJson("/api/events/{$ongoing->id}/register")->assertStatus(422);

        $full = Event::factory()->approved()->create(['capacity' => 1]);
        EventRegistration::create(['event_id' => $full->id, 'user_id' => User::factory()->create()->id, 'status' => 'registered', 'registered_at' => now()]);
        $this->postJson("/api/events/{$full->id}/register")->assertStatus(422)->assertJsonPath('message', 'Sorry, this event is full.');

        $pending = Event::factory()->pending()->create();
        $this->postJson("/api/events/{$pending->id}/register")->assertStatus(404);
    }

    public function test_cancelled_registration_frees_a_seat(): void
    {
        $event = Event::factory()->approved()->create(['capacity' => 1]);
        EventRegistration::create(['event_id' => $event->id, 'user_id' => User::factory()->create()->id, 'status' => 'cancelled', 'registered_at' => now(), 'cancelled_at' => now()]);
        Sanctum::actingAs(User::factory()->create());

        $this->postJson("/api/events/{$event->id}/register")->assertCreated();
    }

    public function test_only_participants_can_register(): void
    {
        $event = Event::factory()->approved()->create();

        $this->postJson("/api/events/{$event->id}/register")->assertStatus(401);

        Sanctum::actingAs(User::factory()->organizer()->create());
        $this->postJson("/api/events/{$event->id}/register")->assertStatus(403);
    }

    public function test_my_events_lists_only_own_registrations(): void
    {
        $me = User::factory()->create();
        $other = User::factory()->create();
        $mine = Event::factory()->approved()->create();
        $theirs = Event::factory()->approved()->create();
        EventRegistration::create(['event_id' => $mine->id, 'user_id' => $me->id, 'status' => 'registered', 'registered_at' => now()]);
        EventRegistration::create(['event_id' => $theirs->id, 'user_id' => $other->id, 'status' => 'registered', 'registered_at' => now()]);
        Sanctum::actingAs($me);

        $res = $this->getJson('/api/my-events')->assertOk();

        $this->assertCount(1, $res->json('data'));
        $this->assertSame($mine->id, $res->json('data.0.event.id'));
        $this->assertSame('registered', $res->json('data.0.status'));
    }

    public function test_logged_in_user_sees_my_registration_on_event_list(): void
    {
        $user = User::factory()->create();
        $event = Event::factory()->approved()->create();
        EventRegistration::create(['event_id' => $event->id, 'user_id' => $user->id, 'status' => 'registered', 'registered_at' => now()]);
        Sanctum::actingAs($user);

        $this->getJson('/api/events')->assertJsonPath('data.0.my_registration.status', 'registered');
    }
}
