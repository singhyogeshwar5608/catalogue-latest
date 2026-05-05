<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class CreateAdminUserSeeder extends Seeder
{
    public function run()
    {
        // Check if admin user already exists
        $existingUser = User::where('email', 'admin@catelog.com')->first();
        
        if ($existingUser) {
            echo "Admin user already exists: " . $existingUser->email . "\n";
            return;
        }
        
        // Create admin user
        $user = User::create([
            'name' => 'Admin User',
            'email' => 'admin@catelog.com',
            'password' => Hash::make('admin123'),
            'role' => 'super_admin',
            'email_verified_at' => now(),
        ]);
        
        echo "Admin user created successfully: " . $user->email . "\n";
        echo "Login credentials:\n";
        echo "Email: admin@catelog.com\n";
        echo "Password: admin123\n";
    }
}
