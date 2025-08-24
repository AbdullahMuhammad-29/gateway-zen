import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, DollarSign, CreditCard, TrendingUp } from 'lucide-react';

interface StatsData {
  totalMerchants: number;
  totalVolume: number;
  totalPayments: number;
  totalFees: number;
}

export const RealtimeAdminStats = () => {
  const [stats, setStats] = useState<StatsData>({
    totalMerchants: 0,
    totalVolume: 0,
    totalPayments: 0,
    totalFees: 0
  });

  const loadStats = async () => {
    try {
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
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  useEffect(() => {
    loadStats();

    // Set up real-time listeners for all relevant tables
    const merchantsChannel = supabase
      .channel('admin-merchants-stats')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'merchants'
      }, () => {
        loadStats();
      })
      .subscribe();

    const paymentsChannel = supabase
      .channel('admin-payments-stats')
      .on('postgres_changes' as any, {
        event: '*',
        schema: 'public',
        table: 'payments'
      }, () => {
        loadStats();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(merchantsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount / 100);
  };

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Merchants</CardTitle>
          <Users className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalMerchants}</div>
          <p className="text-xs text-muted-foreground">Active merchant accounts</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-accent/5 to-accent/10 border-accent/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
          <DollarSign className="h-4 w-4 text-accent" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalVolume)}</div>
          <p className="text-xs text-muted-foreground">Successfully processed</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-success/5 to-success/10 border-success/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
          <CreditCard className="h-4 w-4 text-success" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalPayments}</div>
          <p className="text-xs text-muted-foreground">Successful transactions</p>
        </CardContent>
      </Card>
      
      <Card className="bg-gradient-to-br from-warning/5 to-warning/10 border-warning/20">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Platform Revenue</CardTitle>
          <TrendingUp className="h-4 w-4 text-warning" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(stats.totalFees)}</div>
          <p className="text-xs text-muted-foreground">Total fees collected</p>
        </CardContent>
      </Card>
    </div>
  );
};