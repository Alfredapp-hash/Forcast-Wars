-- Minimal RLS policies for Arkhe Neural Mesh tables (agent_synapses, plus tightening for agents/agent_memories).
-- These are intentionally conservative for a daemon/service-role primary access model.
-- Apply via Supabase SQL editor or MCP apply_migration / execute_sql as appropriate.
-- Review with get_advisors afterward.

-- 1) agent_synapses: daemon (service role) can do everything; no public client access by default.
alter table public.agent_synapses enable row level security;

-- Service role bypasses RLS, so these policies mainly protect against accidental anon/authenticated access.
create policy "service_role_full_access_synapses"
on public.agent_synapses
for all
to service_role
using (true)
with check (true);

-- Deny everything for anon and authenticated unless you explicitly want client-side reads later.
create policy "deny_anon_synapses"
on public.agent_synapses
for all
to anon
using (false);

create policy "deny_authenticated_synapses"
on public.agent_synapses
for all
to authenticated
using (false);

-- 2) (Optional tightening) agents and agent_memories — keep the same posture as before unless you decide to expose reads.
-- If you previously had no policies, the below just makes the intent explicit.

-- agents
create policy "service_role_full_access_agents"
on public.agents for all to service_role using (true) with check (true);
create policy "deny_anon_agents" on public.agents for all to anon using (false);
create policy "deny_authenticated_agents" on public.agents for all to authenticated using (false);

-- agent_memories
create policy "service_role_full_access_memories"
on public.agent_memories for all to service_role using (true) with check (true);
create policy "deny_anon_memories" on public.agent_memories for all to anon using (false);
create policy "deny_authenticated_memories" on public.agent_memories for all to authenticated using (false);

-- Note: If you later want limited authenticated reads (e.g. a signed-in user can read their own workspace memories),
-- you would add more targeted policies using workspace_id / user claims. For now the daemon owns the data.