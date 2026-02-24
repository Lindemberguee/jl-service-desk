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

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  memberships: Membership[];
  currentTenantId: string | null;
  currentRole: AppRole | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<void>;
  signOut: () => Promise<void>;
  switchTenant: (tenantId: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null, session: null, profile: null,
    memberships: [], currentTenantId: null, currentRole: null, loading: true,
  });

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

    const savedTenant = localStorage.getItem('currentTenantId');
    const defaultTenant = memberships.find(m => m.tenant_id === savedTenant)?.tenant_id
      || memberships[0]?.tenant_id || null;
    const currentRole = memberships.find(m => m.tenant_id === defaultTenant)?.role || null;

    setState(prev => ({
      ...prev, user, profile, memberships,
      currentTenantId: defaultTenant, currentRole, loading: false,
    }));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setState(prev => ({ ...prev, session }));
        // defer to avoid deadlock
        setTimeout(() => loadUserData(session.user), 0);
      } else {
        setState({
          user: null, session: null, profile: null,
          memberships: [], currentTenantId: null, currentRole: null, loading: false,
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

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name }, emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('currentTenantId');
  };

  const switchTenant = (tenantId: string) => {
    localStorage.setItem('currentTenantId', tenantId);
    const role = state.memberships.find(m => m.tenant_id === tenantId)?.role || null;
    setState(prev => ({ ...prev, currentTenantId: tenantId, currentRole: role }));
  };

  return (
    <AuthContext.Provider value={{ ...state, signIn, signUp, signOut, switchTenant }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
