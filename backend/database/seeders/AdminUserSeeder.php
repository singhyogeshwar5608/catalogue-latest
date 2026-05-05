<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class AdminUserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Check if admin user already exists
        $existingAdmin = DB::table('users')->where('email', 'admin@test.com')->first();
        
        if (!$existingAdmin) {
            DB::table('users')->insert([
                'name' => 'Super Admin',
                'email' => 'admin@test.com',
                'password' => Hash::make('admin123'),
                'role' => 'super_admin',
                'email_verified_at' => Carbon::now(),
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        } else {
            // Update existing admin user
            DB::table('users')
                ->where('email', 'admin@test.com')
                ->update([
                    'password' => Hash::make('admin123'),
                    'role' => 'super_admin',
                    'updated_at' => Carbon::now(),
                ]);
        }
    }
}
