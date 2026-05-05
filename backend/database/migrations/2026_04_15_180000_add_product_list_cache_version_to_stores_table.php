<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Bumps whenever catalog rows change so Laravel cache keys for product listings stay coherent.
     */
    public function up(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'product_list_cache_version')) {
                $table->unsignedInteger('product_list_cache_version')->default(0);
            }
        });
    }

    public function down(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'product_list_cache_version')) {
                $table->dropColumn('product_list_cache_version');
            }
        });
    }
};
