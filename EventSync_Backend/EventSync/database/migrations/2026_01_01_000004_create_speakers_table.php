<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('speakers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('events')->cascadeOnDelete();
            $table->string('name', 120);
            $table->string('title', 120)->nullable();                 // jabatan / afiliasi
            $table->string('role', 60)->default('Speaker');           // Speaker, Mentor, Judge, ...
            $table->string('topic', 150)->nullable();
            $table->text('bio')->nullable();
            $table->string('photo')->nullable();
            $table->timestamps();

            $table->index('event_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('speakers');
    }
};
