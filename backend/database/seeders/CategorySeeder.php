<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
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

        foreach ($categories as $category) {
            $slug = Str::slug($category['name']);

            Category::updateOrCreate(
                ['name' => $category['name']],
                [
                    'business_type' => $category['business_type'],
                    'is_active' => true,
                    'slug' => $slug,
                ]
            );
        }
    }
}
