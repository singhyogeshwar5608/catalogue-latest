<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->string('banner_image')->nullable()->after('business_type');
            $table->string('banner_color')->nullable()->default('#6366f1')->after('banner_image');
            $table->string('banner_title')->nullable()->after('banner_color');
            $table->string('banner_subtitle')->nullable()->after('banner_title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn([
                'banner_image',
                'banner_color',
                'banner_title',
                'banner_subtitle',
            ]);
        });
    }
};
