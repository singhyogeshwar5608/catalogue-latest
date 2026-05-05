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
            if (! Schema::hasColumn('stores', 'state')) {
                $table->string('state', 120)->nullable();
            }
            if (! Schema::hasColumn('stores', 'district')) {
                $table->string('district', 120)->nullable();
            }
        });

        if (Schema::hasColumn('stores', 'state') && Schema::hasColumn('stores', 'district')) {
            Schema::table('stores', function (Blueprint $table) {
                $table->index(['state', 'district'], 'stores_state_district_idx');
            });
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'state') && Schema::hasColumn('stores', 'district')) {
                try {
                    $table->dropIndex('stores_state_district_idx');
                } catch (\Throwable) {
                    // ignore
                }
            }
            if (Schema::hasColumn('stores', 'district')) {
                $table->dropColumn('district');
            }
            if (Schema::hasColumn('stores', 'state')) {
                $table->dropColumn('state');
            }
        });
    }
};
