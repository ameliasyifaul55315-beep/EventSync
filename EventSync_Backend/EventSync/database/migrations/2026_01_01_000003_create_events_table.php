<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('events', function (Blueprint $table) {
            $table->id();
            // RESTRICT: organizer / kategori yang masih punya event tidak boleh dihapus begitu saja.
            $table->foreignId('organizer_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('category_id')->constrained('categories')->restrictOnDelete();
            $table->string('title', 150);
            $table->string('slug', 190)->unique();
            $table->text('description');
            $table->string('location', 200);
            $table->dateTime('start_at');
            $table->dateTime('end_at');
            $table->unsignedInteger('capacity')->nullable();          // null = tidak terbatas
            $table->string('poster_path')->nullable();
            $table->boolean('is_featured')->default(false);

            // Alur persetujuan. Upcoming/Ongoing/Completed TIDAK disimpan; dihitung dari start_at/end_at.
            $table->enum('status', ['draft', 'pending_review', 'approved', 'rejected', 'cancelled'])
                ->default('draft');
            $table->dateTime('submitted_at')->nullable();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->text('review_note')->nullable();                  // alasan penolakan / catatan admin

            $table->softDeletes();
            $table->timestamps();

            $table->index(['status', 'start_at']);
            $table->index('start_at');
            $table->index(['organizer_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('events');
    }
};
