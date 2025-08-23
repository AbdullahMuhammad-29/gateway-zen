import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, Users, CreditCard, AlertTriangle, FileText, DollarSign, TrendingUp, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [merchants, setMerchants] = useState([]);
  const [payments, setPayments] = useState([]);
  const [fraudFlags, setFraudFlags] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [platformSettings, setPlatformSettings] = useState({});
  const [stats, setStats] = useState({
    totalMerchants: 0,
    totalVolume: 0,
    totalPayments: 0,
    totalFees: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadAdminData();
    
    // Real-time updates
    const channel = supabase
      .channel('admin-dashboard')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'merchants'
      }, () => {
        loadMerchants();
        loadStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        loadPayments();
        loadStats();
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'fraud_flags'
      }, () => {
        loadFraudFlags();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate('/admin-auth');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      navigate('/');
      return;
    }

    setUser(user);
  };

  const loadAdminData = async () => {
    await Promise.all([
      loadMerchants(),
      loadPayments(),
      loadFraudFlags(),
      loadAuditLogs(),
      loadPlatformSettings(),
      loadStats()
    ]);
    setLoading(false);
  };

  const loadMerchants = async () => {
    const { data } = await supabase
      .from('merchants')
      .select(`
        *,
        profiles (email)
      `)
      .order('created_at', { ascending: false });
    setMerchants(data || []);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select(`
        *,
        merchants (business_name),
        payment_sessions (description)
      `)
      .order('created_at', { ascending: false })
      .limit(100);
    setPayments(data || []);
  };

  const loadFraudFlags = async () => {
    const { data } = await supabase
      .from('fraud_flags')
      .select(`
        *,
        payments (
          amount,
          merchants (business_name)
        )
      `)
      .order('created_at', { ascending: false });
    setFraudFlags(data || []);
  };

  const loadAuditLogs = async () => {
    const { data } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    setAuditLogs(data || []);
  };

  const loadPlatformSettings = async () => {
    const { data } = await supabase
      .from('platform_settings')
      .select('*');
    
    const settings = {};
    data?.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    setPlatformSettings(settings);
  };

  const loadStats = async () => {
    const { data: merchantsData } = await supabase
      .from('merchants')
      .select('id');
    
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount, fee_amount, status');
    
    const succeededPayments = paymentsData?.filter(p => p.status === 'succeeded') || [];
    const totalVolume = succeededPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalFees = succeededPayments.reduce((sum, p) => sum + p.fee_amount, 0);
    
    setStats({
      totalMerchants: merchantsData?.length || 0,
      totalVolume,
      totalPayments: succeededPayments.length,
      totalFees
    });
  };

  const updateMerchantStatus = async (merchantId, status) => {
    const { error } = await supabase
      .from('merchants')
      .update({ status })
      .eq('id', merchantId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    // Log the action
    await supabase
      .from('audit_logs')
      .insert({
        actor_user_id: user.id,
        actor_role: 'admin',
        action: `merchant_status_updated_to_${status}`,
        target_type: 'merchant',
        target_id: merchantId,
        metadata: { new_status: status }
      });

    loadMerchants();
    toast({ title: "Success", description: `Merchant status updated to ${status}` });
  };

  const updatePlatformSetting = async (key, value) => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    loadPlatformSettings();
    toast({ title: "Success", description: "Setting updated" });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getStatusBadge = (status) => {
    const variants = {
      approved: 'success',
      pending: 'warning',
      blocked: 'destructive',
      succeeded: 'success',
      failed: 'destructive',
      processing: 'warning'
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
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground">Payment Gateway Administration</p>
          </div>
          <Button onClick={logout} variant="outline">Logout</Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="merchants">Merchants</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="fraud">Fraud Flags</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
            <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
                  <Users className="h-4 w-4 text-primary" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMerchants}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
                  <DollarSign className="h-4 w-4 text-accent" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
                  <CreditCard className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalPayments}</div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</div>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Merchants</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {merchants.slice(0, 5).map((merchant) => (
                      <div key={merchant.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{merchant.business_name}</p>
                          <p className="text-sm text-muted-foreground">{merchant.profiles?.email}</p>
                        </div>
                        {getStatusBadge(merchant.status)}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fraud Alerts</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {fraudFlags.slice(0, 5).map((flag) => (
                      <div key={flag.id} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{flag.reason}</p>
                          <p className="text-sm text-muted-foreground">
                            {flag.payments?.merchants?.business_name} - {formatCurrency(flag.payments?.amount || 0)}
                          </p>
                        </div>
                        <Badge variant="destructive">Score: {flag.score}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="merchants">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Management</CardTitle>
                <CardDescription>Approve, block, or manage merchant accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Business Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Website</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchants.map((merchant) => (
                      <TableRow key={merchant.id}>
                        <TableCell className="font-medium">{merchant.business_name}</TableCell>
                        <TableCell>{merchant.profiles?.email}</TableCell>
                        <TableCell>{merchant.website_url || '-'}</TableCell>
                        <TableCell>{getStatusBadge(merchant.status)}</TableCell>
                        <TableCell>{new Date(merchant.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {merchant.status === 'pending' && (
                              <Button 
                                size="sm" 
                                variant="success"
                                onClick={() => updateMerchantStatus(merchant.id, 'approved')}
                              >
                                Approve
                              </Button>
                            )}
                            {merchant.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={() => updateMerchantStatus(merchant.id, 'blocked')}
                              >
                                Block
                              </Button>
                            )}
                            {merchant.status === 'blocked' && (
                              <Button 
                                size="sm" 
                                variant="success"
                                onClick={() => updateMerchantStatus(merchant.id, 'approved')}
                              >
                                Unblock
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
          </TabsContent>

          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>All Payments</CardTitle>
                <CardDescription>Monitor all payment transactions across the platform</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="font-mono text-sm">{payment.id.slice(0, 8)}...</TableCell>
                        <TableCell>{payment.merchants?.business_name}</TableCell>
                        <TableCell>{formatCurrency(payment.amount)}</TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell className="capitalize">{payment.method}</TableCell>
                        <TableCell>{formatCurrency(payment.fee_amount)}</TableCell>
                        <TableCell>{new Date(payment.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="fraud">
            <Card>
              <CardHeader>
                <CardTitle>Fraud Detection</CardTitle>
                <CardDescription>Review flagged transactions and suspicious activity</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fraudFlags.map((flag) => (
                      <TableRow key={flag.id}>
                        <TableCell>{new Date(flag.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{flag.payments?.merchants?.business_name}</TableCell>
                        <TableCell>{formatCurrency(flag.payments?.amount || 0)}</TableCell>
                        <TableCell>{flag.reason}</TableCell>
                        <TableCell>
                          <Badge variant={flag.score > 80 ? 'destructive' : 'warning'}>
                            {flag.score}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="warning">Under Review</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Platform Settings</CardTitle>
                  <CardDescription>Configure platform-wide settings and fees</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <Label>Fee Percentage (%)</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={platformSettings.fee_percentage || '2.5'}
                        onChange={(e) => updatePlatformSetting('fee_percentage', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label>Fixed Fee (cents)</Label>
                      <Input
                        type="number"
                        value={platformSettings.fee_fixed || '30'}
                        onChange={(e) => updatePlatformSetting('fee_fixed', e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Label>Fraud Detection Threshold (cents)</Label>
                    <Input
                      type="number"
                      value={platformSettings.fraud_high_value_threshold || '100000'}
                      onChange={(e) => updatePlatformSetting('fraud_high_value_threshold', e.target.value)}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs">
            <Card>
              <CardHeader>
                <CardTitle>Audit Logs</CardTitle>
                <CardDescription>Track all administrative actions and changes</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Actor</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Target</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {auditLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell>{log.actor_role}</TableCell>
                        <TableCell>{log.action}</TableCell>
                        <TableCell>{log.target_type}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {JSON.stringify(log.metadata)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}