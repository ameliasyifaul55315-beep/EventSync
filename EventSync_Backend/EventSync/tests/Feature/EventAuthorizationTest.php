<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Event;
use App\Models\EventRegistration;
use App\Models\Schedule;
use App\Models\Speaker;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EventAuthorizationTest extends TestCase
{
    use RefreshDatabase;

    private const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

    private function eventPayload(Category $category, array $override = []): array
    {
        return array_merge([
            'title' => 'Technology Conference 2026',
            'category_id' => $category->id,
            'description' => 'A full day of talks and workshops about technology.',
            'location' => 'Grand Hall, Jakarta',
            'start_at' => now()->addDays(20)->format('Y-m-d\T09:00:00'),
            'end_at' => now()->addDays(20)->format('Y-m-d\T17:00:00'),
            'capacity' => 200,
        ], $override);
    }

    public function test_organizer_creates_event_as_draft_owned_by_self(): void
    {
        $org = User::factory()->organizer()->create();
        $other = User::factory()->organizer()->create();
        $cat = Category::factory()->create();
        Sanctum::actingAs($org);

        $res = $this->postJson('/api/organizer/events', $this->eventPayload($cat, [
            'organizer_id' => $other->id, 'status' => 'approved', 'is_featured' => true,
        ]))->assertCreated()->assertJsonPath('data.status', 'draft');

        $event = Event::findOrFail($res->json('data.id'));
        $this->assertSame($org->id, $event->organizer_id);
        $this->assertSame('draft', $event->status);
        $this->assertFalse($event->is_featured);
        $this->assertSame('technology-conference-2026', $event->slug);
    }

    public function test_event_validation_errors_are_returned_per_field(): void
    {
        Sanctum::actingAs(User::factory()->organizer()->create());
        $cat = Category::factory()->create();

        $this->postJson('/api/organizer/events', ['title' => ''])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonStructure(['errors' => ['title', 'category_id', 'description', 'location', 'start_at', 'end_at']]);

        $this->postJson('/api/organizer/events', $this->eventPayload($cat, [
            'start_at' => '2026-12-10T10:00:00', 'end_at' => '2026-12-10T09:00:00',
        ]))->assertStatus(422)->assertJsonPath('errors.end_at', 'End must be after start.');

        $this->postJson('/api/organizer/events', $this->eventPayload($cat, ['category_id' => 9999]))
            ->assertStatus(422)->assertJsonPath('errors.category_id', 'Choose a valid category.');
    }

    public function test_organizer_can_edit_and_delete_own_event(): void
    {
        $org = User::factory()->organizer()->create();
        $cat = Category::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $org->id, 'category_id' => $cat->id]);
        Sanctum::actingAs($org);

        $this->putJson("/api/organizer/events/{$event->id}", $this->eventPayload($cat, ['title' => 'Renamed Event Title']))
            ->assertOk()->assertJsonPath('data.title', 'Renamed Event Title');
        $this->assertSame('renamed-event-title', $event->fresh()->slug);

        $this->deleteJson("/api/organizer/events/{$event->id}")->assertOk();
        $this->assertSoftDeleted('events', ['id' => $event->id]);
    }

    public function test_organizer_cannot_modify_another_organizers_event(): void
    {
        $owner = User::factory()->organizer()->create();
        $intruder = User::factory()->organizer()->create();
        $cat = Category::factory()->create();
        $event = Event::factory()->create(['organizer_id' => $owner->id, 'category_id' => $cat->id, 'title' => 'Original Title']);
        Sanctum::actingAs($intruder);

        $this->putJson("/api/organizer/events/{$event->id}", $this->eventPayload($cat, ['title' => 'Hacked Title']))
            ->assertStatus(403)->assertJsonPath('message', 'This event belongs to another organizer.');
        $this->deleteJson("/api/organizer/events/{$event->id}")->assertStatus(403);
        $this->postJson("/api/organizer/events/{$event->id}/submit")->assertStatus(403);
        $this->postJson("/api/events/{$event->id}/schedules", ['title' => 'x', 'start_at' => now()->addDay()->toIso8601String(), 'end_at' => now()->addDays(2)->toIso8601String()])->assertStatus(403);

        $this->assertSame('Original Title', $event->fresh()->title);
        $this->assertNotSoftDeleted('events', ['id' => $event->id]);

        // Event orang lain juga tidak muncul di daftar milikku.
        $this->getJson('/api/organizer/events')->assertJsonCount(0, 'data');
    }

    public function test_role_boundaries(): void
    {
        $this->getJson('/api/organizer/events')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create());   // peserta
        $this->getJson('/api/organizer/events')->assertStatus(403);
        $this->getJson('/api/admin/users')->assertStatus(403);

        Sanctum::actingAs(User::factory()->organizer()->create());
        $this->getJson('/api/admin/users')->assertStatus(403);
        $this->getJson('/api/my-events')->assertStatus(403);
    }

    public function test_pending_event_is_locked_for_its_organizer(): void
    {
        $org = User::factory()->organizer()->create();
        $cat = Category::factory()->create();
        $event = Event::factory()->pending()->create(['organizer_id' => $org->id, 'category_id' => $cat->id]);
        Sanctum::actingAs($org);

        $this->putJson("/api/organizer/events/{$event->id}", $this->eventPayload($cat))->assertStatus(409);
        $this->deleteJson("/api/organizer/events/{$event->id}")->assertStatus(409);
    }

    public function test_submit_for_review_flow(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->create(['organizer_id' => $org->id]);
        Sanctum::actingAs($org);

        $this->postJson("/api/organizer/events/{$event->id}/submit")
            ->assertOk()->assertJsonPath('data.status', 'pending_review');
        $this->assertNotNull($event->fresh()->submitted_at);

        // Tidak bisa submit dua kali (sudah terkunci).
        $this->postJson("/api/organizer/events/{$event->id}/submit")->assertStatus(409);
    }

    public function test_approved_event_with_registrants_cannot_be_deleted_but_can_be_cancelled(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->approved()->create(['organizer_id' => $org->id]);
        EventRegistration::create(['event_id' => $event->id, 'user_id' => User::factory()->create()->id, 'status' => 'registered', 'registered_at' => now()]);
        Sanctum::actingAs($org);

        $this->deleteJson("/api/organizer/events/{$event->id}")->assertStatus(422);
        $this->postJson("/api/events/{$event->id}/cancel")->assertOk()->assertJsonPath('data.status', 'cancelled');
    }

    public function test_schedule_crud_for_owner_and_speaker_must_belong_to_same_event(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->create(['organizer_id' => $org->id]);
        $speaker = Speaker::factory()->create(['event_id' => $event->id]);
        $foreign = Speaker::factory()->create();
        Sanctum::actingAs($org);

        $body = [
            'title' => 'Opening Keynote', 'session_name' => 'Morning', 'location' => 'Main Hall',
            'speaker_id' => $speaker->id,
            'start_at' => now()->addDays(10)->format('Y-m-d\T09:00:00'), 'end_at' => now()->addDays(10)->format('Y-m-d\T10:00:00'),
        ];

        $id = $this->postJson("/api/events/{$event->id}/schedules", $body)
            ->assertCreated()->assertJsonPath('data.speaker.name', $speaker->name)->json('data.id');

        $this->putJson("/api/events/{$event->id}/schedules/{$id}", array_merge($body, ['title' => 'Updated Keynote']))
            ->assertOk()->assertJsonPath('data.title', 'Updated Keynote');

        $this->postJson("/api/events/{$event->id}/schedules", array_merge($body, ['speaker_id' => $foreign->id]))
            ->assertStatus(422)->assertJsonStructure(['errors' => ['speaker_id']]);

        $this->postJson("/api/events/{$event->id}/schedules", array_merge($body, ['end_at' => $body['start_at']]))
            ->assertStatus(422)->assertJsonPath('errors.end_at', 'End must be after start.');

        $this->getJson("/api/events/{$event->id}/schedules")->assertJsonCount(1, 'data');
        $this->deleteJson("/api/events/{$event->id}/schedules/{$id}")->assertOk();
        $this->assertSame(0, Schedule::count());
    }

    public function test_child_record_of_another_event_cannot_be_touched_through_own_event_url(): void
    {
        $org = User::factory()->organizer()->create();
        $mine = Event::factory()->create(['organizer_id' => $org->id]);
        $foreignSpeaker = Speaker::factory()->create();
        Sanctum::actingAs($org);

        $this->deleteJson("/api/events/{$mine->id}/speakers/{$foreignSpeaker->id}")->assertStatus(404);
        $this->assertDatabaseHas('speakers', ['id' => $foreignSpeaker->id]);
    }

    public function test_speaker_crud_and_photo_upload_validation(): void
    {
        Storage::fake('public');
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->create(['organizer_id' => $org->id]);
        Sanctum::actingAs($org);

        $res = $this->postJson("/api/events/{$event->id}/speakers", [
            'name' => 'Dr. Rina', 'role' => 'Speaker', 'topic' => 'Applied AI', 'photo' => 'data:image/png;base64,'.self::PNG,
        ])->assertCreated();

        $path = $res->json('data.photo');
        $this->assertStringStartsWith('storage/speakers/', $path);
        Storage::disk('public')->assertExists(substr($path, strlen('storage/')));

        // SVG (bisa berisi script) dan data palsu ditolak.
        $this->postJson("/api/events/{$event->id}/speakers", [
            'name' => 'X', 'role' => 'Speaker', 'photo' => 'data:image/svg+xml;base64,'.base64_encode('<svg onload="alert(1)"/>'),
        ])->assertStatus(422)->assertJsonStructure(['errors' => ['photo']]);

        $this->postJson("/api/events/{$event->id}/speakers", [
            'name' => 'X', 'role' => 'Speaker', 'photo' => 'data:image/png;base64,'.base64_encode('not really an image'),
        ])->assertStatus(422);

        $this->postJson("/api/events/{$event->id}/speakers", [
            'name' => 'X', 'role' => 'Speaker', 'photo' => 'https://evil.example/x.png',
        ])->assertStatus(422);

        $id = $res->json('data.id');
        $this->deleteJson("/api/events/{$event->id}/speakers/{$id}")->assertOk();
        Storage::disk('public')->assertMissing(substr($path, strlen('storage/')));
    }

    public function test_committee_crud(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->create(['organizer_id' => $org->id]);
        Sanctum::actingAs($org);

        $id = $this->postJson("/api/events/{$event->id}/committees", ['name' => 'Core Team', 'role' => 'Coordinator'])
            ->assertCreated()->json('data.id');
        $this->putJson("/api/events/{$event->id}/committees/{$id}", ['name' => 'Core Team 2', 'role' => 'Coordinator'])->assertOk();
        $this->assertDatabaseHas('event_committees', ['id' => $id, 'name' => 'Core Team 2']);
        $this->deleteJson("/api/events/{$event->id}/committees/{$id}")->assertOk();
    }

    public function test_organizer_sees_participants_of_own_event_only(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->approved()->create(['organizer_id' => $org->id]);
        $foreign = Event::factory()->approved()->create();
        $person = User::factory()->create(['name' => 'Sari Dewi']);
        EventRegistration::create(['event_id' => $event->id, 'user_id' => $person->id, 'status' => 'registered', 'registered_at' => now()]);
        EventRegistration::create(['event_id' => $foreign->id, 'user_id' => User::factory()->create()->id, 'status' => 'registered', 'registered_at' => now()]);
        Sanctum::actingAs($org);

        $this->getJson("/api/events/{$event->id}/participants")->assertOk()
            ->assertJsonCount(1, 'data')->assertJsonPath('data.0.user.name', 'Sari Dewi');
        $this->getJson('/api/organizer/participants')->assertJsonCount(1, 'data');
        $this->getJson("/api/events/{$foreign->id}/participants")->assertStatus(403);
    }
}
