<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('checkout_events', function (Blueprint $table) {
            $table->string('donation_attempt_id')->nullable()->after('event_created_at');
            $table->index('donation_attempt_id');
        });
    }

    public function down(): void
    {
        Schema::table('checkout_events', function (Blueprint $table) {
            $table->dropIndex(['donation_attempt_id']);
            $table->dropColumn('donation_attempt_id');
        });
    }
};
