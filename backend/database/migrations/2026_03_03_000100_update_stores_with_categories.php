<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->foreignId('category_id')->nullable()->after('user_id')->constrained()->nullOnDelete();
            if (! Schema::hasColumn('stores', 'theme')) {
                $table->string('theme')->nullable()->after('layout_type');
            }
        });

        Schema::table('stores', function (Blueprint $table) {
            if (Schema::hasColumn('stores', 'category')) {
                $table->dropColumn('category');
            }
            if (Schema::hasColumn('stores', 'business_type')) {
                $table->dropColumn('business_type');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (! Schema::hasColumn('stores', 'category')) {
                $table->string('category')->nullable()->after('slug');
            }
            if (! Schema::hasColumn('stores', 'business_type')) {
                $table->string('business_type')->nullable()->after('category');
            }
            if (Schema::hasColumn('stores', 'theme')) {
                $table->dropColumn('theme');
            }
            if (Schema::hasColumn('stores', 'category_id')) {
                $table->dropConstrainedForeignId('category_id');
            }
        });
    }
};
