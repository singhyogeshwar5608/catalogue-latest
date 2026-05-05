<?php

use Illuminate\Support\Facades\Route;

// API-only deploys often omit views; keep this file so `php artisan` boots on Hostinger.
Route::get('/', function () {
    return response()->json([
        'app' => 'Catalogue API',
        'message' => 'Use /api/v1/v1/... for JSON endpoints.',
    ]);
});
