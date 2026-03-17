import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface PlannerPlan {
  id: string;
  tenant_id: string;
  name: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PlannerBucket {
  id: string;
  plan_id: string;
  tenant_id: string;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
}

export interface TaskLabel {
  name: string;
  color: string;
}

export interface TaskLink {
  id: string;
  url: string;
  title: string;
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_key: string;
  uploaded_at: string;
}

export interface PlannerTask {
  id: string;
  plan_id: string;
  bucket_id: string;
  tenant_id: string;
  title: string;
  description: string;
  priority: string;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  checklist: ChecklistItem[];
  labels: TaskLabel[];
  work_order_id: string | null;
  created_by: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface TaskAssignment {
  id: string;
  task_id: string;
  user_id: string;
  tenant_id: string;
  created_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  tenant_id: string;
  content: string;
  created_at: string;
}

export function usePlanner() {
  const { currentTenantId, user } = useAuth();
  const qc = useQueryClient();
  const key = ['planner', currentTenantId];

  const plansQuery = useQuery({
    queryKey: [...key, 'plans'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_plans')
        .select('*')
        .eq('tenant_id', currentTenantId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PlannerPlan[];
    },
    enabled: !!currentTenantId,
  });

  const createPlan = useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('planner_plans')
        .insert({
          tenant_id: currentTenantId!,
          name: input.name,
          description: input.description || '',
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Create default buckets
      const defaultBuckets = ['A fazer', 'Em andamento', 'Concluído'];
      await supabase.from('planner_buckets').insert(
        defaultBuckets.map((name, i) => ({
          plan_id: data.id,
          tenant_id: currentTenantId!,
          name,
          sort_order: i,
        }))
      );

      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...key, 'plans'] });
      toast.success('Plano criado com sucesso');
    },
    onError: () => toast.error('Erro ao criar plano'),
  });

  const deletePlan = useMutation({
    mutationFn: async (planId: string) => {
      const { error } = await supabase.from('planner_plans').delete().eq('id', planId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...key, 'plans'] });
      toast.success('Plano excluído');
    },
  });

  const updatePlan = useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string }) => {
      const { error } = await supabase
        .from('planner_plans')
        .update({ name: input.name, description: input.description })
        .eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [...key, 'plans'] }),
  });

  return { plansQuery, createPlan, deletePlan, updatePlan };
}

export function usePlannerBoard(planId: string | null) {
  const { currentTenantId, user } = useAuth();
  const qc = useQueryClient();
  const key = ['planner', currentTenantId, 'board', planId];

  const bucketsQuery = useQuery({
    queryKey: [...key, 'buckets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_buckets')
        .select('*')
        .eq('plan_id', planId!)
        .order('sort_order');
      if (error) throw error;
      return data as PlannerBucket[];
    },
    enabled: !!planId,
  });

  const tasksQuery = useQuery({
    queryKey: [...key, 'tasks'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_tasks')
        .select('*')
        .eq('plan_id', planId!)
        .order('sort_order');
      if (error) throw error;
      return (data || []).map((t: any) => ({
        ...t,
        checklist: Array.isArray(t.checklist) ? t.checklist : [],
        labels: Array.isArray(t.labels) ? t.labels : [],
      })) as PlannerTask[];
    },
    enabled: !!planId,
  });

  const assignmentsQuery = useQuery({
    queryKey: [...key, 'assignments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_task_assignments')
        .select('*')
        .eq('tenant_id', currentTenantId!);
      if (error) throw error;
      return data as TaskAssignment[];
    },
    enabled: !!planId && !!currentTenantId,
  });

  const commentsQuery = useQuery({
    queryKey: [...key, 'comments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('planner_task_comments')
        .select('*')
        .eq('tenant_id', currentTenantId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data as TaskComment[];
    },
    enabled: !!planId && !!currentTenantId,
  });

  const invalidateAll = () => qc.invalidateQueries({ queryKey: key });

  const createBucket = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = (bucketsQuery.data || []).reduce((m, b) => Math.max(m, b.sort_order), -1);
      const { error } = await supabase.from('planner_buckets').insert({
        plan_id: planId!,
        tenant_id: currentTenantId!,
        name,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const updateBucket = useMutation({
    mutationFn: async (input: { id: string; name: string }) => {
      const { error } = await supabase.from('planner_buckets').update({ name: input.name }).eq('id', input.id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteBucket = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planner_buckets').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const createTask = useMutation({
    mutationFn: async (input: { bucket_id: string; title: string }) => {
      const maxOrder = (tasksQuery.data || [])
        .filter(t => t.bucket_id === input.bucket_id)
        .reduce((m, t) => Math.max(m, t.sort_order), -1);
      const { error } = await supabase.from('planner_tasks').insert({
        plan_id: planId!,
        bucket_id: input.bucket_id,
        tenant_id: currentTenantId!,
        title: input.title,
        created_by: user!.id,
        sort_order: maxOrder + 1,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const updateTask = useMutation({
    mutationFn: async (input: Partial<PlannerTask> & { id: string }) => {
      const { id, ...rest } = input;
      // Remove fields that shouldn't be sent to DB
      const { created_at, updated_at, plan_id, tenant_id, created_by, ...updateData } = rest as any;
      const { error } = await supabase.from('planner_tasks').update(updateData).eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planner_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const assignUser = useMutation({
    mutationFn: async (input: { task_id: string; user_id: string }) => {
      const { error } = await supabase.from('planner_task_assignments').insert({
        task_id: input.task_id,
        user_id: input.user_id,
        tenant_id: currentTenantId!,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const unassignUser = useMutation({
    mutationFn: async (input: { task_id: string; user_id: string }) => {
      const { error } = await supabase
        .from('planner_task_assignments')
        .delete()
        .eq('task_id', input.task_id)
        .eq('user_id', input.user_id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const addComment = useMutation({
    mutationFn: async (input: { task_id: string; content: string }) => {
      const { error } = await supabase.from('planner_task_comments').insert({
        task_id: input.task_id,
        user_id: user!.id,
        tenant_id: currentTenantId!,
        content: input.content,
      });
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  const deleteComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planner_task_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: invalidateAll,
  });

  return {
    bucketsQuery,
    tasksQuery,
    assignmentsQuery,
    commentsQuery,
    createBucket,
    updateBucket,
    deleteBucket,
    createTask,
    updateTask,
    deleteTask,
    assignUser,
    unassignUser,
    addComment,
    deleteComment,
    invalidateAll,
  };
}
