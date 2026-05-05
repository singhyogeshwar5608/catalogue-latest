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
        Schema::table('store_subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('store_subscriptions', 'store_id')) {
                $table->unsignedBigInteger('store_id')->after('id');
                $table->foreign('store_id')->references('id')->on('stores')->cascadeOnDelete();
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'subscription_plan_id')) {
                $table->unsignedBigInteger('subscription_plan_id')->after('store_id');
                $table->foreign('subscription_plan_id')->references('id')->on('subscription_plans')->cascadeOnDelete();
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'price')) {
                $table->unsignedInteger('price')->after('subscription_plan_id');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'status')) {
                $table->enum('status', ['active', 'expired', 'cancelled'])->default('active')->after('price');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'starts_at')) {
                $table->dateTime('starts_at')->after('status');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'ends_at')) {
                $table->dateTime('ends_at')->after('starts_at');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'auto_renew')) {
                $table->boolean('auto_renew')->default(true)->after('ends_at');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'metadata')) {
                $table->json('metadata')->nullable()->after('auto_renew');
            }
            
            if (!Schema::hasColumn('store_subscriptions', 'activated_by')) {
                $table->unsignedBigInteger('activated_by')->nullable()->after('metadata');
                $table->foreign('activated_by')->references('id')->on('users')->nullOnDelete();
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('store_subscriptions', function (Blueprint $table) {
            $columns = ['store_id', 'subscription_plan_id', 'price', 'status', 'starts_at', 'ends_at', 'auto_renew', 'metadata', 'activated_by'];
            foreach ($columns as $column) {
                if (Schema::hasColumn('store_subscriptions', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
