<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('crm_sync_attempts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('checkout_event_id')->unique()->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending');
            $table->string('hubspot_contact_id')->nullable();
            $table->string('hubspot_deal_id')->nullable();
            $table->string('error_code')->nullable();
            $table->string('error_message', 500)->nullable();
            $table->unsignedSmallInteger('retry_count')->default(0);
            $table->timestamp('last_attempted_at')->nullable();
            $table->timestamp('next_retry_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'next_retry_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('crm_sync_attempts');
    }
};
