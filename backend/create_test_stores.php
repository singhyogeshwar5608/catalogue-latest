<?php

require_once 'vendor/autoload.php';

use App\Models\User;
use App\Models\Store;
use App\Models\Category;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Creating test stores...\n";

try {
    // Create multiple test users for different stores
    $users = [];
    for ($i = 1; $i <= 5; $i++) {
        $user = User::updateOrCreate(
            ['email' => "test{$i}@example.com"],
            [
                'name' => "Test User {$i}",
                'password' => bcrypt('password')
            ]
        );
        $users[] = $user;
        echo "User created with ID: " . $user->id . "\n";
    }

    // Create categories
    $categories = [
        ['name' => 'Electronics', 'slug' => 'electronics', 'business_type' => 'product'],
        ['name' => 'Fashion', 'slug' => 'fashion', 'business_type' => 'product'],
        ['name' => 'Food', 'slug' => 'food', 'business_type' => 'product'],
    ];

    $categoryIds = [];
    foreach ($categories as $cat) {
        $category = Category::updateOrCreate(
            ['slug' => $cat['slug']],
            $cat
        );
        $categoryIds[] = $category->id;
        echo "Category created: " . $category->name . " (ID: " . $category->id . ")\n";
    }

    // Create test stores with different locations and users
    $stores = [
        [
            'user_id' => $users[0]->id,
            'name' => 'Delhi Electronics Hub',
            'slug' => 'delhi-electronics-hub',
            'username' => 'delhi-electronics',
            'category_id' => $categoryIds[0],
            'location' => 'Delhi',
            'latitude' => 28.6139,
            'longitude' => 77.2090,
            'description' => 'Electronics store in Delhi',
            'is_active' => true,
            'is_verified' => true,
            'is_boosted' => true,
        ],
        [
            'user_id' => $users[1]->id,
            'name' => 'Mumbai Fashion Store',
            'slug' => 'mumbai-fashion-store',
            'username' => 'mumbai-fashion',
            'category_id' => $categoryIds[1],
            'location' => 'Mumbai',
            'latitude' => 19.0760,
            'longitude' => 72.8777,
            'description' => 'Fashion store in Mumbai',
            'is_active' => true,
            'is_verified' => true,
            'is_boosted' => false,
        ],
        [
            'user_id' => $users[2]->id,
            'name' => 'Bangalore Food Corner',
            'slug' => 'bangalore-food-corner',
            'username' => 'bangalore-food',
            'category_id' => $categoryIds[2],
            'location' => 'Bangalore',
            'latitude' => 12.9716,
            'longitude' => 77.5946,
            'description' => 'Food store in Bangalore',
            'is_active' => true,
            'is_verified' => false,
            'is_boosted' => false,
        ],
        [
            'user_id' => $users[3]->id,
            'name' => 'Chennai Tech Store',
            'slug' => 'chennai-tech-store',
            'username' => 'chennai-tech',
            'category_id' => $categoryIds[0],
            'location' => 'Chennai',
            'latitude' => 13.0827,
            'longitude' => 80.2707,
            'description' => 'Tech store in Chennai',
            'is_active' => true,
            'is_verified' => true,
            'is_boosted' => false,
        ],
        [
            'user_id' => $users[4]->id,
            'name' => 'Kolkata Fashion Hub',
            'slug' => 'kolkata-fashion-hub',
            'username' => 'kolkata-fashion',
            'category_id' => $categoryIds[1],
            'location' => 'Kolkata',
            'latitude' => 22.5726,
            'longitude' => 88.3639,
            'description' => 'Fashion store in Kolkata',
            'is_active' => true,
            'is_verified' => false,
            'is_boosted' => false,
        ],
    ];

    foreach ($stores as $storeData) {
        $store = Store::updateOrCreate(
            ['slug' => $storeData['slug']],
            $storeData
        );
        echo "Store created: " . $store->name . " in " . $store->location . " (ID: " . $store->id . ")\n";
    }

    echo "\nTotal stores created: " . count($stores) . "\n";
    echo "Test stores created successfully!\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
