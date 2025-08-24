-- Create proper seed data for testing
-- First, let's ensure we have the necessary triggers
CREATE OR REPLACE TRIGGER handle_new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Insert default admin user if not exists
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Check if admin user exists
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = 'admin@gateway.com';
    
    -- If admin doesn't exist, we'll create the profile manually
    -- Note: The actual user creation should be done through Supabase Auth UI
    -- This just ensures the profile exists if the user is created
    
    -- Insert admin profile if not exists
    INSERT INTO public.profiles (user_id, email, role)
    SELECT 
        '00000000-0000-0000-0000-000000000001'::uuid,
        'admin@gateway.com',
        'admin'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = 'admin@gateway.com' AND role = 'admin'
    );
    
    -- Create test merchants
    INSERT INTO public.profiles (user_id, email, role)
    SELECT 
        '00000000-0000-0000-0000-000000000002'::uuid,
        'merchant1@example.com',
        'merchant'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = 'merchant1@example.com'
    );
    
    INSERT INTO public.profiles (user_id, email, role)
    SELECT 
        '00000000-0000-0000-0000-000000000003'::uuid,
        'merchant2@example.com',
        'merchant'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE email = 'merchant2@example.com'
    );
    
    -- Create merchant records
    INSERT INTO public.merchants (id, user_id, business_name, contact_email, status, website_url)
    SELECT 
        '00000000-0000-0000-0000-000000000011'::uuid,
        '00000000-0000-0000-0000-000000000002'::uuid,
        'Alpha Commerce',
        'merchant1@example.com',
        'approved',
        'https://alpha-commerce.com'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE user_id = '00000000-0000-0000-0000-000000000002'::uuid
    );
    
    INSERT INTO public.merchants (id, user_id, business_name, contact_email, status, website_url)
    SELECT 
        '00000000-0000-0000-0000-000000000012'::uuid,
        '00000000-0000-0000-0000-000000000003'::uuid,
        'Beta Store',
        'merchant2@example.com',
        'pending',
        'https://beta-store.com'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.merchants 
        WHERE user_id = '00000000-0000-0000-0000-000000000003'::uuid
    );
    
    -- Create API keys for approved merchant
    INSERT INTO public.api_keys (id, merchant_id, name, public_key, secret_key_hash, active)
    SELECT 
        '00000000-0000-0000-0000-000000000021'::uuid,
        '00000000-0000-0000-0000-000000000011'::uuid,
        'Production Key',
        'pk_test_alpha_' || encode(gen_random_bytes(16), 'hex'),
        crypt('sk_test_alpha_' || encode(gen_random_bytes(32), 'hex'), gen_salt('bf')),
        true
    WHERE NOT EXISTS (
        SELECT 1 FROM public.api_keys 
        WHERE merchant_id = '00000000-0000-0000-0000-000000000011'::uuid
    );
    
    -- Create sample payment sessions and payments
    INSERT INTO public.payment_sessions (id, merchant_id, amount, currency, description, status)
    SELECT 
        '00000000-0000-0000-0000-000000000031'::uuid,
        '00000000-0000-0000-0000-000000000011'::uuid,
        5000,
        'USD',
        'Test Payment Session',
        'requires_payment_method'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.payment_sessions 
        WHERE id = '00000000-0000-0000-0000-000000000031'::uuid
    );
    
    -- Create sample payments
    INSERT INTO public.payments (id, session_id, merchant_id, amount, currency, status, method, masked_details, fee_amount, net_amount)
    SELECT 
        '00000000-0000-0000-0000-000000000041'::uuid,
        '00000000-0000-0000-0000-000000000031'::uuid,
        '00000000-0000-0000-0000-000000000011'::uuid,
        5000,
        'USD',
        'succeeded',
        'card',
        '**** **** **** 4242',
        155,  -- 2.5% + 30 cents
        4845,
        NOW() - INTERVAL '1 day'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.payments 
        WHERE id = '00000000-0000-0000-0000-000000000041'::uuid
    );
    
    INSERT INTO public.payments (id, session_id, merchant_id, amount, currency, status, method, masked_details, fee_amount, net_amount)
    SELECT 
        '00000000-0000-0000-0000-000000000042'::uuid,
        '00000000-0000-0000-0000-000000000031'::uuid,
        '00000000-0000-0000-0000-000000000011'::uuid,
        10000,
        'USD',
        'failed',
        'card',
        '**** **** **** 0002',
        0,
        0,
        NOW() - INTERVAL '2 hours'
    WHERE NOT EXISTS (
        SELECT 1 FROM public.payments 
        WHERE id = '00000000-0000-0000-0000-000000000042'::uuid
    );
    
END $$;

-- Enable realtime for all tables
ALTER TABLE public.merchants REPLICA IDENTITY FULL;
ALTER TABLE public.payments REPLICA IDENTITY FULL;
ALTER TABLE public.payment_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.fraud_flags REPLICA IDENTITY FULL;
ALTER TABLE public.audit_logs REPLICA IDENTITY FULL;
ALTER TABLE public.platform_settings REPLICA IDENTITY FULL;
ALTER TABLE public.api_keys REPLICA IDENTITY FULL;
ALTER TABLE public.webhook_endpoints REPLICA IDENTITY FULL;
ALTER TABLE public.webhook_events REPLICA IDENTITY FULL;
ALTER TABLE public.settlements REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.merchants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.payment_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.fraud_flags;
ALTER PUBLICATION supabase_realtime ADD TABLE public.audit_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.platform_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.api_keys;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_endpoints;
ALTER PUBLICATION supabase_realtime ADD TABLE public.webhook_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.settlements;