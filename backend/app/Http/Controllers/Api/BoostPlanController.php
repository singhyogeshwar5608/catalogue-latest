<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BoostPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BoostPlanController extends Controller
{
    public function publicIndex()
    {
        $plans = BoostPlan::where('is_active', true)
            ->orderByDesc('priority_weight')
            ->orderByDesc('days')
            ->get();

        return $this->successResponse('Boost plans retrieved successfully.', $plans);
    }

    public function index()
    {
        $plans = BoostPlan::orderByDesc('is_active')
            ->orderByDesc('priority_weight')
            ->get();

        return $this->successResponse('Boost plans retrieved successfully.', $plans);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'days' => 'required|integer|min:1',
            'price' => 'required|integer|min:0',
            'priority_weight' => 'nullable|integer|min:1|max:100',
            'badge_label' => 'nullable|string|max:255',
            'badge_color' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan = BoostPlan::create($validator->validated());

        return $this->successResponse('Boost plan created successfully.', $plan, 201);
    }

    public function update(Request $request, BoostPlan $plan)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'days' => 'sometimes|required|integer|min:1',
            'price' => 'sometimes|required|integer|min:0',
            'priority_weight' => 'nullable|integer|min:1|max:100',
            'badge_label' => 'nullable|string|max:255',
            'badge_color' => 'nullable|string|max:20',
            'is_active' => 'nullable|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $plan->update($validator->validated());

        return $this->successResponse('Boost plan updated successfully.', $plan);
    }

    public function destroy(BoostPlan $plan)
    {
        if ($plan->storeBoosts()->active()->exists()) {
            return $this->errorResponse('Cannot delete plan while active boosts exist.', 409);
        }

        $plan->delete();

        return $this->successResponse('Boost plan deleted successfully.');
    }
}
