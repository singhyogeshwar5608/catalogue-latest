<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StoreSubscriptionInquiry;
use Illuminate\Http\Request;

class AdminStoreSubscriptionInquiryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user === null) {
            return $this->errorResponse('Unauthorized.', 401);
        }

        if ($user->role !== 'super_admin') {
            return $this->errorResponse('Forbidden.', 403);
        }

        $perPage = max(1, min(50, (int) $request->integer('per_page', 20)));

        $paginator = StoreSubscriptionInquiry::query()
            ->with([
                'store' => function ($q) {
                    $q->select(['id', 'user_id', 'name', 'username', 'location', 'phone', 'email', 'state', 'district']);
                },
                'plan' => function ($q) {
                    $q->select(['id', 'name', 'slug', 'price', 'billing_cycle', 'duration_days']);
                },
            ])
            ->orderByDesc('id')
            ->paginate($perPage);

        return $this->successResponse('Subscription inquiries retrieved.', [
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

