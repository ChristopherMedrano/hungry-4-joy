<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('checkout_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_id')->unique();
            $table->string('event_type');
            $table->timestamp('event_created_at');
            $table->string('checkout_provider');
            $table->string('checkout_session_id');
            $table->string('transaction_id')->nullable();
            $table->string('transaction_status');
            $table->string('idempotency_key')->unique();
            $table->string('source_page');
            $table->string('campaign_id');
            $table->string('campaign_name');
            $table->decimal('donation_amount', 10, 2);
            $table->string('donation_currency', 3);
            $table->string('donation_label');
            $table->string('donation_type');
            $table->string('donor_email');
            $table->string('donor_first_name');
            $table->string('donor_last_name');
            $table->string('donor_phone')->nullable();
            $table->string('failure_code')->nullable();
            $table->string('failure_message', 500)->nullable();
            $table->string('failure_provider_status')->nullable();
            $table->timestamps();

            $table->index(['event_type', 'transaction_status']);
            $table->index('campaign_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('checkout_events');
    }
};
