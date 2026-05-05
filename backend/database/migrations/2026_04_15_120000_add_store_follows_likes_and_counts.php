<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'followers_count')) {
                $table->unsignedInteger('followers_count')->default(0);
            }
            if (! Schema::hasColumn('stores', 'likes_count')) {
                $table->unsignedInteger('likes_count')->default(0);
            }
        });

        if (! Schema::hasTable('store_follows')) {
            Schema::create('store_follows', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->string('actor_key', 191);
                $table->timestamps();
                $table->unique(['store_id', 'actor_key']);
            });
        }

        if (! Schema::hasTable('store_likes')) {
            Schema::create('store_likes', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->string('actor_key', 191);
                $table->timestamps();
                $table->unique(['store_id', 'actor_key']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('store_likes');
        Schema::dropIfExists('store_follows');

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'likes_count')) {
                $table->dropColumn('likes_count');
            }
            if (Schema::hasColumn('stores', 'followers_count')) {
                $table->dropColumn('followers_count');
            }
        });
    }
};
