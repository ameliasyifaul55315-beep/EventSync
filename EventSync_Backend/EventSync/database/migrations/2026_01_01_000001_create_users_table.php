<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('email', 150)->unique();
            $table->string('password');                       // selalu hash (cast "hashed" di model User)
            $table->enum('role', ['user', 'organizer', 'admin'])->default('user')->index();
            $table->string('phone', 20)->nullable();
            $table->string('organization_name', 150)->nullable();   // dipakai role organizer
            $table->boolean('is_active')->default(true);             // false = tidak bisa login
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
