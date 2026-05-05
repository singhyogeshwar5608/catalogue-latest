<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('subscription_plans')) {
            return;
        }

        if (! Schema::hasColumn('subscription_plans', 'billing_discount_tier')) {
            Schema::table('subscription_plans', function (Blueprint $table) {
                $table->string('billing_discount_tier', 32)->nullable()->after('duration_days');
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('subscription_plans') && Schema::hasColumn('subscription_plans', 'billing_discount_tier')) {
            Schema::table('subscription_plans', function (Blueprint $table) {
                $table->dropColumn('billing_discount_tier');
            });
        }
    }
};
