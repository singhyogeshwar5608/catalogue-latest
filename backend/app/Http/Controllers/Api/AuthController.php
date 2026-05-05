<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Support\NextCatalogCacheInvalidate;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTAuth;
use PHPOpenSourceSaver\JWTAuth\Facades\JWTFactory;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        \Log::debug('Register payload', ['raw' => $request->all(), 'content' => $request->getContent()]);
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        $data = $validator->validated();
        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'role' => 'user',
        ]);

        $user->loadMissing('stores');
        $token = JWTAuth::fromUser($user);

        NextCatalogCacheInvalidate::users();

        return $this->successResponse('Registration successful.', [
            'token' => $token,
            'user' => $user,
        ], 201);
    }

    public function login(Request $request)
    {
        $credentials = $request->only(['email', 'password']);

        $validator = Validator::make($credentials, [
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        if (! $token = auth('api')->attempt($credentials)) {
            return $this->errorResponse('Invalid credentials.', 401);
        }

        $user = auth('api')->user()->loadMissing('stores');

        return $this->successResponse('Login successful.', [
            'token' => $token,
            'user' => $user,
        ]);
    }

    public function me(Request $request)
    {
        return $this->successResponse('Authenticated user.', $request->user()->loadMissing('stores'));
    }

    public function logout()
    {
        auth('api')->logout();

        return $this->successResponse('Logged out successfully.');
    }

    /**
     * Change password for password-based accounts. Requires correct current_password.
     */
    public function updatePassword(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'current_password' => 'required|string',
            'password' => 'required|string|min:8|confirmed',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed.', 422, $validator->errors());
        }

        /** @var User $user */
        $user = $request->user();

        if (! Hash::check($validator->validated()['current_password'], $user->getAuthPassword())) {
            return $this->errorResponse('Current password is incorrect.', 422, [
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->password = $validator->validated()['password'];
        $user->save();

        return $this->successResponse('Password updated successfully.');
    }

    public function googleRedirect(Request $request): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            abort(503, 'Google OAuth is not configured.');
        }

        $redirectPath = $this->sanitizeRedirectPath($request->query('redirect'));
        $state = (string) Str::uuid();

        Cache::put($this->stateCacheKey($state), [
            'redirect' => $redirectPath,
        ], now()->addMinutes(10));

        return Socialite::driver('google')
            ->scopes(['openid', 'profile', 'email'])
            ->with(['prompt' => 'select_account', 'state' => $state])
            ->stateless()
            ->redirect();
    }

    public function googleCallback(Request $request): RedirectResponse
    {
        if (! $this->googleIsConfigured()) {
            abort(503, 'Google OAuth is not configured.');
        }

        $statePayload = $request->filled('state')
            ? Cache::pull($this->stateCacheKey($request->input('state')))
            : null;
        $redirectPath = $statePayload['redirect'] ?? null;

        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (Throwable $exception) {
            \Log::error('Google OAuth failed', ['message' => $exception->getMessage()]);
            return $this->redirectWithError('google_auth_failed', $redirectPath);
        }

        $email = $googleUser->getEmail();

        if (! $email) {
            return $this->redirectWithError('google_email_missing', $redirectPath);
        }

        $user = User::where('google_id', $googleUser->getId())
            ->orWhere('email', $email)
            ->first();

        if (! $user) {
            $user = User::create([
                'name' => $googleUser->getName() ?: $googleUser->getNickname() ?: 'Store Owner',
                'email' => $email,
                'google_id' => $googleUser->getId(),
                'avatar_url' => $googleUser->getAvatar(),
                'password' => Hash::make(Str::random(32)),
                'role' => 'user',
            ]);
        } else {
            $shouldUpdate = false;

            if (! $user->google_id) {
                $user->google_id = $googleUser->getId();
                $shouldUpdate = true;
            }

            if (! $user->avatar_url && $googleUser->getAvatar()) {
                $user->avatar_url = $googleUser->getAvatar();
                $shouldUpdate = true;
            }

            if ($shouldUpdate) {
                $user->save();
            }
        }

        $user->loadMissing('stores');
        $token = JWTAuth::fromUser($user);

        NextCatalogCacheInvalidate::users();

        return $this->redirectWithToken($token, $redirectPath);
    }

    private function googleIsConfigured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    private function sanitizeRedirectPath(?string $redirect): ?string
    {
        if (! $redirect) {
            return null;
        }

        $redirect = trim($redirect);

        if (! str_starts_with($redirect, '/')) {
            return null;
        }

        if (str_starts_with($redirect, '//')) {
            return null;
        }

        return $redirect;
    }

    private function redirectWithToken(string $token, ?string $redirectPath = null): RedirectResponse
    {
        $query = array_filter([
            'provider' => 'google',
            'token' => $token,
            'redirect' => $redirectPath,
        ], fn ($value) => $value !== null);

        return redirect()->away($this->buildFrontendAuthUrl($query));
    }

    private function redirectWithError(string $errorCode, ?string $redirectPath = null): RedirectResponse
    {
        $query = array_filter([
            'provider' => 'google',
            'error' => $errorCode,
            'redirect' => $redirectPath,
        ], fn ($value) => $value !== null);

        return redirect()->away($this->buildFrontendAuthUrl($query));
    }

    private function buildFrontendAuthUrl(array $queryParams): string
    {
        $frontend = rtrim(config('app.frontend_url', config('app.url', 'http://localhost')), '/');
        $path = '/auth';
        $query = http_build_query($queryParams);

        return $frontend.$path.($query ? '?'.$query : '');
    }

    private function stateCacheKey(string $state): string
    {
        return 'google_oauth_state_'.$state;
    }
}
