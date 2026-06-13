<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('checkout_handoffs', function (Blueprint $table) {
            $table->id();
            $table->string('donation_attempt_id', 128)->unique();
            $table->string('handoff_status', 64)->default('cart_handoff_created');
            $table->timestamp('handoff_at');
            $table->timestamp('next_reconcile_at')->nullable();
            $table->unsignedSmallInteger('reconcile_attempts')->default(0);
            $table->string('foxy_transaction_id', 128)->nullable();
            $table->foreignId('checkout_event_id')->nullable()->constrained('checkout_events')->nullOnDelete();
            $table->string('reconciliation_note', 500)->nullable();
            $table->string('checkout_provider', 32)->default('foxy');
            $table->string('source_page', 64);
            $table->string('campaign_id', 128);
            $table->string('campaign_name');
            $table->decimal('donation_amount', 10, 2);
            $table->string('donation_currency', 3)->default('USD');
            $table->string('donation_label');
            $table->string('donation_type', 32)->default('one_time');
            $table->timestamps();

            $table->index('handoff_status');
            $table->index('next_reconcile_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('checkout_handoffs');
    }
};
