<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->enum('status', ['registered', 'cancelled', 'attended'])->default('registered');
            $table->dateTime('registered_at');
            $table->dateTime('cancelled_at')->nullable();
            $table->timestamps();

            // Satu user hanya punya SATU baris per event. Daftar ulang setelah batal
            // memakai baris yang sama (status kembali "registered"), jadi riwayat tidak ganda.
            $table->unique(['event_id', 'user_id']);
            $table->index(['user_id', 'status']);
            $table->index(['event_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_registrations');
    }
};
