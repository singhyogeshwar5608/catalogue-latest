<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->string('banner')->nullable()->after('logo');
            $table->text('short_description')->nullable()->after('description');
            $table->decimal('rating', 3, 1)->default(0)->after('short_description');
            $table->unsignedInteger('total_reviews')->default(0)->after('rating');
            $table->boolean('is_boosted')->default(false)->after('is_verified');
            $table->date('boost_expiry_date')->nullable()->after('is_boosted');
            $table->string('business_type')->nullable()->after('category');
            $table->string('location')->nullable()->after('business_type');
            $table->string('whatsapp')->nullable()->after('phone');
            $table->string('layout_type')->default('layout1')->after('whatsapp');
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'banner',
                'short_description',
                'rating',
                'total_reviews',
                'is_boosted',
                'boost_expiry_date',
                'business_type',
                'location',
                'whatsapp',
                'layout_type',
            ]);
        });
    }
};
