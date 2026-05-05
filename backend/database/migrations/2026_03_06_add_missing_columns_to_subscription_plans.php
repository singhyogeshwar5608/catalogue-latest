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
        Schema::table('subscription_plans', function (Blueprint $table) {
            if (!Schema::hasColumn('subscription_plans', 'name')) {
                $table->string('name')->after('id');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'slug')) {
                $table->string('slug')->unique()->after('name');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'price')) {
                $table->unsignedInteger('price')->default(0)->after('slug');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'billing_cycle')) {
                $table->enum('billing_cycle', ['monthly', 'yearly'])->default('monthly')->after('price');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'max_products')) {
                $table->unsignedInteger('max_products')->default(10)->after('billing_cycle');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'is_popular')) {
                $table->boolean('is_popular')->default(false)->after('max_products');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'features')) {
                $table->json('features')->nullable()->after('is_active');
            }
            
            if (!Schema::hasColumn('subscription_plans', 'description')) {
                $table->text('description')->nullable()->after('features');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('subscription_plans', function (Blueprint $table) {
            if (Schema::hasColumn('subscription_plans', 'is_active')) {
                $table->dropColumn('is_active');
            }
        });
    }
};
