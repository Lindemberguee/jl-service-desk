
-- Step 1: Add 'analista' to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'analista' BEFORE 'leitura';
