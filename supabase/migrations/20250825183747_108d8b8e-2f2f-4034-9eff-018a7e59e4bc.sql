-- Create demo admin user if not exists
-- Note: This creates the user via SQL insert to auth.users which requires special handling
-- In production, use the Supabase dashboard or API to create admin users

-- Create the admin profile if not exists
INSERT INTO public.profiles (user_id, email, role)
SELECT 
  gen_random_uuid(),
  'admin@gateway-zen.com',
  'admin'
WHERE NOT EXISTS (
  SELECT 1 FROM public.profiles WHERE email = 'admin@gateway-zen.com'
);

-- Note: Since we can't directly create auth users via SQL migration,
-- the admin user needs to be created through the Supabase Auth API
-- The profile record above will be ready for when the admin signs up