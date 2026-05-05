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
            if (! Schema::hasColumn('stores', 'seo_keywords')) {
                $table->text('seo_keywords')->nullable()->after('description');
            }
        });

        // Indexes help lookup speed for /store/{slug}, sitemap generation, and public active-store listings.
        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->index('slug', 'stores_slug_idx');
            });
        } catch (\Throwable) {
            // ignore existing index
        }
        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->index('username', 'stores_username_idx');
            });
        } catch (\Throwable) {
            // ignore existing index
        }
        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->index('is_active', 'stores_is_active_idx');
            });
        } catch (\Throwable) {
            // ignore existing index
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('stores')) {
            return;
        }

        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->dropIndex('stores_slug_idx');
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->dropIndex('stores_username_idx');
            });
        } catch (\Throwable) {
        }
        try {
            Schema::table('stores', function (Blueprint $table) {
                $table->dropIndex('stores_is_active_idx');
            });
        } catch (\Throwable) {
        }

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'seo_keywords')) {
                $table->dropColumn('seo_keywords');
            }
        });
    }
};
