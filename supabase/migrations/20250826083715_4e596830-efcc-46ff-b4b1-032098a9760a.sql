-- Create a simple admin credentials verification function that doesn't depend on auth.users
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
      'role', 'admin',
      'email', 'admin'
    );
  ELSE
    RETURN json_build_object('success', false, 'error', 'Invalid admin credentials');
  END IF;
END;
$$;