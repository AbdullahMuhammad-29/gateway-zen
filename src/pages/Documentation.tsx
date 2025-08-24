import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function Documentation() {
  const { toast } = useToast();

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Code copied to clipboard" });
  };

  const CodeBlock = ({ children, language = 'javascript' }) => (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
        <code>{children}</code>
      </pre>
      <Button
        size="sm"
        variant="outline"
        className="absolute top-2 right-2"
        onClick={() => copyToClipboard(children)}
      >
        <Copy className="w-4 h-4" />
      </Button>
    </div>
  );

  const EndpointCard = ({ method, path, description, children }: {
    method: string;
    path: string;
    description: string;
    children: React.ReactNode;
  }) => (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Badge variant={method === 'GET' ? 'secondary' as const : method === 'POST' ? 'success' as const : 'warning' as const}>
            {method}
          </Badge>
          <code className="text-sm">{path}</code>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                API Documentation
              </h1>
              <p className="text-muted-foreground mt-2">
                Complete guide to integrating with our payment gateway
              </p>
            </div>
            <Button variant="outline" onClick={() => window.open('/', '_blank')}>
              <ExternalLink className="w-4 h-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="checkout">Checkout</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>Welcome to the PaymentGateway API</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Our payment gateway provides a simple, secure way to accept payments online. 
                  This documentation covers everything you need to integrate payments into your application.
                </p>
                
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="bg-primary/5 border-primary/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Base URL</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <code className="text-sm bg-muted p-2 rounded">
                        https://your-domain.com/api
                      </code>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-accent/5 border-accent/20">
                    <CardHeader>
                      <CardTitle className="text-lg">Rate Limits</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">60 requests per minute</p>
                    </CardContent>
                  </Card>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Test Environment</h3>
                  <p className="text-sm text-muted-foreground">
                    All payments in this demo are simulated. No real money is processed.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Test Payment Methods</CardTitle>
                <CardDescription>Use these test data for successful integration testing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <h4 className="font-semibold mb-2">Test Credit Cards</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <code>4242 4242 4242 4242</code>
                        <Badge variant="success">Success</Badge>
                      </div>
                      <div className="flex justify-between">
                        <code>4000 0000 0000 0002</code>
                        <Badge variant="destructive">Decline</Badge>
                      </div>
                      <div className="flex justify-between">
                        <code>4000 0000 0000 9995</code>
                        <Badge variant="warning">Insufficient Funds</Badge>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-2">Test Bank Accounts</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <div className="flex justify-between">
                          <span>Routing: 110000000</span>
                          <Badge variant="success">Success</Badge>
                        </div>
                        <div className="text-muted-foreground">Account: 000123456789</div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span>Routing: 000000000</span>
                          <Badge variant="destructive">Invalid</Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="auth" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>How to authenticate your API requests</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  All API requests must be authenticated using your secret API key. 
                  Include your key in the Authorization header of every request.
                </p>
                
                <div>
                  <h4 className="font-semibold mb-2">API Key Types</h4>
                  <div className="space-y-2">
                    <div>
                      <Badge variant="secondary">Public Key</Badge>
                      <span className="ml-2 text-sm">pk_... - Safe to use in frontend code</span>
                    </div>
                    <div>
                      <Badge variant="warning">Secret Key</Badge>
                      <span className="ml-2 text-sm">sk_... - Keep secure, server-side only</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Authorization Header</h4>
                  <CodeBlock>
{`Authorization: Bearer sk_your_secret_key_here

// Or using x-api-key header
x-api-key: sk_your_secret_key_here`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="checkout" className="space-y-6">
            <EndpointCard
              method="POST"
              path="/api/checkout/sessions"
              description="Create a new checkout session"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Request Body</h4>
                  <CodeBlock>
{`{
  "amount": 4999,
  "currency": "USD",
  "description": "Premium subscription",
  "metadata": {
    "order_id": "order_12345",
    "customer_id": "cust_67890"
  },
  "return_url": "https://yoursite.com/success",
  "cancel_url": "https://yoursite.com/cancel"
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <CodeBlock>
{`{
  "id": "cs_1234567890abcdef",
  "hosted_url": "https://gateway.com/checkout/cs_1234567890abcdef",
  "widget_token": "wt_abcdef1234567890",
  "amount": 4999,
  "currency": "USD",
  "status": "requires_payment_method",
  "expires_at": "2024-01-01T12:00:00Z"
}`}
                  </CodeBlock>
                </div>
              </div>
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/checkout/sessions/:id"
              description="Retrieve a checkout session"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <CodeBlock>
{`{
  "id": "cs_1234567890abcdef",
  "amount": 4999,
  "currency": "USD",
  "description": "Premium subscription",
  "status": "succeeded",
  "metadata": {
    "order_id": "order_12345"
  },
  "created_at": "2024-01-01T10:00:00Z",
  "expires_at": "2024-01-01T12:00:00Z"
}`}
                  </CodeBlock>
                </div>
              </div>
            </EndpointCard>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6">
            <EndpointCard
              method="POST"
              path="/api/payments/:sessionId/confirm"
              description="Confirm a payment with payment method details"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Card Payment Request</h4>
                  <CodeBlock>
{`{
  "method": "card",
  "card": {
    "number": "4242424242424242",
    "exp_month": 12,
    "exp_year": 25,
    "cvc": "123"
  }
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Bank Payment Request</h4>
                  <CodeBlock>
{`{
  "method": "bank",
  "bank": {
    "routing": "110000000",
    "account": "000123456789"
  }
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <CodeBlock>
{`{
  "id": "pay_1234567890abcdef",
  "status": "succeeded",
  "amount": 4999,
  "currency": "USD",
  "method": "card",
  "masked_details": "**** **** **** 4242",
  "fee_amount": 155,
  "net_amount": 4844,
  "created_at": "2024-01-01T10:30:00Z"
}`}
                  </CodeBlock>
                </div>
              </div>
            </EndpointCard>

            <EndpointCard
              method="GET"
              path="/api/payments"
              description="List all payments for your account"
            >
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Query Parameters</h4>
                  <div className="text-sm space-y-1">
                    <div><code>limit</code> - Number of payments to return (default: 20, max: 100)</div>
                    <div><code>offset</code> - Number of payments to skip</div>
                    <div><code>status</code> - Filter by status: succeeded, failed, processing</div>
                    <div><code>created_after</code> - ISO 8601 timestamp</div>
                    <div><code>created_before</code> - ISO 8601 timestamp</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Response</h4>
                  <CodeBlock>
{`{
  "data": [
    {
      "id": "pay_1234567890abcdef",
      "status": "succeeded",
      "amount": 4999,
      "currency": "USD",
      "method": "card",
      "masked_details": "**** **** **** 4242",
      "fee_amount": 155,
      "net_amount": 4844,
      "created_at": "2024-01-01T10:30:00Z"
    }
  ],
  "has_more": false,
  "total": 1
}`}
                  </CodeBlock>
                </div>
              </div>
            </EndpointCard>
          </TabsContent>

          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Events</CardTitle>
                <CardDescription>Real-time notifications about payment events</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p>
                  Webhooks allow you to receive real-time notifications when payments are completed or fail. 
                  Configure your webhook endpoints in your merchant dashboard.
                </p>

                <div>
                  <h4 className="font-semibold mb-2">Event Types</h4>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="success">payment.succeeded</Badge>
                      <span className="text-sm">A payment was successfully processed</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">payment.failed</Badge>
                      <span className="text-sm">A payment attempt failed</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Webhook Payload</h4>
                  <CodeBlock>
{`{
  "id": "evt_1234567890abcdef",
  "type": "payment.succeeded",
  "created": 1704110400,
  "data": {
    "object": {
      "id": "pay_1234567890abcdef",
      "status": "succeeded",
      "amount": 4999,
      "currency": "USD",
      "method": "card",
      "masked_details": "**** **** **** 4242",
      "fee_amount": 155,
      "net_amount": 4844,
      "session_id": "cs_1234567890abcdef",
      "merchant_id": "mer_1234567890abcdef",
      "created_at": "2024-01-01T10:30:00Z"
    }
  }
}`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Signature Verification</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    All webhook requests include a signature in the <code>X-Gateway-Signature</code> header.
                  </p>
                  <CodeBlock>
{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return \`sha256=\${expectedSignature}\` === signature;
}

// Usage
const isValid = verifyWebhookSignature(
  req.body,
  req.headers['x-gateway-signature'],
  'your_webhook_secret'
);`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="examples" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Frontend Integration</CardTitle>
                <CardDescription>Complete examples for common integration patterns</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Basic Checkout Integration</h4>
                  <CodeBlock>
{`<!DOCTYPE html>
<html>
<head>
  <title>Payment Demo</title>
</head>
<body>
  <button id="checkout-btn">Pay $49.99</button>
  
  <script>
    document.getElementById('checkout-btn').addEventListener('click', async () => {
      try {
        // Create checkout session on your server
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: 4999,
            currency: 'USD',
            description: 'Premium subscription'
          })
        });
        
        const session = await response.json();
        
        // Redirect to hosted checkout
        window.location.href = session.hosted_url;
        
      } catch (error) {
        console.error('Error:', error);
      }
    });
  </script>
</body>
</html>`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Server-side Session Creation (Node.js)</h4>
                  <CodeBlock>
{`const express = require('express');
const app = express();

app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { amount, currency, description } = req.body;
    
    const response = await fetch('https://gateway.com/api/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer sk_your_secret_key',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency,
        description,
        return_url: 'https://yoursite.com/success',
        cancel_url: 'https://yoursite.com/cancel'
      })
    });
    
    const session = await response.json();
    res.json(session);
    
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000);`}
                  </CodeBlock>
                </div>

                <div>
                  <h4 className="font-semibold mb-2">Webhook Handler Example</h4>
                  <CodeBlock>
{`const express = require('express');
const crypto = require('crypto');
const app = express();

// Use raw body parser for webhook signature verification
app.use('/webhook', express.raw({ type: 'application/json' }));

app.post('/webhook', (req, res) => {
  const signature = req.headers['x-gateway-signature'];
  const payload = req.body;
  
  // Verify webhook signature
  const expectedSignature = crypto
    .createHmac('sha256', 'your_webhook_secret')
    .update(payload, 'utf8')
    .digest('hex');
  
  if (\`sha256=\${expectedSignature}\` !== signature) {
    return res.status(400).send('Invalid signature');
  }
  
  const event = JSON.parse(payload);
  
  switch (event.type) {
    case 'payment.succeeded':
      console.log('Payment succeeded:', event.data.object);
      // Update your database, send confirmation email, etc.
      break;
      
    case 'payment.failed':
      console.log('Payment failed:', event.data.object);
      // Handle failed payment
      break;
      
    default:
      console.log('Unhandled event type:', event.type);
  }
  
  res.status(200).send('OK');
});

app.listen(3000);`}
                  </CodeBlock>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Error Handling</CardTitle>
                <CardDescription>Common error codes and how to handle them</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2">HTTP Status Codes</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <code>200</code>
                        <span>Success</span>
                      </div>
                      <div className="flex justify-between">
                        <code>400</code>
                        <span>Bad Request - Invalid parameters</span>
                      </div>
                      <div className="flex justify-between">
                        <code>401</code>
                        <span>Unauthorized - Invalid API key</span>
                      </div>
                      <div className="flex justify-between">
                        <code>404</code>
                        <span>Not Found - Resource doesn't exist</span>
                      </div>
                      <div className="flex justify-between">
                        <code>429</code>
                        <span>Too Many Requests - Rate limit exceeded</span>
                      </div>
                      <div className="flex justify-between">
                        <code>500</code>
                        <span>Internal Server Error</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Error Response Format</h4>
                    <CodeBlock>
{`{
  "error": {
    "type": "card_error",
    "code": "card_declined",
    "message": "Your card was declined.",
    "param": "card[number]"
  }
}`}
                    </CodeBlock>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}