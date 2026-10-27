<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    // Dibuat SETELAH speakers karena schedules.speaker_id mereferensikan speakers.id.
    public function up(): void
    {
        Schema::create('schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            // Speaker dihapus -> jadwal tetap ada, hanya speaker_id menjadi NULL.
            $table->foreignId('speaker_id')->nullable()->constrained('speakers')->nullOnDelete();
            $table->string('session_name', 100)->nullable();          // kelompok sesi, mis. "Morning"
            $table->string('title', 150);
            $table->text('description')->nullable();
            $table->string('location', 150)->nullable();
            $table->string('person_in_charge', 120)->nullable();      // teks bebas bila tanpa speaker
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->timestamps();

            $table->index(['event_id', 'start_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedules');
    }
};
