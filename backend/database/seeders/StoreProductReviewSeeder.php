<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Product;
use App\Models\Review;
use App\Models\Service;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class StoreProductReviewSeeder extends Seeder
{
    public function run(): void
    {
        Schema::disableForeignKeyConstraints();
        Review::truncate();
        Product::truncate();
        Store::truncate();
        Category::truncate();
        Schema::enableForeignKeyConstraints();

        // User::whereNotNull('store_slug')->delete(); // Commented out - store_slug column doesn't exist

        $categoryDefinitions = [
            ['name' => 'Fashion & Apparel', 'business_type' => 'product'],
            ['name' => 'Jewellery & Accessories', 'business_type' => 'product'],
            ['name' => 'Footwear', 'business_type' => 'product'],
            ['name' => 'Bags & Luggage', 'business_type' => 'product'],
            ['name' => 'Electronics & Gadgets', 'business_type' => 'product'],
            ['name' => 'Mobile & Accessories', 'business_type' => 'product'],
            ['name' => 'Computers & IT Products', 'business_type' => 'product'],
            ['name' => 'Home & Kitchen', 'business_type' => 'product'],
            ['name' => 'Furniture', 'business_type' => 'product'],
            ['name' => 'Home Decor', 'business_type' => 'product'],
            ['name' => 'Beauty & Personal Care', 'business_type' => 'product'],
            ['name' => 'Health & Medical', 'business_type' => 'product'],
            ['name' => 'Grocery & FMCG', 'business_type' => 'product'],
            ['name' => 'Food & Beverages', 'business_type' => 'product'],
            ['name' => 'Baby & Kids Essentials', 'business_type' => 'product'],
            ['name' => 'Toys & Games', 'business_type' => 'product'],
            ['name' => 'Books & Education', 'business_type' => 'product'],
            ['name' => 'Sports & Fitness', 'business_type' => 'product'],
            ['name' => 'Automobile', 'business_type' => 'product'],
            ['name' => 'Auto Parts & Accessories', 'business_type' => 'product'],
            ['name' => 'Industrial & Machinery', 'business_type' => 'product'],
            ['name' => 'Tools & Hardware', 'business_type' => 'product'],
            ['name' => 'Agriculture & Farming', 'business_type' => 'product'],
            ['name' => 'Construction & Building Material', 'business_type' => 'product'],
            ['name' => 'Pets & Pet Supplies', 'business_type' => 'product'],
            ['name' => 'Handmade & Craft', 'business_type' => 'product'],
            ['name' => 'Office Supplies & Stationery', 'business_type' => 'product'],
            ['name' => 'Real Estate', 'business_type' => 'service'],
            ['name' => 'Travel & Tourism', 'business_type' => 'service'],
            ['name' => 'Services (All Professional & Local Services)', 'business_type' => 'service'],
        ];

        $categoryMap = [];
        foreach ($categoryDefinitions as $definition) {
            $categoryMap[$definition['name']] = Category::updateOrCreate(
                ['name' => $definition['name']],
                [
                    'business_type' => $definition['business_type'],
                    'is_active' => true,
                    'slug' => Str::slug($definition['name']),
                ]
            );
        }

        $storeNameSuffixes = ['Collective', 'Gallery', 'Bazaar', 'Boutique', 'Hub', 'Depot', 'Atelier'];
        $storeIntros = [
            'Curated collections from India’s best makers.',
            'Signature picks tailored for modern shoppers.',
            'Independent brands carefully vetted by our team.',
            'Artisanal quality with nationwide delivery.',
        ];
        $locations = ['Delhi', 'Mumbai', 'Bengaluru', 'Hyderabad', 'Pune', 'Chennai', 'Ahmedabad', 'Jaipur', 'Kolkata'];
        $reviewPool = [
            ['name' => 'Aditi Sharma', 'comment' => 'Fantastic quality and very prompt service!'],
            ['name' => 'Rahul Verma', 'comment' => 'Products arrived quickly and were well packed.'],
            ['name' => 'Meera Nair', 'comment' => 'Great curation, I found exactly what I needed.'],
            ['name' => 'Arjun Patel', 'comment' => 'Customer support was super helpful throughout.'],
        ];

        $storeCounter = 1;

        foreach ($categoryDefinitions as $definition) {
            $category = $categoryMap[$definition['name']];
            $storeTarget = $definition['business_type'] === 'service' ? 3 : 4;

            for ($i = 1; $i <= $storeTarget; $i++, $storeCounter++) {
                $suffix = $storeNameSuffixes[$storeCounter % count($storeNameSuffixes)];
                $storeName = trim($definition['name'] . ' ' . $suffix);
                $slugBase = Str::slug($storeName);
                $slug = $slugBase . '-' . $storeCounter;
                $email = $slug . '@demo.test';
                $phoneNumber = '+91' . random_int(70000, 99999) . random_int(10000, 99999);
                $location = $locations[$storeCounter % count($locations)];
                $bannerKeyword = Str::slug($definition['name'], '+');

                $user = User::updateOrCreate(
                    ['email' => $email],
                    [
                        'name' => $storeName . ' Owner',
                        'password' => Hash::make('password'),
                        'role' => 'user',
                        'phone' => $phoneNumber,
                    ]
                );

                $store = Store::updateOrCreate(
                    ['slug' => $slug],
                    [
                        'user_id' => $user->id,
                        'category_id' => $category->id,
                        'name' => $storeName,
                        'logo' => "https://source.unsplash.com/seed/{$slug}-logo/200x200?logo,{$bannerKeyword}",
                        'banner' => "https://source.unsplash.com/seed/{$slug}-banner/1200x400?{$bannerKeyword}",
                        'phone' => $phoneNumber,
                        'whatsapp' => $phoneNumber,
                        'address' => $location,
                        'location' => $location,
                        'description' => $storeIntros[$storeCounter % count($storeIntros)],
                        'short_description' => $definition['name'] . ' specialists',
                        'layout_type' => $definition['business_type'] === 'service' ? 'layout2' : 'layout1',
                        'theme' => $definition['business_type'] === 'service' ? 'service-default' : 'product-default',
                        'rating' => random_int(45, 50) / 10,
                        'total_reviews' => random_int(40, 250),
                        'is_verified' => $storeCounter % 2 === 0,
                        'is_boosted' => $storeCounter % 3 === 0,
                        'boost_expiry_date' => now()->addMonths(2),
                        'is_active' => true,
                    ]
                );

                // $user->forceFill(['store_slug' => $store->slug])->save(); // Commented out - store_slug column doesn't exist

                if ($definition['business_type'] === 'service') {
                    for ($s = 1; $s <= 3; $s++) {
                        $serviceTitle = $definition['name'] . ' ' . ['Consultation', 'Package', 'Program'][$s % 3] . " {$s}";
                        Service::updateOrCreate(
                            [
                                'store_id' => $store->id,
                                'title' => $serviceTitle,
                            ],
                            [
                                'price' => random_int(2000, 15000),
                                'description' => 'Tailored ' . strtolower($definition['name']) . ' service with full support.',
                                'image' => "https://source.unsplash.com/seed/{$slug}-service-{$s}/960x720?{$bannerKeyword},team",
                                'is_active' => true,
                            ]
                        );
                    }
                } else {
                    for ($p = 1; $p <= 3; $p++) {
                        $productTitle = $definition['name'] . ' ' . ['Signature', 'Select', 'Premium'][$p - 1] . " {$p}";
                        Product::updateOrCreate(
                            [
                                'store_id' => $store->id,
                                'title' => $productTitle,
                            ],
                            [
                                'price' => random_int(500, 15000),
                                'original_price' => random_int(1500, 20000),
                                'category' => $definition['name'],
                                'image' => "https://source.unsplash.com/seed/{$slug}-product-{$p}/640x640?{$bannerKeyword}",
                                'images' => ["https://source.unsplash.com/seed/{$slug}-product-alt-{$p}/640x640?{$bannerKeyword},style"],
                                'description' => 'Premium ' . strtolower($definition['name']) . ' curated for modern shoppers.',
                                'rating' => random_int(40, 50) / 10,
                                'total_reviews' => random_int(10, 80),
                                'is_active' => true,
                            ]
                        );
                    }
                }

                foreach (array_rand($reviewPool, 2) as $reviewIndex) {
                    $review = $reviewPool[$reviewIndex];
                    Review::updateOrCreate(
                        [
                            'store_id' => $store->id,
                            'user_name' => $review['name'],
                            'comment' => $review['comment'],
                        ],
                        [
                            'rating' => random_int(45, 50) / 10,
                            'reviewed_at' => now()->subDays(random_int(1, 120)),
                            'seller_reply' => null,
                            'is_approved' => true,
                        ]
                    );
                }
            }
        }
    }
}
