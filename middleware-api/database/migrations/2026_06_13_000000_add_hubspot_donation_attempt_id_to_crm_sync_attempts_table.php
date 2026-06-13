<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('crm_sync_attempts', function (Blueprint $table) {
            $table->string('hubspot_donation_attempt_id')->nullable()->after('hubspot_deal_id');
        });
    }

    public function down(): void
    {
        Schema::table('crm_sync_attempts', function (Blueprint $table) {
            $table->dropColumn('hubspot_donation_attempt_id');
        });
    }
};
