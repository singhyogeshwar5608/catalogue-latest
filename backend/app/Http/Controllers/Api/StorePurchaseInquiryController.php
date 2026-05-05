<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Store;
use App\Models\StorePurchaseInquiry;
use Illuminate\Http\Request;

class StorePurchaseInquiryController extends Controller
{
    public function index(Request $request, Store $store)
    {
        $user = $request->user();
        if ($user === null) {
            return $this->errorResponse('Unauthorized.', 401);
        }

        if ((int) $store->user_id !== (int) $user->id) {
            return $this->errorResponse('You can only view orders for your own store.', 403);
        }

        $perPage = max(1, min(50, (int) $request->integer('per_page', 20)));

        $paginator = StorePurchaseInquiry::query()
            ->where('store_id', $store->id)
            ->with(['product' => function ($q) {
                $q->select(['id', 'store_id', 'title', 'image', 'price']);
            }])
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->successResponse('Purchase inquiries retrieved.', [
            'data' => $paginator->items(),
            'pagination' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
