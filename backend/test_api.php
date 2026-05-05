<?php

require_once 'vendor/autoload.php';

use App\Http\Controllers\Api\StoreController;

// Bootstrap Laravel
$app = require_once 'bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "Testing API response for all stores...\n";

// Create a mock request for all stores
$request = new \Illuminate\Http\Request();
$request->merge([
    'limit' => 50
]);

// Create controller instance
$controller = new StoreController();

// Call the listStores method
$response = $controller->listStores($request);

echo "API Response:\n";
echo json_encode($response->getData(), JSON_PRETTY_PRINT) . "\n";

echo "\nTotal stores returned: " . count($response->getData()->data) . "\n";

foreach ($response->getData()->data as $store) {
    echo "Store: " . $store->name . " (ID: " . $store->id . ", Active: " . ($store->is_active ? 'Yes' : 'No') . ")\n";
}

echo "\nDone.\n";
