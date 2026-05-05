<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class BoostPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $boostPlans = [
            [
                'name' => 'Basic Boost',
                'days' => 7,
                'price' => 199,
                'priority_weight' => 1,
                'badge_label' => 'Boosted',
                'badge_color' => '#fbbf24',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Standard Boost',
                'days' => 15,
                'price' => 349,
                'priority_weight' => 2,
                'badge_label' => 'Featured',
                'badge_color' => '#f59e0b',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Premium Boost',
                'days' => 30,
                'price' => 599,
                'priority_weight' => 3,
                'badge_label' => 'Premium',
                'badge_color' => '#d97706',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Ultimate Boost',
                'days' => 90,
                'price' => 1499,
                'priority_weight' => 5,
                'badge_label' => 'Ultimate',
                'badge_color' => '#b45309',
                'is_active' => true,
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('boost_plans')->insert($boostPlans);
    }
}
