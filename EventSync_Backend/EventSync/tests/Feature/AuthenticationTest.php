<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Factories\UserFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    private function payload(array $override = []): array
    {
        return array_merge([
            'name' => 'Budi Test',
            'email' => 'budi.test@example.test',
            'password' => 'secret-pass-1',
            'password_confirmation' => 'secret-pass-1',
        ], $override);
    }

    public function test_register_creates_participant_with_hashed_password(): void
    {
        $this->postJson('/api/auth/register', $this->payload())
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('user.role', 'user')
            ->assertJsonMissingPath('user.password');

        $user = User::where('email', 'budi.test@example.test')->firstOrFail();
        $this->assertNotSame('secret-pass-1', $user->password);
        $this->assertTrue(Hash::check('secret-pass-1', $user->password));
    }

    public function test_public_registration_cannot_create_admin_or_organizer(): void
    {
        $this->postJson('/api/auth/register', $this->payload(['role' => 'admin', 'is_active' => false]))->assertCreated();

        $user = User::where('email', 'budi.test@example.test')->firstOrFail();
        $this->assertSame('user', $user->role);
        $this->assertTrue($user->is_active);
    }

    public function test_register_rejects_duplicate_email_and_bad_confirmation(): void
    {
        User::factory()->create(['email' => 'budi.test@example.test']);

        $this->postJson('/api/auth/register', $this->payload())
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.email', 'This email is already registered.');

        $this->postJson('/api/auth/register', $this->payload(['email' => 'new@example.test', 'password_confirmation' => 'different']))
            ->assertStatus(422)
            ->assertJsonStructure(['errors' => ['password']]);
    }

    public function test_login_returns_token_that_can_access_me(): void
    {
        $user = User::factory()->create();

        $res = $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => UserFactory::TEST_PASSWORD])
            ->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->assertJsonStructure(['token', 'user' => ['id', 'name', 'email', 'role']]);

        $this->withToken($res->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }

    public function test_login_with_invalid_password_fails(): void
    {
        $user = User::factory()->create();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertStatus(422)
            ->assertJsonPath('success', false)
            ->assertJsonPath('errors.email', 'These credentials do not match our records.');

        $this->postJson('/api/auth/login', ['email' => 'nobody@example.test', 'password' => 'whatever1'])
            ->assertStatus(422);
    }

    public function test_deactivated_account_cannot_login(): void
    {
        $user = User::factory()->inactive()->create();

        $this->postJson('/api/auth/login', ['email' => $user->email, 'password' => UserFactory::TEST_PASSWORD])
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_existing_token_of_deactivated_account_is_rejected(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;
        $user->forceFill(['is_active' => false])->save();

        $this->withToken($token)->getJson('/api/auth/me')->assertStatus(403);
    }

    public function test_logout_revokes_the_token(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;
        $this->assertDatabaseCount('personal_access_tokens', 1);

        $this->withToken($token)->postJson('/api/auth/logout')->assertOk();

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_protected_endpoint_requires_authentication(): void
    {
        $this->getJson('/api/auth/me')
            ->assertStatus(401)
            ->assertJson(['success' => false, 'message' => 'Unauthenticated.']);
    }

    public function test_change_password_requires_correct_current_password(): void
    {
        $user = User::factory()->create();
        $token = $user->createToken('t')->plainTextToken;

        $this->withToken($token)->putJson('/api/profile/password', [
            'current_password' => 'nope-nope', 'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertStatus(422)->assertJsonPath('errors.current_password', 'Current password is incorrect.');

        $this->withToken($token)->putJson('/api/profile/password', [
            'current_password' => UserFactory::TEST_PASSWORD, 'password' => 'brand-new-pass', 'password_confirmation' => 'brand-new-pass',
        ])->assertOk();

        $this->assertTrue(Hash::check('brand-new-pass', $user->fresh()->password));
    }
}
