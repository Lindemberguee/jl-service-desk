import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TenantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

export function useTenantBranding() {
  const { currentTenantId } = useAuth();

  const { data: branding } = useQuery({
    queryKey: ['tenant_branding', currentTenantId],
    queryFn: async () => {
      if (!currentTenantId) return null;
      const { data, error } = await supabase
        .from('tenants')
        .select('name, logo_url, primary_color, accent_color')
        .eq('id', currentTenantId)
        .single();
      if (error) throw error;
      return data as TenantBranding;
    },
    enabled: !!currentTenantId,
    staleTime: 5 * 60 * 1000,
  });

  return {
    tenantName: branding?.name || 'OrdFy',
    tenantLogo: branding?.logo_url || null,
    primaryColor: branding?.primary_color || '#3B82F6',
    accentColor: branding?.accent_color || '#8B5CF6',
  };
}
