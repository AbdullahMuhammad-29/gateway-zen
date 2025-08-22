-- Create comprehensive payment gateway schema

-- Add webhook endpoints table for merchant webhook configuration
CREATE TABLE public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  url TEXT NOT NULL,
  secret TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_delivered_at TIMESTAMP WITH TIME ZONE
);

-- Add webhook events table for tracking webhook deliveries
CREATE TABLE public.webhook_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  type TEXT NOT NULL, -- payment.succeeded, payment.failed
  payload JSONB NOT NULL,
  delivery_status TEXT NOT NULL DEFAULT 'pending', -- pending, delivered, failed
  attempt_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  delivered_at TIMESTAMP WITH TIME ZONE
);

-- Add platform settings table for configurable system settings
CREATE TABLE public.platform_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add fraud flags table for fraud detection
CREATE TABLE public.fraud_flags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id UUID NOT NULL,
  reason TEXT NOT NULL,
  score INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add audit logs table for system audit trail
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actor_user_id UUID,
  actor_role TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add settlements table for merchant payouts
CREATE TABLE public.settlements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'queued', -- queued, processing, paid, failed
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 day'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS on all new tables
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fraud_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for webhook_endpoints
CREATE POLICY "Merchants can manage their own webhook endpoints"
ON public.webhook_endpoints
FOR ALL
USING (EXISTS (
  SELECT 1 FROM merchants 
  WHERE merchants.id = webhook_endpoints.merchant_id 
  AND merchants.user_id = auth.uid()
));

CREATE POLICY "Admins can view all webhook endpoints"
ON public.webhook_endpoints
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for webhook_events
CREATE POLICY "Merchants can view their own webhook events"
ON public.webhook_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM merchants 
  WHERE merchants.id = webhook_events.merchant_id 
  AND merchants.user_id = auth.uid()
));

CREATE POLICY "Admins can view all webhook events"
ON public.webhook_events
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for platform_settings
CREATE POLICY "Admins can manage all platform settings"
ON public.platform_settings
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for fraud_flags
CREATE POLICY "Admins can view all fraud flags"
ON public.fraud_flags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

CREATE POLICY "Merchants can view fraud flags for their payments"
ON public.fraud_flags
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM payments p
  JOIN merchants m ON p.merchant_id = m.id
  WHERE p.id = fraud_flags.payment_id
  AND m.user_id = auth.uid()
));

-- Create RLS policies for audit_logs
CREATE POLICY "Admins can view all audit logs"
ON public.audit_logs
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create RLS policies for settlements
CREATE POLICY "Merchants can view their own settlements"
ON public.settlements
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM merchants 
  WHERE merchants.id = settlements.merchant_id 
  AND merchants.user_id = auth.uid()
));

CREATE POLICY "Admins can view all settlements"
ON public.settlements
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = 'admin'
));

-- Create updated_at trigger for settlements
CREATE TRIGGER update_settlements_updated_at
BEFORE UPDATE ON public.settlements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for platform_settings
CREATE TRIGGER update_platform_settings_updated_at
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default platform settings
INSERT INTO public.platform_settings (key, value) VALUES
('fee_percent', '2.5'),
('fee_fixed', '30'),
('fraud_high_value_threshold', '100000');

-- Create indexes for better performance
CREATE INDEX idx_webhook_endpoints_merchant_id ON public.webhook_endpoints(merchant_id);
CREATE INDEX idx_webhook_events_merchant_id ON public.webhook_events(merchant_id);
CREATE INDEX idx_webhook_events_status ON public.webhook_events(delivery_status);
CREATE INDEX idx_fraud_flags_payment_id ON public.fraud_flags(payment_id);
CREATE INDEX idx_audit_logs_actor_user_id ON public.audit_logs(actor_user_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);
CREATE INDEX idx_settlements_merchant_id ON public.settlements(merchant_id);
CREATE INDEX idx_settlements_status ON public.settlements(status);