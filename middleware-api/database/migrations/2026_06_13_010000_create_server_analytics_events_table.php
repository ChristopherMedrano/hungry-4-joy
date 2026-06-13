<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('server_analytics_events', function (Blueprint $table) {
            $table->id();
            $table->string('analytics_event_id', 128)->unique();
            $table->string('event', 64);
            $table->foreignId('checkout_event_id')->constrained('checkout_events')->cascadeOnDelete();
            $table->string('donation_attempt_id', 128)->nullable();
            $table->json('payload');
            $table->timestamps();

            $table->unique(['checkout_event_id', 'event']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('server_analytics_events');
    }
};
