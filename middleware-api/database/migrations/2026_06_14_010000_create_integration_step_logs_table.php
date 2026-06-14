<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('integration_step_logs', function (Blueprint $table) {
            $table->id();
            $table->string('donation_attempt_id', 128)->nullable();
            $table->string('step', 64);
            $table->string('status', 32);
            $table->string('producer', 64);
            $table->string('summary', 500);
            $table->string('error_code', 128)->nullable();
            $table->foreignId('checkout_event_id')->nullable()->constrained('checkout_events')->nullOnDelete();
            $table->foreignId('checkout_handoff_id')->nullable()->constrained('checkout_handoffs')->nullOnDelete();
            $table->foreignId('crm_sync_attempt_id')->nullable()->constrained('crm_sync_attempts')->nullOnDelete();
            $table->unsignedSmallInteger('occurrence_count')->default(1);
            $table->timestamps();

            $table->index('donation_attempt_id');
            $table->index(['donation_attempt_id', 'created_at']);
            $table->index('step');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('integration_step_logs');
    }
};
