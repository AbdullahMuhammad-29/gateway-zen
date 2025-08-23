import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get API key from header
    const apiKey = req.headers.get("x-api-key") || req.headers.get("authorization")?.replace("Bearer ", "");
    
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "API key required" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Hash the API key to match database
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashedKey = Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Verify API key and get merchant
    const { data: apiKeyData, error: keyError } = await supabase
      .from('api_keys')
      .select(`
        id,
        merchant_id,
        active,
        merchants (
          id,
          status
        )
      `)
      .eq('secret_key_hash', hashedKey)
      .eq('active', true)
      .single();

    if (keyError || !apiKeyData) {
      return new Response(
        JSON.stringify({ error: "Invalid API key" }),
        { 
          status: 401, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    if (apiKeyData.merchants.status !== 'approved') {
      return new Response(
        JSON.stringify({ error: "Merchant account not approved" }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Update API key last used
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    // Parse request body
    const { 
      amount, 
      currency = 'USD', 
      description = '', 
      metadata = {},
      return_url,
      cancel_url 
    } = await req.json();

    // Validate required fields
    if (!amount || amount <= 0) {
      return new Response(
        JSON.stringify({ error: "Valid amount is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Create payment session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    const { data: session, error: sessionError } = await supabase
      .from('payment_sessions')
      .insert({
        id: sessionId,
        merchant_id: apiKeyData.merchant_id,
        amount: Math.round(amount), // Ensure integer (cents)
        currency: currency.toUpperCase(),
        description,
        metadata,
        expires_at: expiresAt.toISOString(),
        status: 'requires_payment_method'
      })
      .select()
      .single();

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(
        JSON.stringify({ error: "Failed to create payment session" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Generate hosted checkout URL
    const hostedUrl = `${req.headers.get("origin") || "http://localhost:5173"}/checkout/${sessionId}`;
    const widgetToken = `wt_${Math.random().toString(36).substr(2, 16)}`;

    return new Response(
      JSON.stringify({
        id: sessionId,
        hosted_url: hostedUrl,
        widget_token: widgetToken,
        amount: session.amount,
        currency: session.currency,
        status: session.status,
        expires_at: session.expires_at
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});