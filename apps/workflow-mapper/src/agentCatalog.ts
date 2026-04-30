import { AGENT_REGISTRY } from "../../../src/agentRegistry";

export const AGENTS = AGENT_REGISTRY.map(agent => ({
  id: agent.id,
  name: agent.name,
  role: agent.role,
  cat: agent.category,
  color: agent.color,
  dur: agent.estimatedDuration
}));

export const agentById = (id: string) => AGENTS.find(agent => agent.id === id);
