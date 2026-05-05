<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Service;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

class ServiceController extends Controller
{
    public function store(Request $request)
    {
        $user = $request->user();

        $validator = Validator::make($request->all(), [
            'store_id' => 'required|exists:stores,id',
            'title' => 'required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|string|max:4000000',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();

        $store = Store::where('id', $data['store_id'])
            ->where('user_id', $user->id)
            ->first();

        if (! $store) {
            return $this->errorResponse('You are not authorized to add services to this store.', 403);
        }

        if ($store->isPublicCatalogLocked()) {
            return $this->errorResponse(
                'Your store catalog is paused until you renew your plan. You can still use the dashboard, but new services cannot be added yet.',
                403
            );
        }

        $service = $store->services()->create([
            'title' => $data['title'],
            'price' => $data['price'] ?? null,
            'description' => $data['description'] ?? null,
            'image' => $data['image'] ?? null,
            'is_active' => $data['is_active'] ?? true,
        ]);

        return $this->successResponse('Service created successfully.', $service->fresh());
    }

    public function updateService(Request $request, int $id)
    {
        $service = Service::find($id);

        if (! $service) {
            return $this->errorResponse('Service not found.', 404);
        }

        if ($request->user()->id !== $service->store->user_id) {
            return $this->errorResponse('You are not authorized to update this service.', 403);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|required|string|max:255',
            'price' => 'nullable|numeric|min:0',
            'description' => 'nullable|string',
            'image' => 'nullable|string|max:4000000',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $service->update($validator->validated());

        return $this->successResponse('Service updated successfully.', $service->fresh());
    }

    public function deleteService(Request $request, int $id)
    {
        $service = Service::find($id);

        if (! $service) {
            return $this->errorResponse('Service not found.', 404);
        }

        if ($request->user()->id !== $service->store->user_id) {
            return $this->errorResponse('You are not authorized to delete this service.', 403);
        }

        $service->delete();

        return $this->successResponse('Service deleted successfully.');
    }

    public function getServicesByStore(int $storeId)
    {
        $store = Store::find($storeId);

        if (! $store) {
            return $this->errorResponse('Store not found.', 404);
        }

        $services = $store->services()->orderByDesc('created_at')->get();

        return $this->successResponse('Services retrieved successfully.', $services);
    }

    public function getServiceById(int $id)
    {
        $storeWith = ['store.category'];
        if (Schema::hasTable('store_subscriptions') && Schema::hasTable('subscription_plans')) {
            $storeWith[] = 'store.activeSubscription.plan';
        }

        $service = Service::with($storeWith)->find($id);

        if (! $service) {
            return $this->errorResponse('Service not found.', 404);
        }

        return $this->successResponse('Service retrieved successfully.', $service);
    }
}
