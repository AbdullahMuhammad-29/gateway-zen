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
import { RealtimeAdminStats } from '@/components/RealtimeAdminStats';

interface Merchant {
  id: string;
  business_name: string;
  status: string;
  created_at: string;
  website_url?: string;
  profiles?: { email: string };
}

interface Payment {
  id: string;
  amount: number;
  status: string;
  method: string;
  fee_amount: number;
  created_at: string;
  merchants?: { business_name: string };
  payment_sessions?: { description: string };
}

interface FraudFlag {
  id: string;
  reason: string;
  score: number;
  created_at: string;
  payments?: {
    amount: number;
    merchants?: { business_name: string };
  };
}

interface AuditLog {
  id: string;
  actor_role: string;
  action: string;
  target_type: string;
  metadata: any;
  created_at: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [fraudFlags, setFraudFlags] = useState<FraudFlag[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [platformSettings, setPlatformSettings] = useState<{
    fee_percentage?: string;
    fee_fixed?: string;
    fraud_high_value_threshold?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
    loadAdminData();
    const cleanup = setupRealtimeListeners();
    
    return cleanup;
  }, []);

  const setupRealtimeListeners = () => {
    // Listen to merchants changes
    const merchantsChannel = supabase
      .channel('admin-merchants')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'merchants'
      }, () => {
        loadMerchants();
      })
      .subscribe();

    // Listen to payments changes
    const paymentsChannel = supabase
      .channel('admin-payments')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        loadPayments();
      })
      .subscribe();

    // Listen to fraud flags changes
    const fraudChannel = supabase
      .channel('admin-fraud')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'fraud_flags'
      }, () => {
        loadFraudFlags();
      })
      .subscribe();

    // Listen to audit logs changes
    const auditChannel = supabase
      .channel('admin-audit')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'audit_logs'
      }, () => {
        loadAuditLogs();
      })
      .subscribe();

    // Listen to platform settings changes
    const settingsChannel = supabase
      .channel('admin-settings')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'platform_settings'
      }, () => {
        loadPlatformSettings();
      })
      .subscribe();

    // Cleanup function will be handled by useEffect return
    return () => {
      supabase.removeChannel(merchantsChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(fraudChannel);
      supabase.removeChannel(auditChannel);
      supabase.removeChannel(settingsChannel);
    };
  };

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
      loadPlatformSettings()
    ]);
    setLoading(false);
  };

  const loadMerchants = async () => {
    const { data } = await supabase
      .from('merchants')
      .select('*')
      .order('created_at', { ascending: false });
    setMerchants(data || []);
  };

  const loadPayments = async () => {
    const { data } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    setPayments(data || []);
  };

  const loadFraudFlags = async () => {
    const { data } = await supabase
      .from('fraud_flags')
      .select('*')
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
    
    const settings: any = {};
    data?.forEach(setting => {
      settings[setting.key] = setting.value;
    });
    setPlatformSettings(settings);
  };

  const updateMerchantStatus = async (merchantId: string, status: string) => {
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

    toast({ title: "Success", description: `Merchant status updated to ${status}` });
  };

  const updatePlatformSetting = async (key: string, value: string) => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key, value }, { onConflict: 'key' });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Setting updated" });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary" | "outline" | "success" | "warning"> = {
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
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-pulse mx-auto mb-4 text-primary" />
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
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
            <RealtimeAdminStats />

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
                    {fraudFlags.length === 0 && (
                      <p className="text-sm text-muted-foreground">No fraud alerts</p>
                    )}
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