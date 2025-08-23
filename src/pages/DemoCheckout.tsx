import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, Building, Lock, CheckCircle, XCircle } from 'lucide-react';

export default function DemoCheckout() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [session, setSession] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null);
  
  // Card form state
  const [cardNumber, setCardNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  
  // Bank form state
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    if (!sessionId) {
      navigate('/');
      return;
    }

    const { data: sessionData } = await supabase
      .from('payment_sessions')
      .select(`
        *,
        merchants (
          business_name,
          website_url
        )
      `)
      .eq('id', sessionId)
      .single();

    if (!sessionData) {
      toast({ title: "Error", description: "Payment session not found", variant: "destructive" });
      navigate('/');
      return;
    }

    if (sessionData.status !== 'requires_payment_method') {
      toast({ title: "Error", description: "Payment session is no longer valid", variant: "destructive" });
      navigate('/');
      return;
    }

    if (new Date(sessionData.expires_at) < new Date()) {
      toast({ title: "Error", description: "Payment session has expired", variant: "destructive" });
      navigate('/');
      return;
    }

    setSession(sessionData);
    setMerchant(sessionData.merchants);
    setLoading(false);
  };

  const validateCard = (number) => {
    // Luhn algorithm
    const digits = number.replace(/\D/g, '');
    let sum = 0;
    let isEven = false;
    
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits[i]);
      
      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }
      
      sum += digit;
      isEven = !isEven;
    }
    
    return sum % 10 === 0;
  };

  const processPayment = async (method, paymentData) => {
    setProcessing(true);

    try {
      // Update session status to processing
      await supabase
        .from('payment_sessions')
        .update({ status: 'processing' })
        .eq('id', sessionId);

      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      let success = false;
      let failureReason = null;
      let maskedDetails = '';

      if (method === 'card') {
        const cardNumber = paymentData.number.replace(/\D/g, '');
        maskedDetails = `**** **** **** ${cardNumber.slice(-4)}`;
        
        // Test card rules
        if (cardNumber === '4242424242424242') {
          success = true;
        } else if (cardNumber === '4000000000000002') {
          success = false;
          failureReason = 'generic_decline';
        } else if (cardNumber === '4000000000009995') {
          success = false;
          failureReason = 'insufficient_funds';
        } else if (validateCard(cardNumber)) {
          // 80% success rate for valid cards
          success = Math.random() < 0.8;
          if (!success) {
            failureReason = 'generic_decline';
          }
        } else {
          success = false;
          failureReason = 'invalid_card_number';
        }
      } else if (method === 'bank') {
        maskedDetails = `****${paymentData.account.slice(-4)} (${paymentData.routing})`;
        
        // Test bank rules
        if (paymentData.routing === '110000000' && paymentData.account === '000123456789') {
          success = true;
        } else if (paymentData.routing === '000000000') {
          success = false;
          failureReason = 'invalid_routing_number';
        } else {
          success = Math.random() < 0.9; // 90% success for other valid combinations
          if (!success) {
            failureReason = 'insufficient_funds';
          }
        }
      }

      // Calculate fees
      const feePercentage = 2.5; // 2.5%
      const feeFixed = 30; // $0.30
      const feeAmount = Math.round((session.amount * feePercentage / 100) + feeFixed);
      const netAmount = session.amount - feeAmount;

      // Create payment record
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          session_id: sessionId,
          merchant_id: session.merchant_id,
          amount: session.amount,
          currency: session.currency,
          method,
          masked_details: maskedDetails,
          status: success ? 'succeeded' : 'failed',
          failure_reason: failureReason,
          fee_amount: success ? feeAmount : 0,
          net_amount: success ? netAmount : 0
        })
        .select()
        .single();

      if (paymentError) throw paymentError;

      // Update session status
      await supabase
        .from('payment_sessions')
        .update({ status: success ? 'succeeded' : 'failed' })
        .eq('id', sessionId);

      // Check for fraud (high value transactions)
      if (success && session.amount > 100000) { // $1000+
        await supabase
          .from('fraud_flags')
          .insert({
            payment_id: payment.id,
            reason: 'high_value_transaction',
            score: 85
          });
      }

      // Trigger webhook (in a real system, this would be handled by a background job)
      triggerWebhook(payment, success ? 'payment.succeeded' : 'payment.failed');

      setPaymentResult({
        success,
        payment,
        failureReason
      });

    } catch (error) {
      console.error('Payment processing error:', error);
      toast({ 
        title: "Error", 
        description: "Payment processing failed. Please try again.", 
        variant: "destructive" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const triggerWebhook = async (payment, eventType) => {
    try {
      const { data: endpoints } = await supabase
        .from('webhook_endpoints')
        .select('*')
        .eq('merchant_id', session.merchant_id)
        .eq('active', true);

      for (const endpoint of endpoints || []) {
        const eventPayload = {
          id: `evt_${Math.random().toString(36).substr(2, 16)}`,
          type: eventType,
          created: Math.floor(Date.now() / 1000),
          data: {
            object: payment
          }
        };

        // Store webhook event
        await supabase
          .from('webhook_events')
          .insert({
            merchant_id: session.merchant_id,
            type: eventType,
            payload: eventPayload,
            delivery_status: 'pending'
          });

        // In a real system, you would send the webhook here
        console.log(`Webhook ${eventType} triggered for ${endpoint.url}`, eventPayload);
      }
    } catch (error) {
      console.error('Webhook trigger error:', error);
    }
  };

  const handleCardPayment = async (e) => {
    e.preventDefault();
    
    if (!cardNumber || !expMonth || !expYear || !cvc) {
      toast({ title: "Error", description: "Please fill in all card details", variant: "destructive" });
      return;
    }

    await processPayment('card', {
      number: cardNumber,
      expMonth: parseInt(expMonth),
      expYear: parseInt(expYear),
      cvc
    });
  };

  const handleBankPayment = async (e) => {
    e.preventDefault();
    
    if (!routingNumber || !accountNumber) {
      toast({ title: "Error", description: "Please fill in all bank details", variant: "destructive" });
      return;
    }

    await processPayment('bank', {
      routing: routingNumber,
      account: accountNumber
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    const groups = digits.match(/.{1,4}/g) || [];
    return groups.join(' ').substr(0, 19);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (paymentResult) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            {paymentResult.success ? (
              <>
                <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
                <CardTitle className="text-success">Payment Successful!</CardTitle>
                <CardDescription>
                  Your payment of {formatCurrency(session.amount)} has been processed successfully.
                </CardDescription>
              </>
            ) : (
              <>
                <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                <CardTitle className="text-destructive">Payment Failed</CardTitle>
                <CardDescription>
                  Your payment could not be processed. Reason: {paymentResult.failureReason}
                </CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-center text-sm text-muted-foreground">
                Transaction ID: {paymentResult.payment?.id?.slice(0, 8)}...
              </div>
              <Button 
                className="w-full" 
                onClick={() => window.close()}
                variant={paymentResult.success ? 'success' : 'outline'}
              >
                Close
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Lock className="w-5 h-5 text-success" />
            <div>
              <h1 className="font-semibold">Secure Checkout</h1>
              <p className="text-sm text-muted-foreground">Powered by PaymentGateway</p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5" />
                {merchant?.business_name}
              </CardTitle>
              <CardDescription>{session?.description || 'Payment'}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center text-lg font-semibold">
                <span>Total:</span>
                <span>{formatCurrency(session?.amount || 0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Test Data Info */}
          <Card className="border-warning bg-warning/5">
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Test Payment Data
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Test Cards:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>4242 4242 4242 4242 - Always succeeds</li>
                <li>4000 0000 0000 0002 - Always fails (decline)</li>
                <li>4000 0000 0000 9995 - Insufficient funds</li>
              </ul>
              <p><strong>Test Bank:</strong></p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Routing: 110000000, Account: 000123456789 - Success</li>
                <li>Routing: 000000000 - Always fails</li>
              </ul>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>Choose how you'd like to pay</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="card" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="card">Credit Card</TabsTrigger>
                  <TabsTrigger value="bank">Bank Transfer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="card" className="space-y-4">
                  <form onSubmit={handleCardPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        value={cardNumber}
                        onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                        maxLength={19}
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="expMonth">Month</Label>
                        <Input
                          id="expMonth"
                          placeholder="MM"
                          value={expMonth}
                          onChange={(e) => setExpMonth(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          maxLength={2}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="expYear">Year</Label>
                        <Input
                          id="expYear"
                          placeholder="YY"
                          value={expYear}
                          onChange={(e) => setExpYear(e.target.value.replace(/\D/g, '').slice(0, 2))}
                          maxLength={2}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          value={cvc}
                          onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 3))}
                          maxLength={3}
                          required
                        />
                      </div>
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={processing}
                      variant="success"
                    >
                      {processing ? 'Processing...' : `Pay ${formatCurrency(session?.amount || 0)}`}
                    </Button>
                  </form>
                </TabsContent>
                
                <TabsContent value="bank" className="space-y-4">
                  <form onSubmit={handleBankPayment} className="space-y-4">
                    <div>
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        placeholder="110000000"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        maxLength={9}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        placeholder="000123456789"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 17))}
                        maxLength={17}
                        required
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full" 
                      size="lg"
                      disabled={processing}
                      variant="success"
                    >
                      {processing ? 'Processing...' : `Pay ${formatCurrency(session?.amount || 0)}`}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>🔒 Your payment information is secure and encrypted</p>
          </div>
        </div>
      </div>
    </div>
  );
}