-- First, let's create the admin user directly in the auth.users table
-- Note: This approach inserts directly but in production you'd want to use Supabase admin functions

-- Insert admin profile with hardcoded admin credentials
INSERT INTO public.profiles (user_id, email, role) 
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'admin',
  'admin'
) ON CONFLICT (user_id) DO UPDATE SET 
  email = 'admin',
  role = 'admin';

-- Create a simple admin verification function for the hardcoded admin
CREATE OR REPLACE FUNCTION public.verify_admin_credentials(input_email text, input_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Simple hardcoded check for admin credentials
  IF input_email = 'admin' AND input_password = 'Admin123' THEN
    RETURN json_build_object(
      'success', true,
      'user_id', '00000000-0000-0000-0000-000000000001',
      'role', 'admin'
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid credentials');
  END IF;
END;
$$;