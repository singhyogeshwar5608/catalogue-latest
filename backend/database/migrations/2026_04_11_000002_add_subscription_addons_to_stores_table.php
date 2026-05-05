<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'subscription_addons')) {
                if (Schema::hasColumn('stores', 'trial_ends_at')) {
                    $table->json('subscription_addons')->nullable()->after('trial_ends_at');
                } else {
                    $table->json('subscription_addons')->nullable();
                }
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'subscription_addons')) {
                $table->dropColumn('subscription_addons');
            }
        });
    }
};
