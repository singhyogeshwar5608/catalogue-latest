<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Store;
use App\Models\Category;
use App\Models\User;
use Illuminate\Support\Str;

class SampleStoresSeeder extends Seeder
{
    public function run()
    {
        $categories = Category::pluck('id')->toArray();
        $adminUser = User::where('email', 'admin@catelog.com')->first();
        
        $sampleStores = [
            [
                'name' => 'Kaushal Construction Materials',
                'slug' => 'kaushal-construction-materials',
                'username' => 'kaushal-construction',
                'email' => 'construction@kaushal.com',
                'phone' => '+919876543210',
                'address' => '123 Main Street, Delhi',
                'location' => 'Delhi',
                'latitude' => 28.6139,
                'longitude' => 77.2090,
                'description' => 'Premium construction materials and building supplies',
                'category_id' => $categories[0] ?? 1,
                'user_id' => $adminUser?->id ?? 1,
                'is_active' => true,
                'is_verified' => true,
                'is_boosted' => true,
            ],
            [
                'name' => 'Pet Paradise Store',
                'slug' => 'pet-paradise-store',
                'username' => 'pet-paradise',
                'email' => 'pets@petparadise.com',
                'phone' => '+919876543211',
                'address' => '456 Park Avenue, Mumbai',
                'location' => 'Mumbai',
                'latitude' => 19.0760,
                'longitude' => 72.8777,
                'description' => 'Complete pet supplies and accessories',
                'category_id' => $categories[1] ?? 2,
                'user_id' => $adminUser?->id ?? 1,
                'is_active' => true,
                'is_verified' => true,
                'is_boosted' => false,
            ],
            [
                'name' => 'Farmers Agricultural Hub',
                'slug' => 'farmers-agricultural-hub',
                'username' => 'farmers-hub',
                'email' => 'agriculture@farmershub.com',
                'phone' => '+919876543212',
                'address' => '789 Rural Road, Pune',
                'location' => 'Pune',
                'latitude' => 18.5204,
                'longitude' => 73.8567,
                'description' => 'Agricultural equipment and farming supplies',
                'category_id' => $categories[2] ?? 3,
                'user_id' => $adminUser?->id ?? 1,
                'is_active' => true,
                'is_verified' => false,
                'is_boosted' => false,
            ],
        ];

        foreach ($sampleStores as $store) {
            Store::updateOrCreate(
                ['username' => $store['username']],
                $store
            );
        }

        echo "Sample stores created successfully!\n";
    }
}
