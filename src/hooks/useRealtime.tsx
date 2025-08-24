import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface RealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  schema?: string;
  filter?: string;
  callback: (payload: any) => void;
}

export const useRealtime = ({
  table,
  event = '*',
  schema = 'public',
  filter,
  callback
}: RealtimeOptions) => {
  const handleRealtimeEvent = useCallback((payload: any) => {
    callback(payload);
  }, [callback]);

  useEffect(() => {
    const channelName = `${schema}-${table}-changes-${Math.random()}`;
    
    let channelBuilder = supabase
      .channel(channelName)
      .on('postgres_changes' as any, {
        event,
        schema,
        table,
        ...(filter && { filter })
      }, handleRealtimeEvent);

    const channel = channelBuilder.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, event, schema, filter, handleRealtimeEvent]);
};

// Hook for multiple table subscriptions
export const useMultipleRealtime = (subscriptions: RealtimeOptions[]) => {
  useEffect(() => {
    const channels = subscriptions.map((sub, index) => {
      const channelName = `multi-${sub.table}-${index}-${Math.random()}`;
      
      let channelBuilder = supabase
        .channel(channelName)
        .on('postgres_changes' as any, {
          event: sub.event || '*',
          schema: sub.schema || 'public',
          table: sub.table,
          ...(sub.filter && { filter: sub.filter })
        }, sub.callback);
      
      return channelBuilder.subscribe();
    });

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, [subscriptions]);
};