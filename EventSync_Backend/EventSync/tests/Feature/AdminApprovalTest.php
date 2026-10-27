<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Event;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminApprovalTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create();
    }

    public function test_admin_approves_pending_event_and_it_becomes_public(): void
    {
        $event = Event::factory()->pending()->create();
        $this->getJson("/api/events/{$event->id}")->assertStatus(404);

        Sanctum::actingAs($this->admin);
        $this->postJson("/api/admin/events/{$event->id}/approve")
            ->assertOk()->assertJsonPath('data.status', 'approved');

        $event->refresh();
        $this->assertSame($this->admin->id, $event->reviewed_by);
        $this->assertNotNull($event->reviewed_at);

        $this->app['auth']->forgetGuards();
        $this->getJson("/api/events/{$event->id}")->assertOk();
    }

    public function test_reject_requires_a_note_and_stores_it(): void
    {
        $event = Event::factory()->pending()->create();
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/events/{$event->id}/reject", [])
            ->assertStatus(422)->assertJsonStructure(['errors' => ['review_note']]);
        $this->assertSame('pending_review', $event->fresh()->status);

        $this->postJson("/api/admin/events/{$event->id}/reject", ['review_note' => 'Please add a complete schedule.'])
            ->assertOk()->assertJsonPath('data.status', 'rejected')
            ->assertJsonPath('data.review_note', 'Please add a complete schedule.');
    }

    public function test_only_pending_events_can_be_reviewed(): void
    {
        $event = Event::factory()->approved()->create();
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/events/{$event->id}/approve")->assertStatus(422);
        $this->postJson('/api/admin/events/99999/approve')->assertStatus(404);
    }

    public function test_non_admins_cannot_review_even_the_owner(): void
    {
        $org = User::factory()->organizer()->create();
        $event = Event::factory()->pending()->create(['organizer_id' => $org->id]);

        Sanctum::actingAs($org);
        $this->postJson("/api/admin/events/{$event->id}/approve")->assertStatus(403);

        Sanctum::actingAs(User::factory()->create());
        $this->postJson("/api/admin/events/{$event->id}/reject", ['review_note' => 'whatever note'])->assertStatus(403);

        $this->assertSame('pending_review', $event->fresh()->status);
    }

    public function test_rejected_event_can_be_fixed_and_resubmitted(): void
    {
        $org = User::factory()->organizer()->create();
        $cat = Category::factory()->create();
        $event = Event::factory()->rejected()->create(['organizer_id' => $org->id, 'category_id' => $cat->id]);
        Sanctum::actingAs($org);

        $this->putJson("/api/organizer/events/{$event->id}", [
            'title' => 'Fixed Event Title', 'category_id' => $cat->id,
            'description' => 'Now with a complete description of the event.', 'location' => 'Hall A',
            'start_at' => now()->addDays(30)->format('Y-m-d\T09:00:00'), 'end_at' => now()->addDays(30)->format('Y-m-d\T12:00:00'),
        ])->assertOk()->assertJsonPath('data.status', 'draft');

        $this->postJson("/api/organizer/events/{$event->id}/submit")->assertOk()->assertJsonPath('data.status', 'pending_review');
        $this->assertNull($event->fresh()->review_note);
    }

    public function test_admin_manages_users(): void
    {
        Sanctum::actingAs($this->admin);

        $id = $this->postJson('/api/admin/users', [
            'name' => 'New Organizer', 'email' => 'NEW.Org@Example.test', 'role' => 'organizer',
            'organization_name' => 'Campus Club', 'password' => 'organizer-pass-1',
        ])->assertCreated()->assertJsonPath('data.role', 'organizer')->assertJsonPath('data.email', 'new.org@example.test')->json('data.id');

        $this->assertNotSame('organizer-pass-1', User::find($id)->password);

        $this->putJson("/api/admin/users/{$id}", ['name' => 'Renamed', 'email' => 'new.org@example.test', 'role' => 'organizer'])
            ->assertOk()->assertJsonPath('data.name', 'Renamed');

        $this->getJson('/api/admin/users?role=organizer')->assertOk()->assertJsonCount(1, 'data');
        $this->getJson('/api/admin/organizers')->assertOk()->assertJsonCount(1, 'data');

        $this->postJson('/api/admin/users', ['name' => 'Dup', 'email' => 'new.org@example.test', 'role' => 'user', 'password' => 'password-123'])
            ->assertStatus(422);
        $this->postJson('/api/admin/users', ['name' => 'Bad', 'email' => 'bad@example.test', 'role' => 'superuser', 'password' => 'password-123'])
            ->assertStatus(422);

        $this->deleteJson("/api/admin/users/{$id}")->assertOk();
        $this->assertDatabaseMissing('users', ['id' => $id]);
    }

    public function test_deactivating_a_user_revokes_tokens_and_blocks_login(): void
    {
        $user = User::factory()->create();
        $user->createToken('t');
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/users/{$user->id}/toggle")->assertOk()->assertJsonPath('data.is_active', false);
        $this->assertSame(0, $user->tokens()->count());
    }

    public function test_admin_cannot_harm_own_account_or_delete_users_who_own_events(): void
    {
        $org = User::factory()->organizer()->create();
        Event::factory()->create(['organizer_id' => $org->id]);
        Sanctum::actingAs($this->admin);

        $this->postJson("/api/admin/users/{$this->admin->id}/toggle")->assertStatus(422);
        $this->deleteJson("/api/admin/users/{$this->admin->id}")->assertStatus(422);
        $this->putJson("/api/admin/users/{$this->admin->id}", ['name' => 'A', 'email' => $this->admin->email, 'role' => 'user'])->assertStatus(422);
        $this->deleteJson("/api/admin/users/{$org->id}")->assertStatus(422);
    }

    public function test_admin_categories_crud_and_delete_restriction(): void
    {
        Sanctum::actingAs($this->admin);

        $id = $this->postJson('/api/admin/categories', ['name' => 'Arts & Culture', 'color' => '#B91C1C'])
            ->assertCreated()->assertJsonPath('data.slug', 'arts-culture')->json('data.id');

        $this->postJson('/api/admin/categories', ['name' => 'arts & culture', 'color' => '#B91C1C'])
            ->assertStatus(422)->assertJsonPath('errors.name', 'This category already exists.');
        $this->postJson('/api/admin/categories', ['name' => 'X', 'color' => 'red'])->assertStatus(422);

        $this->putJson("/api/admin/categories/{$id}", ['name' => 'Arts', 'color' => '#111111'])
            ->assertOk()->assertJsonPath('data.slug', 'arts');

        // Publik bisa melihat kategori.
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/categories')->assertOk()->assertJsonPath('data.0.name', 'Arts');

        Sanctum::actingAs($this->admin);
        Event::factory()->create(['category_id' => $id]);
        $this->deleteJson("/api/admin/categories/{$id}")->assertStatus(422);

        $empty = Category::factory()->create();
        $this->deleteJson("/api/admin/categories/{$empty->id}")->assertOk();
    }

    public function test_non_admin_cannot_manage_categories(): void
    {
        Sanctum::actingAs(User::factory()->organizer()->create());
        $this->postJson('/api/admin/categories', ['name' => 'Nope', 'color' => '#111111'])->assertStatus(403);
    }

    public function test_admin_dashboard_and_event_management(): void
    {
        Event::factory()->pending()->count(2)->create();
        $approved = Event::factory()->approved()->create();
        Sanctum::actingAs($this->admin);

        $this->getJson('/api/admin/dashboard')->assertOk()
            ->assertJsonPath('data.stats.pending_events', 2)
            ->assertJsonPath('data.stats.total_events', 3)
            ->assertJsonCount(2, 'data.pending');

        $this->getJson('/api/admin/events?status=pending_review')->assertJsonCount(2, 'data');

        $this->putJson("/api/admin/events/{$approved->id}", [
            'title' => $approved->title, 'category_id' => $approved->category_id,
            'location' => 'New Location', 'capacity' => 50, 'is_featured' => true,
        ])->assertOk()->assertJsonPath('data.is_featured', true)->assertJsonPath('data.capacity', 50);
    }
}
