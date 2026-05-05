<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Ensure billing-discount keys exist in platform_settings so they appear in the DB
     * even before the admin saves from the panel (values default to 0%).
     */
    public function up(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        $now = now();
        $keys = [
            'subscription_billing_discount_1_month_pct',
            'subscription_billing_discount_3_months_pct',
            'subscription_billing_discount_1_year_pct',
        ];

        foreach ($keys as $key) {
            $exists = DB::table('platform_settings')->where('key', $key)->exists();
            if (! $exists) {
                DB::table('platform_settings')->insert([
                    'key' => $key,
                    'value' => '0',
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }
    }

    public function down(): void
    {
        if (! Schema::hasTable('platform_settings')) {
            return;
        }

        DB::table('platform_settings')->whereIn('key', [
            'subscription_billing_discount_1_month_pct',
            'subscription_billing_discount_3_months_pct',
            'subscription_billing_discount_1_year_pct',
        ])->delete();
    }
};
