<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;

abstract class Controller
{
    protected function successResponse(string $message, mixed $data = null, int $status = 200): JsonResponse
    {
        $flags = JSON_INVALID_UTF8_SUBSTITUTE;
        if (defined('JSON_PARTIAL_OUTPUT_ON_ERROR')) {
            $flags |= JSON_PARTIAL_OUTPUT_ON_ERROR;
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status, [], $flags);
    }

    protected function errorResponse(string $message, int $status = 400, mixed $data = null): JsonResponse
    {
        $flags = JSON_INVALID_UTF8_SUBSTITUTE;
        if (defined('JSON_PARTIAL_OUTPUT_ON_ERROR')) {
            $flags |= JSON_PARTIAL_OUTPUT_ON_ERROR;
        }

        return response()->json([
            'success' => false,
            'message' => $message,
            'data' => $data,
        ], $status, [], $flags);
    }
}
