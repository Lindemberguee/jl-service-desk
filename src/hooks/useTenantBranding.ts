import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TenantBranding {
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  accent_color: string | null;
}

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function generateSidebarColors(primaryHex: string) {
  const hsl = hexToHsl(primaryHex);
  if (!hsl) return null;
  const parts = hsl.split(' ');
  const hue = parseInt(parts[0]);
  return {
    sidebarPrimary: `${hue} 94% 55%`,
    sidebarBackground: `${hue} 47% 11%`,
    sidebarForeground: `${hue} 31% 91%`,
    sidebarAccent: `${hue} 47% 16%`,
    sidebarBorder: `${hue} 47% 18%`,
    sidebarRing: `${hue} 94% 55%`,
    sidebarMutedForeground: `${hue} 11% 55%`,
    // Main theme primary
    primary: `${hue} 94% 38%`,
    primaryDark: `${hue} 94% 55%`,
    ring: `${hue} 94% 38%`,
    ringDark: `${hue} 94% 55%`,
    // Charts
    chart1: `${hue} 94% 38%`,
    chart1Dark: `${hue} 94% 55%`,
  };
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

  // Apply CSS variables when branding changes
  useEffect(() => {
    const root = document.documentElement;
    if (!branding?.primary_color) {
      // Reset to defaults
      root.style.removeProperty('--primary');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--sidebar-primary');
      root.style.removeProperty('--sidebar-background');
      root.style.removeProperty('--sidebar-foreground');
      root.style.removeProperty('--sidebar-accent');
      root.style.removeProperty('--sidebar-border');
      root.style.removeProperty('--sidebar-ring');
      root.style.removeProperty('--sidebar-muted-foreground');
      root.style.removeProperty('--chart-1');
      return;
    }

    const colors = generateSidebarColors(branding.primary_color);
    if (!colors) return;

    const isDark = root.classList.contains('dark');

    // Apply sidebar colors
    root.style.setProperty('--sidebar-primary', colors.sidebarPrimary);
    root.style.setProperty('--sidebar-background', colors.sidebarBackground);
    root.style.setProperty('--sidebar-foreground', colors.sidebarForeground);
    root.style.setProperty('--sidebar-accent', colors.sidebarAccent);
    root.style.setProperty('--sidebar-border', colors.sidebarBorder);
    root.style.setProperty('--sidebar-ring', colors.sidebarRing);
    root.style.setProperty('--sidebar-muted-foreground', colors.sidebarMutedForeground);
    
    // Apply main theme primary
    root.style.setProperty('--primary', isDark ? colors.primaryDark : colors.primary);
    root.style.setProperty('--ring', isDark ? colors.ringDark : colors.ring);
    root.style.setProperty('--chart-1', isDark ? colors.chart1Dark : colors.chart1);
  }, [branding?.primary_color]);

  return {
    tenantName: branding?.name || 'ServiceOS',
    tenantLogo: branding?.logo_url || null,
    primaryColor: branding?.primary_color || '#3B82F6',
    accentColor: branding?.accent_color || '#8B5CF6',
  };
}
