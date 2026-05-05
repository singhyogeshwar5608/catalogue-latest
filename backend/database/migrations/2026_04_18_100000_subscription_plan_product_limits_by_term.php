<?php

use App\Models\SubscriptionPlan;
use App\Support\SubscriptionPlanProductLimit;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Aligns product caps with plan term: free 10 · 1 month 50 · 3 months 100 · 1 year unlimited.
 * Sets duration + billing_discount_tier per catalog slug so {@see SubscriptionPlanProductLimit} resolves correctly.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('subscription_plans')) {
            return;
        }

        $bySlug = [
            'free' => [
                'duration_days' => 7,
                'billing_discount_tier' => null,
                'billing_cycle' => 'monthly',
                'features' => [
                    'Up to 10 products',
                    'Basic store customization',
                    'Standard support',
                    'Mobile responsive',
                    'Free trial period',
                ],
                'description' => 'Getting started — trial access to your storefront',
            ],
            'basic' => [
                'duration_days' => 30,
                'billing_discount_tier' => 'one_month',
                'billing_cycle' => 'monthly',
                'features' => [
                    'Up to 50 products',
                    'Advanced customization',
                    'Priority support',
                    'Analytics dashboard',
                    'Custom domain',
                    '1 month subscription',
                ],
                'description' => 'Small stores — 1 month billing term',
            ],
            'pro' => [
                'duration_days' => 90,
                'billing_discount_tier' => 'three_months',
                'billing_cycle' => 'monthly',
                'features' => [
                    'Up to 100 products',
                    'Premium themes',
                    '24/7 support',
                    'Advanced analytics',
                    'SEO optimization',
                    'Marketing tools',
                    'API access',
                    '3 month subscription',
                ],
                'description' => 'Growing businesses — 3 month billing term',
            ],
            'enterprise' => [
                'duration_days' => 365,
                'billing_discount_tier' => 'one_year',
                'billing_cycle' => 'monthly',
                'features' => [
                    'Unlimited products',
                    'Custom development',
                    'Dedicated support',
                    'Advanced integrations',
                    'White-label solution',
                    'Priority features',
                    'Custom analytics',
                    'Multi-store management',
                    '1 year subscription',
                ],
                'description' => 'Large businesses — 1 year billing term',
            ],
        ];

        foreach ($bySlug as $slug => $patch) {
            if (! Schema::hasColumn('subscription_plans', 'duration_days')) {
                break;
            }
            $id = DB::table('subscription_plans')->whereRaw('LOWER(slug) = ?', [strtolower($slug)])->value('id');
            if (! $id) {
                continue;
            }
            $row = [
                'duration_days' => $patch['duration_days'],
                'billing_discount_tier' => $patch['billing_discount_tier'],
                'billing_cycle' => $patch['billing_cycle'],
                'description' => $patch['description'],
                'updated_at' => now(),
            ];
            if (Schema::hasColumn('subscription_plans', 'features')) {
                $row['features'] = json_encode($patch['features']);
            }
            DB::table('subscription_plans')->where('id', $id)->update($row);
        }

        foreach (SubscriptionPlan::query()->orderBy('id')->cursor() as $plan) {
            $resolved = SubscriptionPlanProductLimit::resolve($plan);
            DB::table('subscription_plans')
                ->where('id', $plan->id)
                ->update([
                    'max_products' => $resolved,
                    'updated_at' => now(),
                ]);
        }
    }

    public function down(): void
    {
        // Irreversible data migration.
    }
};
