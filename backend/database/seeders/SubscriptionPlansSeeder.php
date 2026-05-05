<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SubscriptionPlansSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $plans = [
            [
                'name' => 'Free',
                'slug' => 'free',
                'price' => 0,
                'billing_cycle' => 'monthly',
                'duration_days' => 7,
                'billing_discount_tier' => null,
                'max_products' => 10,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 10 products',
                    'Basic store customization',
                    'Standard support',
                    'Mobile responsive',
                    'Free trial period',
                ]),
                'description' => 'Getting started — trial access to your storefront',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Basic',
                'slug' => 'basic',
                'price' => 299,
                'billing_cycle' => 'monthly',
                'duration_days' => 30,
                'billing_discount_tier' => 'one_month',
                'max_products' => 50,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 50 products',
                    'Advanced customization',
                    'Priority support',
                    'Analytics dashboard',
                    'Custom domain',
                    '1 month subscription',
                ]),
                'description' => 'Small stores — 1 month billing term',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Pro',
                'slug' => 'pro',
                'price' => 999,
                'billing_cycle' => 'monthly',
                'duration_days' => 90,
                'billing_discount_tier' => 'three_months',
                'max_products' => 100,
                'is_popular' => true,
                'is_active' => true,
                'features' => json_encode([
                    'Up to 100 products',
                    'Premium themes',
                    '24/7 support',
                    'Advanced analytics',
                    'SEO optimization',
                    'Marketing tools',
                    'API access',
                    '3 month subscription',
                ]),
                'description' => 'Growing businesses — 3 month billing term',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
            [
                'name' => 'Enterprise',
                'slug' => 'enterprise',
                'price' => 2999,
                'billing_cycle' => 'monthly',
                'duration_days' => 365,
                'billing_discount_tier' => 'one_year',
                'max_products' => 999999,
                'is_popular' => false,
                'is_active' => true,
                'features' => json_encode([
                    'Unlimited products',
                    'Custom development',
                    'Dedicated support',
                    'Advanced integrations',
                    'White-label solution',
                    'Priority features',
                    'Custom analytics',
                    'Multi-store management',
                    '1 year subscription',
                ]),
                'description' => 'Large businesses — 1 year billing term',
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ],
        ];

        DB::table('subscription_plans')->insert($plans);
    }
}
