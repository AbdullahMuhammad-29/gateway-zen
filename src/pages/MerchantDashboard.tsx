import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Copy, Eye, EyeOff, Plus, Trash2, DollarSign, CreditCard, TrendingUp, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function MerchantDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [apiKeys, setApiKeys] = useState([]);
  const [payments, setPayments] = useState([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState([]);
  const [stats, setStats] = useState({ totalVolume: 0, totalPayments: 0, totalFees: 0, netAmount: 0 });
  const [showSecretKey, setShowSecretKey] = useState(null);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadDashboardData();
    
    // Real-time updates for payments
    const channel = supabase
      .channel('merchant-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        loadPayments();
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/merchant-auth');
      return;
    }
    setUser(user);
  };

  const loadDashboardData = async () => {
    await Promise.all([
      loadMerchant(),
      loadApiKeys(),
      loadPayments(),
      loadWebhookEndpoints(),
      loadStats()
    ]);
    setLoading(false);
  };

  const loadMerchant = async () => {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .single();
    setMerchant(data);
  };

  const loadApiKeys = async () => {
    const { data } = await supabase
      .from('api_keys')
      .select('*')
      .order('created_at', { ascending: false });
    setApiKeys(data || []);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        payment_sessions (
          description,
          metadata
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);
    setPayments(data || []);
  };

  const loadWebhookEndpoints = async () => {
    const { data } = await supabase
      .from('webhook_endpoints')
      .select('*')
      .order('created_at', { ascending: false });
    setWebhookEndpoints(data || []);
  };

  const loadStats = async () => {
    const { data } = await supabase
      .from('payments')
      .select('amount, fee_amount, net_amount, status');
    
    if (data) {
      const succeededPayments = data.filter(p => p.status === 'succeeded');
      const totalVolume = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = succeededPayments.reduce((sum, p) => sum + p.fee_amount, 0);
      const netAmount = succeededPayments.reduce((sum, p) => sum + p.net_amount, 0);
      
      setStats({
        totalVolume,
        totalPayments: succeededPayments.length,
        totalFees,
        netAmount
      });
    }
  };

  const createApiKey = async () => {
    if (!newApiKeyName.trim()) {
      toast({ title: "Error", description: "API key name is required", variant: "destructive" });
      return;
    }

    const publicKey = `pk_${Math.random().toString(36).substr(2, 24)}`;
    const secretKey = `sk_${Math.random().toString(36).substr(2, 24)}`;
    const secretKeyHash = await hashSecret(secretKey);

    const { error } = await supabase
      .from('api_keys')
      .insert({
        name: newApiKeyName,
        public_key: publicKey,
        secret_key_hash: secretKeyHash,
        merchant_id: merchant.id
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setShowSecretKey({ publicKey, secretKey });
    setNewApiKeyName('');
    loadApiKeys();
    toast({ title: "Success", description: "API key created successfully" });
  };

  const hashSecret = async (secret) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(secret);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const revokeApiKey = async (id) => {
    const { error } = await supabase
      .from('api_keys')
      .update({ active: false })
      .eq('id', id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    loadApiKeys();
    toast({ title: "Success", description: "API key revoked" });
  };

  const createWebhookEndpoint = async () => {
    if (!newWebhookUrl.trim()) {
      toast({ title: "Error", description: "Webhook URL is required", variant: "destructive" });
      return;
    }

    const secret = Math.random().toString(36).substr(2, 32);

    const { error } = await supabase
      .from('webhook_endpoints')
      .insert({
        url: newWebhookUrl,
        secret,
        merchant_id: merchant.id
      });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    setNewWebhookUrl('');
    loadWebhookEndpoints();
    toast({ title: "Success", description: "Webhook endpoint created" });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: "Copied to clipboard" });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    const variants = {
      succeeded: 'success',
      failed: 'destructive',
      processing: 'warning',
      requires_payment_method: 'secondary'
    };
    return <Badge variant={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {merchant?.business_name}
            </h1>
            <p className="text-muted-foreground">Merchant Dashboard</p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                  <CreditCard className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPayments}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-destructive/5 to-destructive/10 border-destructive/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fees Paid</CardTitle>
                  <TrendingUp className="h-4 w-4 text-destructive" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
                  <Users className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.netAmount)}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Payments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.slice(0, 5).map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell>{formatCurrency(payment.fee_amount)}</TableCell>
                        <TableCell>{formatCurrency(payment.net_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>View and manage all your payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.id.slice(0, 8)}...</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{payment.payment_sessions?.description || '-'}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell className="font-mono text-sm">{payment.masked_details}</TableCell>
                        <TableCell>{formatCurrency(payment.fee_amount)}</TableCell>
                        <TableCell>{formatCurrency(payment.net_amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="api-keys">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Create New API Key</CardTitle>
                  <CardDescription>Generate new API keys for your applications</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="API Key Name"
                      value={newApiKeyName}
                      onChange={(e) => setNewApiKeyName(e.target.value)}
                    />
                    <Button onClick={createApiKey}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {showSecretKey && (
                <Card className="border-warning">
                  <CardHeader>
                    <CardTitle className="text-warning">Save Your Secret Key</CardTitle>
                    <CardDescription>This is the only time you'll see the secret key. Store it securely.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Public Key</Label>
                      <div className="flex gap-2">
                        <Input value={showSecretKey.publicKey} readOnly />
                        <Button size="sm" onClick={() => copyToClipboard(showSecretKey.publicKey)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Label>Secret Key</Label>
                      <div className="flex gap-2">
                        <Input value={showSecretKey.secretKey} readOnly />
                        <Button size="sm" onClick={() => copyToClipboard(showSecretKey.secretKey)}>
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    <Button onClick={() => setShowSecretKey(null)}>Got it</Button>
                  </CardContent>
                </Card>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Your API Keys</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Public Key</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {apiKeys.map((key) => (
                        <TableRow key={key.id}>
                          <TableCell>{key.name}</TableCell>
                          <TableCell className="font-mono text-sm">{key.public_key}</TableCell>
                          <TableCell>
                            <Badge variant={key.active ? 'success' : 'destructive'}>
                              {key.active ? 'Active' : 'Revoked'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button size="sm" variant="outline" onClick={() => copyToClipboard(key.public_key)}>
                                <Copy className="w-4 h-4" />
                              </Button>
                              {key.active && (
                                <Button size="sm" variant="destructive" onClick={() => revokeApiKey(key.id)}>
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="webhooks">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Add Webhook Endpoint</CardTitle>
                  <CardDescription>Receive real-time notifications about payment events</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      placeholder="https://your-domain.com/webhook"
                      value={newWebhookUrl}
                      onChange={(e) => setNewWebhookUrl(e.target.value)}
                    />
                    <Button onClick={createWebhookEndpoint}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Webhook Endpoints</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>URL</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Delivered</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Secret</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookEndpoints.map((endpoint) => (
                        <TableRow key={endpoint.id}>
                          <TableCell>{endpoint.url}</TableCell>
                          <TableCell>
                            <Badge variant={endpoint.active ? 'success' : 'destructive'}>
                              {endpoint.active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {endpoint.last_delivered_at ? new Date(endpoint.last_delivered_at).toLocaleDateString() : 'Never'}
                          </TableCell>
                          <TableCell>{new Date(endpoint.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(endpoint.secret)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy Secret
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Settings</CardTitle>
                <CardDescription>Manage your merchant account settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Business Name</Label>
                  <Input value={merchant?.business_name || ''} readOnly />
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input value={merchant?.website_url || ''} readOnly />
                </div>
                <div>
                  <Label>Contact Email</Label>
                  <Input value={merchant?.contact_email || ''} readOnly />
                </div>
                <div>
                  <Label>Status</Label>
                  <Badge variant={merchant?.status === 'approved' ? 'success' : 'warning'}>
                    {merchant?.status}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}