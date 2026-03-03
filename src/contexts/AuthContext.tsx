import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';
import type { AppRole } from '@/lib/permissions';

interface Membership {
  id: string;
  tenant_id: string;
  role: AppRole;
  permissions: string[];
  tenant_name?: string;
  tenant_slug?: string;
}

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

interface RolePermMap {
  [rolePermKey: string]: boolean;
}

export interface TenantSubscription {
  plan: string;
  status: string;
  max_users: number;
  enabled_modules: string[];
  trial_ends_at: string | null;
  current_period_end: string | null;
  monthly_price: number | null;
}

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: Membership[];
  currentTenantId: string | null;
  currentRole: AppRole | null;
  rolePermissions: RolePermMap;
  subscription: TenantSubscription | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
  isModuleEnabled: (moduleKey: string) => boolean;
  isSubscriptionActive: () => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null,
    memberships: [], currentTenantId: null, currentRole: null, rolePermissions: {},
    subscription: null, loading: true,
  });

  const loadSubscription = useCallback(async (tenantId: string) => {
    const { data } = await supabase
      .from('tenant_subscriptions')
      .select('plan, status, max_users, enabled_modules, trial_ends_at, current_period_end, monthly_price')
      .eq('tenant_id', tenantId)
      .single();
    return data as TenantSubscription | null;
  }, []);

  const loadUserData = useCallback(async (user: User) => {
    const [profileRes, membershipsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('user_memberships').select(`
        id, tenant_id, role, permissions,
        tenants!inner(name, slug)
      `).eq('user_id', user.id).eq('is_active', true),
    ]);

    const profile = profileRes.data as Profile | null;
    const rawMemberships = (membershipsRes.data || []) as any[];
    const memberships: Membership[] = rawMemberships.map((m: any) => ({
      id: m.id,
      tenant_id: m.tenant_id,
      role: m.role as AppRole,
      permissions: m.permissions || [],
      tenant_name: m.tenants?.name,
      tenant_slug: m.tenants?.slug,
    }));

    // Load role permissions from DB
    let rolePermissions: RolePermMap = {};
    try {
      const rpRes = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/role_permissions?select=role,permission,granted`,
        {
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        }
      );
      if (rpRes.ok) {
        const rows: { role: string; permission: string; granted: boolean }[] = await rpRes.json();
        for (const r of rows) {
          rolePermissions[`${r.role}:${r.permission}`] = r.granted;
        }
      }
    } catch {
      // fallback to hardcoded defaults
    }

    const savedTenant = localStorage.getItem('currentTenantId');
    const defaultTenant = memberships.find(m => m.tenant_id === savedTenant)?.tenant_id
      || memberships[0]?.tenant_id || null;
    const currentRole = memberships.find(m => m.tenant_id === defaultTenant)?.role || null;

    // Load subscription for current tenant
    let subscription: TenantSubscription | null = null;
    if (defaultTenant) {
      subscription = await loadSubscription(defaultTenant);
    }

    setState(prev => ({
      ...prev, user, profile, memberships, rolePermissions,
      currentTenantId: defaultTenant, currentRole, subscription, loading: false,
    }));
  }, [loadSubscription]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setState(prev => ({ ...prev, session }));
        setTimeout(() => loadUserData(session.user), 0);
      } else {
        setState({
          user: null, session: null, profile: null,
          memberships: [], currentTenantId: null, currentRole: null, rolePermissions: {},
          subscription: null, loading: false,
        });
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState(prev => ({ ...prev, session }));
        loadUserData(session.user);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    });

    return () => subscription.unsubscribe();
  }, [loadUserData]);

  const logAuthEvent = async (action: string, userId?: string, email?: string) => {
    try {
      await supabase.functions.invoke('audit-auth-hook', {
        body: { action, user_id: userId, email, provider: 'email', timestamp: new Date().toISOString() },
      });
    } catch {
      // Never block auth flow
    }
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    logAuthEvent('login', data.user?.id, email);
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
    logAuthEvent('signup', data.user?.id, email);
  };

  const signOut = async () => {
    const userId = state.user?.id;
    const email = state.profile?.email;
    await supabase.auth.signOut();
    localStorage.removeItem('currentTenantId');
    if (userId) logAuthEvent('logout', userId, email || undefined);
  };

  const switchTenant = async (tenantId: string) => {
    localStorage.setItem('currentTenantId', tenantId);
    const role = state.memberships.find(m => m.tenant_id === tenantId)?.role || null;
    const sub = await loadSubscription(tenantId);
    setState(prev => ({ ...prev, currentTenantId: tenantId, currentRole: role, subscription: sub }));
  };

  const isModuleEnabled = (moduleKey: string): boolean => {
    // Super admins bypass module checks
    if (state.currentRole === 'super_admin') return true;
    // No subscription = legacy tenant, allow all
    if (!state.subscription) return true;
    // Expired/suspended/cancelled = block all except core
    const coreModules = ['os', 'dashboard', 'portal', 'notifications'];
    if (['expired', 'suspended', 'cancelled'].includes(state.subscription.status)) {
      return coreModules.includes(moduleKey);
    }
    // Check trial expiry
    if (state.subscription.status === 'trial' && state.subscription.trial_ends_at) {
      if (new Date(state.subscription.trial_ends_at) < new Date()) {
        return coreModules.includes(moduleKey);
      }
    }
    return state.subscription.enabled_modules.includes(moduleKey);
  };

  const isSubscriptionActive = (): boolean => {
    if (state.currentRole === 'super_admin') return true;
    if (!state.subscription) return true;
    if (['expired', 'suspended', 'cancelled'].includes(state.subscription.status)) return false;
    if (state.subscription.status === 'trial' && state.subscription.trial_ends_at) {
      return new Date(state.subscription.trial_ends_at) >= new Date();
    }
    return true;
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, switchTenant, isModuleEnabled, isSubscriptionActive }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
