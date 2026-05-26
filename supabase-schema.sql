create table if not exists public.zynx_agents (
  id text primary key,
  name text not null,
  status text not null check (status in ('published', 'deployed', 'deprecated')),
  tenant_scope text not null check (tenant_scope in ('global', 'scoped', 'private')),
  allowed_roles text not null,
  role text not null,
  category text not null,
  color text not null,
  estimated_duration integer not null check (estimated_duration > 0),
  mcp_tool text not null,
  backend_route text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zynx_workflows (
  id text primary key,
  name text not null,
  goal text,
  color text,
  created_at timestamptz,
  schedule_cron text,
  schedule_timezone text,
  context_passing text,
  source_file text,
  status text not null default 'draft' check (status in ('draft', 'active', 'paused', 'archived')),
  inserted_at timestamptz not null default now()
);

create table if not exists public.zynx_workflow_steps (
  id text primary key,
  workflow_id text not null references public.zynx_workflows(id) on delete cascade,
  step_number integer not null check (step_number > 0),
  agent_id text not null references public.zynx_agents(id),
  name text not null,
  role text,
  category text,
  estimated_duration integer check (estimated_duration > 0),
  config_json jsonb not null default '{}'::jsonb,
  unique (workflow_id, step_number)
);

create table if not exists public.zynx_workflow_edges (
  id text primary key,
  workflow_id text not null references public.zynx_workflows(id) on delete cascade,
  source_agent_id text not null references public.zynx_agents(id),
  target_agent_id text not null references public.zynx_agents(id),
  edge_order integer not null check (edge_order > 0)
);

create table if not exists public.zynx_workflow_runs (
  id text primary key,
  workflow_id text references public.zynx_workflows(id) on delete set null,
  workflow_name text,
  run_mode text not null check (run_mode in ('dry-run', 'execute', 'unknown')),
  run_state text,
  executed_by text,
  started_at timestamptz,
  duration_units integer,
  context_passing text,
  flow_source text,
  source_file text,
  inserted_at timestamptz not null default now()
);

create table if not exists public.zynx_agent_invocations (
  id text primary key,
  agent_id text references public.zynx_agents(id) on delete set null,
  workflow_run_id text references public.zynx_workflow_runs(id) on delete set null,
  tenant_id text not null,
  user_id text not null,
  trace_id text,
  status_code integer not null,
  duration_ms integer,
  tokens_used integer,
  model_used text,
  input_json jsonb not null default '{}'::jsonb,
  output_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.zynx_audit_events (
  id text primary key,
  agent_id text,
  tenant_id text not null,
  user_id text not null,
  trace_id text,
  action text not null,
  status_code integer not null,
  duration_ms integer,
  provider text,
  model text,
  created_at timestamptz not null default now()
);

alter table public.zynx_agents enable row level security;
alter table public.zynx_workflows enable row level security;
alter table public.zynx_workflow_steps enable row level security;
alter table public.zynx_workflow_edges enable row level security;
alter table public.zynx_workflow_runs enable row level security;
alter table public.zynx_agent_invocations enable row level security;
alter table public.zynx_audit_events enable row level security;
