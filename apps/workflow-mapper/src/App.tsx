import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { AGENTS, agentById } from "./agentCatalog";

const ZYNX_BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8790";
const ZYNX_MCP_URL = import.meta.env.VITE_MCP_URL ?? "http://localhost:3000";

const SERVICE_TARGETS = [
  { id: "backend", label: "Backend", url: ZYNX_BACKEND_URL, healthUrl: `${ZYNX_BACKEND_URL}/health` },
  { id: "mcp", label: "MCP", url: `${ZYNX_MCP_URL}/mcp`, healthUrl: `${ZYNX_MCP_URL}/health` },
  { id: "planner", label: "Planner", url: window.location.origin, healthUrl: window.location.href }
];

function emptyServiceStatus() {
  return SERVICE_TARGETS.reduce((acc, service) => {
    acc[service.id] = { state: "checking", message: "Checking", latencyMs: null };
    return acc;
  }, {});
}

async function checkService(service) {
  const start = performance.now();
  try {
    const res = await fetch(service.healthUrl, {
      method: service.id === "planner" ? "HEAD" : "GET",
      cache: "no-store"
    });
    return {
      state: res.ok ? "ok" : "error",
      message: res.ok ? "Online" : `HTTP ${res.status}`,
      latencyMs: Math.round(performance.now() - start)
    };
  } catch (error) {
    return {
      state: "error",
      message: error instanceof Error ? error.message : "Unavailable",
      latencyMs: null
    };
  }
}

function ServiceStatusBar({ status, onRefresh }) {
  return (
    <div style={{display:"flex", alignItems:"center", gap:8, minWidth:0}}>
      {SERVICE_TARGETS.map(service => {
        const item = status[service.id] || { state: "checking", message: "Checking", latencyMs: null };
        const color = item.state === "ok" ? "var(--accent-teal)" : item.state === "checking" ? "#f59e0b" : "#ef4444";
        return (
          <a
            key={service.id}
            href={service.url}
            target="_blank"
            rel="noreferrer"
            title={`${service.label}: ${service.url}\n${item.message}`}
            style={{
              display:"flex",
              alignItems:"center",
              gap:6,
              padding:"6px 9px",
              borderRadius:"999px",
              border:"1px solid var(--border-color)",
              background:"var(--bg-panel)",
              color:"var(--text-secondary)",
              textDecoration:"none",
              fontSize:11,
              whiteSpace:"nowrap"
            }}
          >
            <span style={{width:7,height:7,borderRadius:"50%",background:color,boxShadow:`0 0 8px ${color}`}} />
            <span style={{color:"var(--text-primary)",fontWeight:500}}>{service.label}</span>
            <span>{item.latencyMs !== null ? `${item.latencyMs}ms` : item.message}</span>
          </a>
        );
      })}
      <button
        onClick={onRefresh}
        style={{background:"transparent",border:"1px solid var(--border-color)",color:"var(--text-secondary)",borderRadius:"999px",padding:"6px 9px",fontSize:11,cursor:"pointer"}}
      >
        Refresh
      </button>
    </div>
  );
}

/* ── UTILS & EXPORTS ── */
function downloadString(text, fileType, fileName) {
  const blob = new Blob([text], { type: fileType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.download = fileName;
  a.href = url;
  a.click();
}

function slugWorkflowName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildExportPayload(steps, name, color) {
  const agents = steps.map((id, i) => {
    const a = agentById(id) || { name: id, role: "Unknown", cat: "worker", dur: 1 };
    return { step: i + 1, id, name: a.name, role: a.role, category: a.cat || "worker", estimatedDuration: a.dur || 1 };
  });
  return {
    workflow: {
      id: slugWorkflowName(name),
      name,
      color,
      created: new Date().toISOString(),
      agents,
      flow: { nodes: agents, edges: agents.slice(1).map((a, i) => ({ source: agents[i].id, target: a.id })) }
    }
  };
}

function toYAML(payload) {
  const a = payload.workflow;
  const rows = a.agents.map(ag => `  - step: ${ag.step}\n    id: ${ag.id}\n    name: "${ag.name}"\n    role: "${ag.role}"\n    category: ${ag.category}\n    estimatedDuration: ${ag.estimatedDuration}`).join("\n");
  const nodes = a.flow.nodes.map(node => `    - id: ${node.id}\n      type: agent\n      label: "${node.name}"\n      role: "${node.role}"\n      category: ${node.category}\n      estimatedDuration: ${node.estimatedDuration}`).join("\n");
  const edges = a.flow.edges.map(edge => `    - source: ${edge.source}\n      target: ${edge.target}`).join("\n");
  return `workflow:\n  id: ${a.id}\n  name: "${a.name}"\n  color: "${a.color}"\n  created: ${a.created}\n  agents:\n${rows}\n  flow:\n    nodes:\n${nodes}\n    edges:\n${edges}`;
}

/* ── GANTT CHART ── */
function GanttView({ steps }) {
  if (steps.length === 0) return null;
  const agents = steps.map(id=>agentById(id)).filter(Boolean);
  let cursor = 0;
  const rows = agents.map(a => {
    const start = cursor;
    cursor += a.dur || 1;
    return { ...a, start, end: cursor };
  });
  const total = cursor || 1;
  return (
    <div style={{marginTop:24, paddingTop:16, borderTop:"1px solid var(--border-color)"}}>
      <div style={{fontSize:11,fontWeight:600,marginBottom:12,color:"var(--text-secondary)", letterSpacing:"0.05em"}}>EXECUTION TIMELINE</div>
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:280}}>
          {rows.map((a, i)=>(
            <div key={a.id + i} style={{display:"flex",alignItems:"center",marginBottom:6}}>
              <div style={{width:90,flexShrink:0,fontSize:10,fontWeight:500,color:"var(--text-primary)",paddingRight:8,textAlign:"right", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{a.name}</div>
              <div style={{flex:1,position:"relative",height:18,background:"var(--bg-main)",borderRadius:4}}>
                <div style={{position:"absolute",left:`${(a.start/total)*100}%`,width:`${((a.dur||1)/total)*100}%`,height:"100%",background:a.color+"CC",borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{fontSize:9,color:"#fff"}}>{a.dur||1}u</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── FLOW ARTIFACT CANVAS (INLINE CHAT) ── */
function FlowArtifact({ plan, activeAgentId, logs, status }) {
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  if (!plan || plan.length === 0) return null;
  const agents = plan.map(id => agentById(id)).filter(Boolean);
  const nodeWidth = 140;
  const nodeHeight = 50;
  const gap = 24;
  const width = agents.length * nodeWidth + Math.max(0, agents.length - 1) * gap + 40;
  const height = 120;
  const edges = agents.slice(1).map((agent, index) => ({ source: agents[index], target: agent }));

  const isComplete = status === "finished";

  return (
    <div className="artifact-card">
      <div className="artifact-header">
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          Interactive Zynx Topology
        </div>
        <div style={{color:"var(--text-tertiary)"}}>{agents.length} AGENTS</div>
      </div>
      
      <div style={{ padding: "20px", background: "var(--bg-main)", overflowX: "auto", borderBottom: "1px solid var(--border-color)" }}>
        <svg width={Math.max(width, 400)} height={height} role="img" style={{ margin: "0 auto", display: "block", overflow: "visible" }}>
          <defs>
            <marker id="flow-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--text-tertiary)" />
            </marker>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="active-glow">
              <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
              <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          
          {edges.map(({source, target}, index) => {
            const x1 = 20 + index * (nodeWidth + gap) + nodeWidth;
            const x2 = x1 + gap - 6;
            const isSourceActive = source.id === activeAgentId;
            return (
              <line
                key={`${source.id}-${target.id}`}
                x1={x1} y1={height/2} x2={x2} y2={height/2}
                stroke={isSourceActive ? "var(--accent)" : "var(--border-color-light)"}
                strokeWidth={isSourceActive ? "2.5" : "1.5"}
                strokeDasharray={isSourceActive ? "4 4" : "none"}
                markerEnd="url(#flow-arrow)"
                style={{ animation: isSourceActive ? "dash 0.5s linear infinite" : "none" }}
              />
            );
          })}
          
          {agents.map((agent, index) => {
            const x = 20 + index * (nodeWidth + gap);
            const isActive = agent.id === activeAgentId;
            const log = logs.find(l => l.agent === agent.id);
            const isDone = !!log;
            const strokeColor = isActive ? "var(--accent)" : isDone ? "var(--accent-teal)" : "var(--border-color-light)";
            return (
              <g key={agent.id + index} transform={`translate(${x},${height/2 - nodeHeight/2})`} onClick={() => setSelectedAgentId(agent.id === selectedAgentId ? null : agent.id)} style={{cursor:"pointer", transition:"all 0.2s"}}>
                <rect width={nodeWidth} height={nodeHeight} rx="6" fill={agent.id === selectedAgentId ? "var(--border-color-light)" : "var(--bg-panel)"} stroke={agent.id === selectedAgentId ? "var(--text-primary)" : strokeColor} strokeWidth={isActive || agent.id === selectedAgentId ? "2" : "1"} filter={isActive ? "url(#active-glow)" : "none"} />
                <rect width="20" height="20" x="10" y="15" rx="4" fill={isDone?"var(--accent-teal)":"var(--border-color)"} opacity="0.2"/>
                <text x="20" y="29" textAnchor="middle" fontSize="9" fontWeight="600" fill={isDone?"var(--accent-teal)":"var(--text-secondary)"}>{isDone?"✓":index + 1}</text>
                <text x="38" y="22" fontSize="10" fontWeight="600" fill="var(--text-primary)">
                  {agent.name.length > 15 ? `${agent.name.slice(0, 14)}…` : agent.name}
                </text>
                <text x="38" y="36" fontSize="9" fill="var(--text-secondary)">
                  {agent.role.length > 20 ? `${agent.role.slice(0, 19)}…` : agent.role}
                </text>
                {isActive && (
                   <circle cx={nodeWidth} cy="0" r="4" fill="var(--accent)"><animate attributeName="opacity" values="0.2;1;0.2" dur="1s" repeatCount="indefinite" /></circle>
                )}
              </g>
            );
          })}
        </svg>
        <style>{`@keyframes dash { to { stroke-dashoffset: -8; } }`}</style>
      </div>

      {selectedAgentId && (() => {
        const selAgent = agentById(selectedAgentId);
        if (!selAgent) return null;
        return (
          <div style={{padding:"12px 16px", background:"var(--border-color)", borderBottom:"1px solid var(--border-color-light)", display:"flex", flexDirection:"column", gap:8}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
              <div>
                <div style={{fontSize:10, color:"var(--text-tertiary)", letterSpacing:"0.05em", textTransform:"uppercase", marginBottom:2}}>AGENT DETAILS</div>
                <div style={{fontSize:14, fontWeight:600, color:"var(--text-primary)"}}>{selAgent.name} <span style={{fontSize:11, fontWeight:400, color:"var(--text-secondary)"}}>({selAgent.id})</span></div>
              </div>
              <button onClick={()=>setSelectedAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer", padding:4}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{fontSize:12, color:"var(--text-secondary)", lineHeight:1.5}}>{selAgent.role}</div>
            <div style={{display:"flex", gap:6, flexWrap:"wrap", marginTop:4}}>
              <span style={{fontSize:10, padding:"2px 8px", borderRadius:"100px", background:"var(--bg-main)", color:"var(--text-primary)", border:"1px solid var(--border-color-light)", textTransform:"uppercase"}}>{selAgent.cat}</span>
              <span style={{fontSize:10, padding:"2px 8px", borderRadius:"100px", background:"rgba(155,93,229,0.1)", color:"#9b5de5", border:"1px solid rgba(155,93,229,0.3)"}}>MCP Capable</span>
            </div>
          </div>
        );
      })()}

      <div style={{background:"var(--bg-panel)", maxHeight: "200px", overflowY:"auto"}}>
        {plan.map((agentId, i) => {
          const agent = agentById(agentId) || { name: agentId };
          const log = logs.find(l => l.agent === agentId);
          const isActive = activeAgentId === agentId;
          const isDone = !!log;
          return (
            <div key={i} className="agent-checklist-item" style={{opacity: (isDone||isActive||isComplete)?1:0.5}}>
              <div style={{marginTop:2}}>
                {isDone ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-teal)" strokeWidth="3"><path d="M20 6 9 17l-5-5"/></svg>
                : isActive ? <div className="spinner" style={{width:12,height:12,borderTopColor:"var(--accent)",borderWidth:2}}/>
                : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>}
              </div>
              <div style={{flex:1}}>
                <div style={{fontSize:12, fontWeight:500, color:(isActive||isDone)?"var(--text-primary)":"var(--text-secondary)"}}>
                  {agent.name} {isActive && <span className="pulse-text" style={{fontSize:10, color:"var(--accent)", marginLeft:6}}>(running...)</span>}
                </div>
                {log && log.result && (
                  <div style={{marginTop:4, padding:"6px 10px", background:"var(--bg-main)", borderRadius:4, fontSize:11, fontFamily:"var(--font-mono)", color:"var(--text-secondary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", border:"1px solid var(--border-color)"}}>
                    {JSON.stringify(log.result.message || log.result).slice(0, 100)}...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── MAIN APP ── */
export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [serviceStatus, setServiceStatus] = useState(emptyServiceStatus);
  const [chatMode, setChatMode] = useState("workflow"); // "workflow" | "deeja"
  
  // Layout & Builder State
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [rightTab, setRightTab] = useState("registry"); // "registry" | "builder"
  
  // Power User Builder State
  const [steps, setSteps] = useState([]);
  const [buildName, setBuildName] = useState("Zynx_Pathway");
  const [buildColor, setBuildColor] = useState("#9b5de5");
  const [activeAgentId, setActiveAgentId] = useState(null);

  // Skill Editor State
  const [editingSkillAgentId, setEditingSkillAgentId] = useState(null);
  const [activePane, setActivePane] = useState('details'); // 'details' | 'tools-main' | 'add-mcp' | 'add-vertex'
  const [skillForm, setSkillForm] = useState({
    name: "",
    description: "",
    instructions: "",
    model: "Gemini 3 Flash (preview)",
    tools: ["Google Search", "URL Context"]
  });
  const [mcpForm, setMcpForm] = useState({ name: "", url: "", auth: "None" });
  const [vertexForm, setVertexForm] = useState({ projectId: "", location: "global", collectionId: "", dataStoreId: "" });
  const [isSavingSkill, setIsSavingSkill] = useState(false);
  
  // LLM Settings
  const [showSettings, setShowSettings] = useState(false);
  const [llmSettings, setLlmSettings] = useState(() => {
    const saved = localStorage.getItem("zynx_llm_settings");
    return saved ? JSON.parse(saved) : {
      provider: "local",
      apiKey: "",
      baseUrl: "https://api.openai.com/v1",
      model: "gpt-4o-mini"
    };
  });

  useEffect(() => {
    localStorage.setItem("zynx_llm_settings", JSON.stringify(llmSettings));
  }, [llmSettings]);

  const parseSkillContent = (content) => {
    let parsed = { name: "", description: "", instructions: content, model: "Gemini 3 Flash (preview)", tools: ["Google Search", "URL Context"] };
    if (content.startsWith("---")) {
      const parts = content.split("---");
      if (parts.length >= 3) {
        const fm = parts[1];
        parsed.instructions = parts.slice(2).join("---").trim();
        fm.split("\\n").forEach(line => {
          const match = line.match(/^([a-z]+):\\s*(.*)$/i);
          if (match) {
            const [, key, val] = match;
            if (key.toLowerCase() === "tools") {
              parsed.tools = val.split(",").map(s => s.trim()).filter(Boolean);
            } else {
              parsed[key.toLowerCase()] = val.trim();
            }
          }
        });
      }
    }
    return parsed;
  };

  const serializeSkillContent = () => {
    return `---
name: ${skillForm.name}
description: ${skillForm.description}
model: ${skillForm.model}
tools: ${skillForm.tools.join(", ")}
---

${skillForm.instructions}`;
  };

  const openSkillEditor = async (e, agentId) => {
    e.stopPropagation();
    setEditingSkillAgentId(agentId);
    setActivePane('details');
    const ag = agentById(agentId);
    setSkillForm({
      name: ag?.name || "",
      description: ag?.role || "",
      instructions: "Loading...",
      model: "Gemini 3 Flash (preview)",
      tools: ["Google Search", "URL Context"]
    });
    setMcpForm({ name: "", url: "", auth: "None" });
    setVertexForm({ projectId: "", location: "global", collectionId: "", dataStoreId: "" });
    try {
      const res = await fetch(`${ZYNX_BACKEND_URL}/agents/${agentId}/skill`);
      const data = await res.json();
      if (data.skill) {
        const parsed = parseSkillContent(data.skill);
        if (!parsed.name) parsed.name = ag?.name || "";
        if (!parsed.description) parsed.description = ag?.role || "";
        setSkillForm(parsed);
      } else {
        setSkillForm(prev => ({...prev, instructions: ""}));
      }
    } catch (err) {
      setSkillForm(prev => ({...prev, instructions: "Error loading skill."}));
    }
  };

  const saveSkill = async () => {
    if (!editingSkillAgentId) return;
    setIsSavingSkill(true);
    try {
      await fetch(`${ZYNX_BACKEND_URL}/agents/${editingSkillAgentId}/skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: serializeSkillContent() })
      });
      setEditingSkillAgentId(null);
    } catch (err) {
      alert("Failed to save skill");
    } finally {
      setIsSavingSkill(false);
    }
  };

  // Registry State
  const [catFilter, setCatFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const CAT_ORDER = ["core","ui","data","worker","biz","output"];
  const filteredAgents = AGENTS.filter(a => {
    const matchCat = catFilter === "all" || a.cat === catFilter;
    const matchSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) || a.role.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages]);

  async function refreshServiceStatus() {
    setServiceStatus(emptyServiceStatus());
    const entries = await Promise.all(
      SERVICE_TARGETS.map(async service => [service.id, await checkService(service)])
    );
    setServiceStatus(Object.fromEntries(entries));
  }

  useEffect(() => {
    refreshServiceStatus();
    const timer = window.setInterval(refreshServiceStatus, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const addMessage = (role, content, metadata = null) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), role, content, metadata }]);
  };

  const updateLastMessageMetadata = (metadataUpdate) => {
    setMessages(prev => {
      const newMsgs = [...prev];
      if (newMsgs.length === 0) return prev;
      const last = newMsgs[newMsgs.length - 1];
      newMsgs[newMsgs.length - 1] = { ...last, metadata: { ...last.metadata, ...metadataUpdate } };
      return newMsgs;
    });
  };

  const executePathway = async (agentsToRun, userText) => {
    let context = {};
    for (let i = 0; i < agentsToRun.length; i++) {
      const agentId = agentsToRun[i];
      if (agentId === "task-planner") continue;
      
      setActiveAgentId(agentId);
      updateLastMessageMetadata({ currentAgent: agentId });
      
      try {
        const stepRes = await fetch(`${ZYNX_BACKEND_URL}/agents/${agentId}/invoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ input: { goal: userText, context } })
        });
        const stepData = await stepRes.json();
        if (!stepRes.ok) throw new Error(stepData.error || "Execution failed");
        context = { ...context, [agentId]: stepData.output };
        
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          const newLogs = [...(last.metadata.logs || []), { agent: agentId, status: "success", result: stepData.output }];
          newMsgs[newMsgs.length - 1] = { ...last, metadata: { ...last.metadata, logs: newLogs } };
          return newMsgs;
        });
      } catch (err) {
        updateLastMessageMetadata({ status: "error", error: err.message });
        break;
      }
    }
    setActiveAgentId(null);
  };

  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userText = input.trim();
    setInput("");
    addMessage("user", userText);
    setIsProcessing(true);

    addMessage("assistant", chatMode === "workflow" ? "Orchestrating workflow..." : "Deeja is typing...", { status: "planning", plan: null, logs: [], currentAgent: null });

    try {
      if (chatMode === "deeja") {
        const deejaRes = await fetch(`${ZYNX_BACKEND_URL}/agents/deeja/invoke`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "x-zynx-llm-provider": llmSettings.provider,
            "x-openai-api-key": llmSettings.apiKey,
            "x-openai-base-url": llmSettings.baseUrl,
            "x-openai-model": llmSettings.model
          },
          body: JSON.stringify({ input: { goal: userText } })
        });
        const deejaData = await deejaRes.json();
        if (!deejaRes.ok) throw new Error(deejaData.error || "Deeja request failed");
        
        setMessages(prev => {
          const newMsgs = [...prev];
          const last = newMsgs[newMsgs.length - 1];
          newMsgs[newMsgs.length - 1] = { 
            ...last, 
            content: deejaData.output?.message || "Done.", 
            metadata: { 
              ...last.metadata, 
              status: "finished", 
              actionableCard: deejaData.output?.actionableCard 
            } 
          };
          return newMsgs;
        });
        return;
      }

      const planRes = await fetch(`${ZYNX_BACKEND_URL}/agents/task-planner/invoke`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "x-zynx-llm-provider": llmSettings.provider,
          "x-openai-api-key": llmSettings.apiKey,
          "x-openai-base-url": llmSettings.baseUrl,
          "x-openai-model": llmSettings.model
        },
        body: JSON.stringify({ input: { goal: userText } })
      });
      const planData = await planRes.json();
      if (!planRes.ok) throw new Error(planData.error || "Planning failed");
      
      const agentsToRun = planData.output.routeSummary.map(r => r.agentId);
      const filteredAgentsToRun = agentsToRun.filter(a => a !== "task-planner");

      // Auto-populate Builder
      setSteps(filteredAgentsToRun);
      setBuildName("Auto_" + slugWorkflowName(userText.slice(0,10)));
      setRightOpen(true);
      setRightTab("builder");

      updateLastMessageMetadata({ 
        status: "executing", 
        plan: filteredAgentsToRun,
        message: planData.output.message 
      });

      await executePathway(filteredAgentsToRun, userText);
      
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last.metadata.status !== "error") {
           const finalMarkdown = "ได้ครบแล้ว — สรุปสิ่งที่ส่งมอบ:\n\n**Interactive topology diagram** — click แต่ละ node บนแผนผังด้านล่างเพื่อดูรายละเอียด\n\n**" + filteredAgentsToRun.length + " Zynx Agents Pathway:**\n" + filteredAgentsToRun.map(id => { const a = agentById(id); return "- " + (a ? "**"+a.name+"** — "+a.role : id); }).join('\n') + "\n\n**Quick start:**\n```bash\nnpm run workflow:run -- --execute\n```";
           newMsgs[newMsgs.length - 1] = { ...last, content: finalMarkdown, metadata: { ...last.metadata, status: "finished", currentAgent: null } };
        }
        return newMsgs;
      });

      } catch (err) {
        updateLastMessageMetadata({ status: "error", error: err.message });
      } finally {
      setIsProcessing(false);
    }
  };

  const handleManualDeploy = async () => {
    if (steps.length === 0 || isProcessing) return;
    setIsProcessing(true);
    addMessage("user", "Execute the current manual pathway in the Builder.");
    addMessage("assistant", "", { status: "executing", plan: steps, logs: [], message: "Executing custom builder pathway." });
    try {
      await executePathway(steps, "Manual execution");
      setMessages(prev => {
        const newMsgs = [...prev];
        const last = newMsgs[newMsgs.length - 1];
        if (last.metadata.status !== "error") {
           const finalMarkdown = "ดำเนินการแบบ Custom เรียบร้อยแล้ว:\n\n**Interactive topology diagram** — ดูรายละเอียดได้ที่ Artifact ด้านล่าง\n\n**" + steps.length + " Custom Agents Pathway:**\n" + steps.map(id => { const a = agentById(id); return "- " + (a ? "**"+a.name+"** — "+a.role : id); }).join('\n') + "\n\n**Quick start:**\n```bash\nnpm run workflow:run -- --execute\n```";
           newMsgs[newMsgs.length - 1] = { ...last, content: finalMarkdown, metadata: { ...last.metadata, status: "finished", currentAgent: null } };
        }
        return newMsgs;
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Builder Actions
  const addAgentToBuilder = (id) => {
    setSteps(prev => [...prev, id]);
    setRightTab("builder");
  };
  const removeStep = (index) => {
    setSteps(prev => prev.filter((_, i) => i !== index));
  };
  const moveStep = (index, direction) => {
    if (index + direction < 0 || index + direction >= steps.length) return;
    setSteps(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + direction];
      copy[index + direction] = temp;
      return copy;
    });
  };
  const doExportJSON = () => {
    const payload = buildExportPayload(steps, buildName, buildColor);
    downloadString(JSON.stringify(payload, null, 2), "application/json", `${payload.workflow.id}.json`);
  };
  const doExportYAML = () => {
    const payload = buildExportPayload(steps, buildName, buildColor);
    downloadString(toYAML(payload), "text/yaml", `${payload.workflow.id}.yaml`);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: "hidden" }}>
      
      {/* LEFT SIDEBAR: Claude Style History */}
      <div style={{ 
        width: leftOpen ? 260 : 0, 
        opacity: leftOpen ? 1 : 0,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s",
        borderRight: "1px solid var(--border-color)",
        background: "var(--bg-sidebar)",
        display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0
      }}>
        <div style={{padding:"16px", display:"flex", alignItems:"center", gap:10}}>
          <div style={{width:24,height:24,background:"var(--text-primary)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--bg-sidebar)",fontWeight:"bold",fontSize:14}}>Z</div>
          <div style={{fontSize:15, fontWeight:600}}>Zynx</div>
        </div>
        <div style={{padding:"0 16px 16px"}}>
           <button onClick={()=>setMessages([])} style={{width:"100%", padding:"10px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"transparent", color:"var(--text-primary)", fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", gap:8}} onMouseOver={e=>e.currentTarget.style.background="var(--bg-panel)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
             New Chat
           </button>
        </div>
        <div style={{flex:1, overflowY:"auto", padding:"0 16px"}}>
           <div style={{fontSize:11, fontWeight:600, color:"var(--text-tertiary)", marginTop:12, marginBottom:12}}>Recent</div>
           <div style={{display:"flex", flexDirection:"column", gap:2}}>
             {["Zynx API deployment", "Data validation pipeline", "Setup automated reports"].map((h,i) => (
                <div key={i} style={{fontSize:13, color:"var(--text-secondary)", padding:"8px 10px", borderRadius:"var(--radius-sm)", cursor:"pointer", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}} 
                     onMouseOver={e=>e.currentTarget.style.background="var(--bg-panel)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>{h}</div>
             ))}
           </div>
        </div>
        <div style={{padding:"16px", borderTop:"1px solid var(--border-color)", display:"flex", alignItems:"center", gap:10}}>
           <div style={{width:32,height:32,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"bold",color:"#fff"}}>K</div>
           <div style={{fontSize:13,fontWeight:500}}>Kant</div>
        </div>
      </div>

      {/* CENTER PANEL: Main Chat */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", background: "var(--bg-main)" }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px"}}>
          <button onClick={()=>setLeftOpen(!leftOpen)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer", padding:6, borderRadius:"var(--radius-sm)"}} onMouseOver={e=>e.currentTarget.style.background="var(--bg-panel)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
          </button>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,minWidth:0}}>
            <div style={{display:"flex", alignItems:"center", gap:16}}>
              <div onClick={()=>setShowSettings(true)} style={{fontSize:13, fontWeight:500, color:"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", gap:6, padding:"4px 8px", borderRadius:4, background:"var(--bg-panel)"}}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                {llmSettings.provider === "local" ? "Local" : llmSettings.provider.toUpperCase()}
              </div>
              
              <div style={{display:"flex", background:"var(--bg-panel)", border:"1px solid var(--border-color)", borderRadius:"100px", overflow:"hidden"}}>
                <button onClick={() => setChatMode("workflow")} style={{background:chatMode==="workflow"?"var(--text-primary)":"transparent", color:chatMode==="workflow"?"var(--bg-main)":"var(--text-secondary)", border:"none", padding:"4px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.2s"}}>Workflow</button>
                <button onClick={() => setChatMode("deeja")} style={{background:chatMode==="deeja"?"var(--text-primary)":"transparent", color:chatMode==="deeja"?"var(--bg-main)":"var(--text-secondary)", border:"none", padding:"4px 12px", fontSize:12, fontWeight:500, cursor:"pointer", transition:"all 0.2s"}}>Deeja</button>
              </div>

            </div>
            <ServiceStatusBar status={serviceStatus} onRefresh={refreshServiceStatus} />
          </div>
          <button onClick={()=>setRightOpen(!rightOpen)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer", padding:6, borderRadius:"var(--radius-sm)", display:"flex", alignItems:"center", gap:6}} onMouseOver={e=>e.currentTarget.style.background="var(--bg-panel)"} onMouseOut={e=>e.currentTarget.style.background="transparent"}>
             <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
             <span style={{fontSize:13}}>Workshop</span>
          </button>
        </div>

        <div ref={chatRef} style={{flex:1, overflowY:"auto", padding:"24px", display:"flex", flexDirection:"column", alignItems:"center"}}>
          <div style={{width:"100%", maxWidth:800, display:"flex", flexDirection:"column", gap:32}}>
            {messages.length === 0 ? (
              <div style={{display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", minHeight:"50vh", opacity:0.8}}>
                 {chatMode === "workflow" ? (
                   <>
                     <div style={{fontSize:28, fontWeight:500, marginBottom:32, color:"var(--text-primary)"}}>Good morning, Kant.</div>
                     <div style={{display:"flex", gap:12, flexWrap:"wrap", justifyContent:"center", maxWidth:600}}>
                       {[ {title:"Run Governance", sub:"Validate workspace rules"}, {title:"Data Migration", sub:"Extract & load to Postgres"}, {title:"Code Review", sub:"Analyze recent commits"}].map(q => (
                         <div key={q.title} onClick={()=>setInput(q.title)} style={{padding:"14px 18px", borderRadius:"var(--radius-lg)", border:"1px solid var(--border-color)", background:"var(--bg-panel)", cursor:"pointer", minWidth:200}} onMouseOver={e=>e.currentTarget.style.borderColor="var(--text-tertiary)"} onMouseOut={e=>e.currentTarget.style.borderColor="var(--border-color)"}>
                           <div style={{fontSize:14, fontWeight:500, color:"var(--text-primary)", marginBottom:4}}>{q.title}</div>
                           <div style={{fontSize:12, color:"var(--text-secondary)"}}>{q.sub}</div>
                         </div>
                       ))}
                     </div>
                   </>
                 ) : (
                   <div style={{fontSize:22, fontWeight:500, color:"var(--text-primary)", textAlign:"center", lineHeight:1.6}}>
                     สวัสดีค่ะ ฉันคือ Deeja ผู้ช่วยประสานงาน Zynx ของคุณ<br/>พิมพ์สิ่งที่คุณต้องการให้ฉันช่วยได้เลยค่ะ 😊
                   </div>
                 )}
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} style={{ display: "flex", gap: 16, width:"100%" }}>
                  <div style={{ width: 32, height: 32, borderRadius: msg.role==="user"?"50%":"8px", background: msg.role === "user" ? "var(--bg-panel)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {msg.role === "user" ? <div style={{width:24,height:24,borderRadius:"50%",background:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:"bold",color:"#fff"}}>K</div>
                    : <div style={{width:28,height:28,background:"var(--text-primary)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--bg-main)",fontWeight:"bold",fontSize:14}}>Z</div>}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4, minWidth:0 }}>
                    <div className="markdown-body" style={{ minWidth:0, flex:1 }}>
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                    {(msg.metadata?.plan) && (
                      <FlowArtifact plan={msg.metadata.plan} activeAgentId={msg.metadata.currentAgent} logs={msg.metadata.logs || []} status={msg.metadata.status} />
                    )}
                    {(msg.metadata?.actionableCard) && (
                      <div style={{ marginTop:16, padding: "16px", background: "rgba(0,0,0,0.2)", border: "1px solid var(--border-color)", borderRadius: "var(--radius-lg)" }}>
                        <div style={{ fontWeight:600, color:"var(--accent-teal)", marginBottom:4 }}>{msg.metadata.actionableCard.title || "Summary"}</div>
                        <div style={{ fontSize:11, color:"var(--text-tertiary)", marginBottom:12 }}>Status: {msg.metadata.actionableCard.status || "N/A"}</div>
                        {msg.metadata.actionableCard.summary && <div style={{ fontSize:13, color:"var(--text-secondary)", marginBottom:12 }}>{msg.metadata.actionableCard.summary}</div>}
                        {Array.isArray(msg.metadata.actionableCard.suggestedActions) && (
                          <ul style={{ margin:0, paddingLeft:20, fontSize:13, color:"var(--text-primary)" }}>
                            {msg.metadata.actionableCard.suggestedActions.map((act, i) => <li key={i}>{act}</li>)}
                          </ul>
                        )}
                      </div>
                    )}
                    {msg.metadata?.status === "error" && (
                      <div style={{ marginTop:16, color: "#ef4444", background: "rgba(239, 68, 68, 0.1)", padding: "12px 16px", borderRadius: "var(--radius-md)", border: "1px solid rgba(239, 68, 68, 0.2)", fontSize: 13 }}>
                        Execution Error: {msg.metadata.error}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div style={{ padding: "0 24px 24px", display:"flex", justifyContent:"center" }}>
          <div style={{ width:"100%", maxWidth: 800, position: "relative", background: "var(--bg-input)", borderRadius: "var(--radius-xl)", border: "1px solid var(--border-color)", padding: "12px 16px", display: "flex", alignItems: "flex-end", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}>
            <textarea
              value={input} onChange={e => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
              placeholder="Ask Zynx to run a workflow..." rows={Math.min(8, input.split('\\n').length || 1)}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "var(--text-primary)", fontSize: 15, resize: "none", padding: "6px 0", lineHeight: 1.5, maxHeight: 200 }} disabled={isProcessing}
            />
            <button
              onClick={handleSubmit} disabled={!input.trim() || isProcessing}
              style={{ width: 34, height: 34, borderRadius: "50%", background: input.trim() && !isProcessing ? "var(--text-primary)" : "var(--bg-panel)", border: "none", cursor: input.trim() && !isProcessing ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink:0 }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={input.trim() && !isProcessing ? "var(--bg-main)" : "var(--text-tertiary)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT SIDEBAR: Power-User Workshop (Registry & Builder) */}
      <div style={{ 
        width: rightOpen ? 340 : 0, 
        opacity: rightOpen ? 1 : 0,
        transition: "width 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s",
        borderLeft: "1px solid var(--border-color)",
        background: "var(--bg-sidebar)",
        display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0
      }}>
        {/* Tabs */}
        <div style={{display:"flex", borderBottom:"1px solid var(--border-color)", padding:"0 16px"}}>
          <button onClick={()=>setRightTab("registry")} style={{flex:1, padding:"16px 0", background:"transparent", border:"none", borderBottom:rightTab==="registry"?"2px solid var(--accent)":"2px solid transparent", color:rightTab==="registry"?"var(--text-primary)":"var(--text-secondary)", fontWeight:500, fontSize:13, cursor:"pointer"}}>Registry</button>
          <button onClick={()=>setRightTab("builder")} style={{flex:1, padding:"16px 0", background:"transparent", border:"none", borderBottom:rightTab==="builder"?"2px solid var(--accent)":"2px solid transparent", color:rightTab==="builder"?"var(--text-primary)":"var(--text-secondary)", fontWeight:500, fontSize:13, cursor:"pointer"}}>Builder ({steps.length})</button>
          <button onClick={()=>setRightOpen(false)} style={{padding:"16px 0 16px 16px", background:"transparent", border:"none", color:"var(--text-tertiary)", cursor:"pointer"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
        </div>

        {rightTab === "registry" && (
          <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
            <div style={{padding:"16px"}}>
              <input type="text" placeholder="Search agents..." value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                style={{width:"100%", padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-input)", color:"var(--text-primary)", fontSize:13, outline:"none"}} />
            </div>
            <div style={{padding:"0 16px 12px", display:"flex", gap:6, flexWrap:"wrap"}}>
              {["all",...CAT_ORDER].map(c=>(
                <button key={c} onClick={()=>setCatFilter(c)}
                  style={{fontSize:11,padding:"4px 10px",borderRadius:"100px", border:`1px solid ${catFilter===c?"var(--text-secondary)":"var(--border-color)"}`, background:catFilter===c?"var(--bg-panel)":"transparent",cursor:"pointer",color:catFilter===c?"var(--text-primary)":"var(--text-secondary)", textTransform:"capitalize"}}>{c}</button>
              ))}
            </div>
            <div style={{flex:1, overflowY:"auto", padding:"0 16px 16px", display:"flex", flexDirection:"column", gap:8}}>
              {filteredAgents.map(agent=>(
                <div key={agent.id} onClick={()=>addAgentToBuilder(agent.id)} style={{display:"flex",gap:12,padding:"10px",borderRadius:"var(--radius-md)",border:"1px solid var(--border-color)",background:"var(--bg-panel)",cursor:"pointer"}} onMouseOver={e=>e.currentTarget.style.borderColor="var(--accent)"} onMouseOut={e=>e.currentTarget.style.borderColor="var(--border-color)"}>
                  <div style={{width:28,height:28,borderRadius:"6px",background:agent.color+"15",border:`1px solid ${agent.color}40`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={agent.color} strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:13,fontWeight:500,color:"var(--text-primary)",marginBottom:2}}>{agent.name}</div>
                    <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.4}}>{agent.role}</div>
                  </div>
                  <button onClick={(e) => openSkillEditor(e, agent.id)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer", padding:4, display:"flex", alignItems:"center", justifyContent:"center"}} onMouseOver={e=>e.currentTarget.style.color="var(--accent)"} onMouseOut={e=>e.currentTarget.style.color="var(--text-secondary)"} title="Edit Skill">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rightTab === "builder" && (
          <div style={{flex:1, display:"flex", flexDirection:"column", overflow:"hidden"}}>
            <div style={{flex:1, overflowY:"auto", padding:"16px"}}>
              <div style={{display:"flex", gap:12, marginBottom:16}}>
                <div style={{flex:1}}>
                  <div style={{fontSize:11, fontWeight:500, color:"var(--text-secondary)", marginBottom:4}}>PATHWAY NAME</div>
                  <input type="text" value={buildName} onChange={e=>setBuildName(e.target.value)} style={{width:"100%", padding:"8px 12px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"var(--bg-input)", color:"var(--text-primary)", fontSize:13, outline:"none"}} />
                </div>
                <div style={{width:60}}>
                  <div style={{fontSize:11, fontWeight:500, color:"var(--text-secondary)", marginBottom:4}}>COLOR</div>
                  <input type="color" value={buildColor} onChange={e=>setBuildColor(e.target.value)} style={{width:"100%", height:34, padding:0, borderRadius:"var(--radius-sm)", border:"none", cursor:"pointer", background:"transparent"}} />
                </div>
              </div>

              <div style={{fontSize:11, fontWeight:600, color:"var(--text-secondary)", marginBottom:12, letterSpacing:"0.05em"}}>ACTIVE SEQUENCE ({steps.length})</div>
              {steps.length === 0 ? (
                 <div style={{fontSize:12, color:"var(--text-tertiary)", fontStyle:"italic", textAlign:"center", padding:24}}>No agents added.<br/>Chat with AI or add from Registry.</div>
              ) : (
                <div style={{display:"flex", flexDirection:"column", gap:8}}>
                  {steps.map((id, index) => {
                    const agent = agentById(id);
                    const isRunning = activeAgentId === id;
                    return (
                      <div key={index + id} style={{display:"flex", alignItems:"center", gap:8, padding:"8px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:isRunning?"var(--accent-light)":"var(--bg-panel)"}}>
                        <div style={{display:"flex", flexDirection:"column", gap:2}}>
                          <button onClick={()=>moveStep(index, -1)} disabled={index===0} style={{background:"transparent", border:"none", color:index===0?"var(--border-color)":"var(--text-secondary)", cursor:index===0?"default":"pointer", padding:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg></button>
                          <button onClick={()=>moveStep(index, 1)} disabled={index===steps.length-1} style={{background:"transparent", border:"none", color:index===steps.length-1?"var(--border-color)":"var(--text-secondary)", cursor:index===steps.length-1?"default":"pointer", padding:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg></button>
                        </div>
                        <div style={{flex:1, overflow:"hidden"}}>
                          <div style={{fontSize:13, fontWeight:500, color:"var(--text-primary)", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{agent.name}</div>
                          <div style={{fontSize:11, color:"var(--text-tertiary)"}}>{agent.cat}</div>
                        </div>
                        <button onClick={()=>removeStep(index)} style={{background:"transparent", border:"none", color:"var(--text-tertiary)", cursor:"pointer", padding:6}} onMouseOver={e=>e.currentTarget.style.color="#ef4444"} onMouseOut={e=>e.currentTarget.style.color="var(--text-tertiary)"}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              <GanttView steps={steps} />
            </div>

            <div style={{padding:"16px", borderTop:"1px solid var(--border-color)", background:"var(--bg-sidebar)", display:"flex", flexDirection:"column", gap:8}}>
              <div style={{display:"flex", gap:8}}>
                <button onClick={doExportJSON} disabled={steps.length===0} style={{flex:1, padding:"8px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"var(--bg-panel)", color:"var(--text-primary)", fontSize:11, cursor:steps.length?"pointer":"not-allowed"}}>EXPORT JSON</button>
                <button onClick={doExportYAML} disabled={steps.length===0} style={{flex:1, padding:"8px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"var(--bg-panel)", color:"var(--text-primary)", fontSize:11, cursor:steps.length?"pointer":"not-allowed"}}>EXPORT YAML</button>
              </div>
              <button onClick={handleManualDeploy} disabled={steps.length===0 || isProcessing} style={{width:"100%", padding:"12px", borderRadius:"var(--radius-sm)", border:"none", background:"var(--accent)", color:"#fff", fontSize:13, fontWeight:600, cursor:(steps.length&&!isProcessing)?"pointer":"not-allowed", transition:"opacity 0.2s", opacity:(steps.length&&!isProcessing)?1:0.5}}>
                {isProcessing ? "EXECUTING..." : "EXECUTE PATHWAY"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Skill Editor Modal */}
      {editingSkillAgentId && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"flex-end"}}>
          <div style={{width:480, height:"100%", background:"var(--bg-panel)", borderLeft:"1px solid var(--border-color)", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"-10px 0 40px rgba(0,0,0,0.5)", animation:"slideIn 0.2s ease"}}>
            <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border-color)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg-main)"}}>
              <div style={{fontWeight:600, fontSize:15, color:"var(--text-primary)"}}>Details</div>
              <button onClick={()=>setEditingSkillAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            
            <div style={{flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:20}}>
              {/* Name */}
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Name</label>
                <div style={{position:"relative"}}>
                  <input 
                    type="text" 
                    value={skillForm.name} 
                    onChange={e => setSkillForm({...skillForm, name: e.target.value})}
                    style={{width:"100%", padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}}
                  />
                  <div style={{textAlign:"right", fontSize:11, color:"var(--text-tertiary)", marginTop:4}}>{skillForm.name.length} / 128</div>
                </div>
              </div>

              {/* Description */}
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:6}}>
                  Description 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </label>
                <div style={{position:"relative"}}>
                  <textarea 
                    value={skillForm.description} 
                    onChange={e => setSkillForm({...skillForm, description: e.target.value})}
                    rows={3}
                    style={{width:"100%", padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, resize:"vertical", outline:"none"}}
                  />
                  <div style={{textAlign:"right", fontSize:11, color:"var(--text-tertiary)", marginTop:4}}>{skillForm.description.length} / 500000</div>
                </div>
              </div>

              {/* Instructions */}
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:6}}>
                  Instructions 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </label>
                <div style={{position:"relative"}}>
                  <textarea 
                    value={skillForm.instructions} 
                    onChange={e => setSkillForm({...skillForm, instructions: e.target.value})}
                    rows={10}
                    placeholder="# Zynx Orchestrator\n\nDefine the agent's behavior here..."
                    style={{width:"100%", padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:13, fontFamily:"var(--font-mono)", resize:"vertical", outline:"none", lineHeight:1.5}}
                  />
                  <div style={{textAlign:"right", fontSize:11, color:"var(--text-tertiary)", marginTop:4}}>{skillForm.instructions.length} / 500000</div>
                </div>
              </div>

              {/* Model */}
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)", display:"flex", alignItems:"center", gap:6}}>
                  Model 
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                </label>
                <select 
                  value={skillForm.model} 
                  onChange={e => setSkillForm({...skillForm, model: e.target.value})}
                  style={{width:"100%", padding:"10px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none", appearance:"none"}}
                >
                  <option value="Gemini 3 Flash (preview)">Gemini 3 Flash (preview)</option>
                  <option value="Gemini 3.5 Pro">Gemini 3.5 Pro</option>
                  <option value="Claude 3 Haiku">Claude 3 Haiku</option>
                  <option value="GPT-4o-mini">GPT-4o-mini</option>
                </select>
              </div>

              {/* Tools */}
              <div style={{display:"flex", flexDirection:"column", gap:6, marginBottom:20}}>
                <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
                  <label style={{fontSize:14, fontWeight:600, color:"var(--text-primary)"}}>Tools</label>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
                </div>
                <div style={{fontSize:12, color:"var(--text-secondary)", marginBottom:4}}>Enable agent to complete tasks</div>
                
                <div style={{padding:"12px", border:"1px solid var(--border-color)", borderRadius:"var(--radius-md)", background:"var(--bg-main)", display:"flex", flexWrap:"wrap", gap:8, minHeight:"80px", position:"relative"}}>
                  {skillForm.tools.map((t, i) => (
                    <div key={i} style={{display:"flex", alignItems:"center", gap:6, padding:"4px 10px", background:"var(--bg-panel)", border:"1px solid var(--border-color)", borderRadius:"100px", fontSize:12, color:"var(--text-primary)"}}>
                      {t === "Google Search" ? <span style={{color:"#4285F4", fontWeight:"bold"}}>G</span> : <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>}
                      {t}
                      <button onClick={() => setSkillForm({...skillForm, tools: skillForm.tools.filter((_, idx)=>idx!==i)})} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer", display:"flex", alignItems:"center", marginLeft:2}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                  ))}
                  <button onClick={() => {
                    setActivePane('tools-main');
                  }} style={{position:"absolute", bottom:8, right:8, background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></button>
                </div>
              </div>

            </div>

            <div style={{padding:"16px 20px", borderTop:"1px solid var(--border-color)", display:"flex", justifyContent:"flex-end", background:"var(--bg-main)", gap:12}}>
              <button onClick={()=>setEditingSkillAgentId(null)} style={{padding:"8px 16px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"transparent", color:"var(--text-primary)", cursor:"pointer", fontSize:13}}>Cancel</button>
              <button onClick={saveSkill} disabled={isSavingSkill} style={{padding:"8px 24px", borderRadius:"var(--radius-sm)", border:"none", background:"var(--text-primary)", color:"var(--bg-main)", fontWeight:600, fontSize:13, cursor:isSavingSkill?"not-allowed":"pointer"}}>
                {isSavingSkill ? "Saving..." : "Save"}
              </button>
            </div>
            
            {/* --- SUB-PANES --- */}
            {activePane !== 'details' && (
              <div style={{position:"absolute", top:0, left:0, width:"100%", height:"100%", background:"var(--bg-panel)", display:"flex", flexDirection:"column", zIndex:10, animation:"slideIn 0.2s ease"}}>
                
                {/* Tools Main Pane */}
                {activePane === 'tools-main' && (
                  <>
                    <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border-color)", display:"flex", alignItems:"center", background:"var(--bg-main)", gap:16}}>
                      <button onClick={()=>setActivePane('details')} style={{background:"transparent", border:"none", color:"var(--text-primary)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
                      <div style={{fontWeight:500, fontSize:15, color:"var(--text-primary)", flex:1}}>Tools</div>
                      <button onClick={()=>setEditingSkillAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                    <div style={{flex:1, overflowY:"auto", padding:"20px"}}>
                      <div style={{fontSize:14, fontWeight:600, color:"var(--text-primary)", marginBottom:12}}>Tools</div>
                      
                      <div style={{display:"flex", flexDirection:"column", gap:8}}>
                        {/* Google Search Toggle */}
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg-main)", border:"1px solid var(--border-color)", borderRadius:"var(--radius-lg)", padding:"12px 16px"}}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                            <div style={{width:32, height:32, borderRadius:"50%", background:"var(--bg-panel)", display:"flex", alignItems:"center", justifyContent:"center", color:"#4285F4", fontWeight:"bold"}}>G</div>
                            <div>
                              <div style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Google Search</div>
                              <div style={{fontSize:11, color:"var(--text-secondary)"}}>Search the web with Google Search</div>
                            </div>
                          </div>
                          <div onClick={() => {
                            const has = skillForm.tools.includes("Google Search");
                            setSkillForm({...skillForm, tools: has ? skillForm.tools.filter(t=>t!=="Google Search") : [...skillForm.tools, "Google Search"]});
                          }} style={{width:36, height:20, borderRadius:20, background:skillForm.tools.includes("Google Search")?"var(--accent)":"var(--border-color)", position:"relative", cursor:"pointer", transition:"0.2s"}}>
                            <div style={{width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:skillForm.tools.includes("Google Search")?18:2, transition:"0.2s"}} />
                          </div>
                        </div>

                        {/* URL Context Toggle */}
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg-main)", border:"1px solid var(--border-color)", borderRadius:"var(--radius-lg)", padding:"12px 16px"}}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                            <div style={{width:32, height:32, borderRadius:"50%", background:"var(--bg-panel)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-primary)"}}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                            </div>
                            <div>
                              <div style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>URL Context</div>
                              <div style={{fontSize:11, color:"var(--text-secondary)"}}>Browse the content from webpages</div>
                            </div>
                          </div>
                          <div onClick={() => {
                            const has = skillForm.tools.includes("URL Context");
                            setSkillForm({...skillForm, tools: has ? skillForm.tools.filter(t=>t!=="URL Context") : [...skillForm.tools, "URL Context"]});
                          }} style={{width:36, height:20, borderRadius:20, background:skillForm.tools.includes("URL Context")?"var(--accent)":"var(--border-color)", position:"relative", cursor:"pointer", transition:"0.2s"}}>
                            <div style={{width:16, height:16, borderRadius:"50%", background:"#fff", position:"absolute", top:2, left:skillForm.tools.includes("URL Context")?18:2, transition:"0.2s"}} />
                          </div>
                        </div>
                      </div>

                      <div style={{fontSize:14, fontWeight:600, color:"var(--text-primary)", marginTop:32, marginBottom:12}}>MCP</div>
                      <div style={{display:"flex", flexDirection:"column", gap:8}}>
                        <div onClick={()=>setActivePane('add-vertex')} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg-main)", border:"1px solid var(--border-color)", borderRadius:"var(--radius-lg)", padding:"14px 16px", cursor:"pointer"}}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                            <div style={{color:"#4285F4"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="7.5 4.21 12 6.81 16.5 4.21"/><polyline points="7.5 19.79 7.5 14.6 3 12"/><polyline points="21 12 16.5 14.6 16.5 19.79"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg></div>
                            <div style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Vertex AI Search Data Store</div>
                          </div>
                          <div style={{width:24, height:24, borderRadius:"50%", background:"var(--bg-panel)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                        </div>

                        <div onClick={()=>setActivePane('add-mcp')} style={{display:"flex", alignItems:"center", justifyContent:"space-between", background:"var(--bg-main)", border:"1px solid var(--border-color)", borderRadius:"var(--radius-lg)", padding:"14px 16px", cursor:"pointer"}}>
                          <div style={{display:"flex", alignItems:"center", gap:12}}>
                            <div style={{color:"var(--text-secondary)"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg></div>
                            <div style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>MCP Server</div>
                          </div>
                          <div style={{width:24, height:24, borderRadius:"50%", background:"var(--bg-panel)", display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-secondary)"}}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg></div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Add MCP Server Pane */}
                {activePane === 'add-mcp' && (
                  <>
                    <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border-color)", display:"flex", alignItems:"center", background:"var(--bg-main)", gap:16}}>
                      <button onClick={()=>setActivePane('tools-main')} style={{background:"transparent", border:"none", color:"var(--text-primary)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
                      <div style={{fontWeight:500, fontSize:15, color:"var(--text-primary)", flex:1}}>Tools</div>
                      <button onClick={()=>setEditingSkillAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                    <div style={{flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:20}}>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>MCP display name</label>
                        <input type="text" placeholder="Name" value={mcpForm.name} onChange={e=>setMcpForm({...mcpForm, name: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}} />
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Endpoint URL</label>
                        <input type="text" placeholder="URL" value={mcpForm.url} onChange={e=>setMcpForm({...mcpForm, url: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}} />
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Authentication</label>
                        <select value={mcpForm.auth} onChange={e=>setMcpForm({...mcpForm, auth: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none", appearance:"none"}}>
                          <option value="None">None</option>
                          <option value="Bearer Token">Bearer Token</option>
                          <option value="Basic Auth">Basic Auth</option>
                        </select>
                      </div>
                      <div style={{display:"flex", gap:16, marginTop:8}}>
                        <button onClick={()=>{
                          if(mcpForm.name) setSkillForm({...skillForm, tools: [...skillForm.tools, `MCP: ${mcpForm.name}`]});
                          setActivePane('tools-main');
                        }} style={{padding:"8px 24px", borderRadius:"24px", border:"none", background:"#a8c7fa", color:"#0842a0", fontWeight:500, fontSize:13, cursor:"pointer"}}>Add</button>
                        <button onClick={()=>setActivePane('tools-main')} style={{padding:"8px 16px", background:"transparent", border:"none", color:"#a8c7fa", fontWeight:500, fontSize:13, cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  </>
                )}

                {/* Add Vertex AI Pane */}
                {activePane === 'add-vertex' && (
                  <>
                    <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border-color)", display:"flex", alignItems:"center", background:"var(--bg-main)", gap:16}}>
                      <button onClick={()=>setActivePane('tools-main')} style={{background:"transparent", border:"none", color:"var(--text-primary)", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg></button>
                      <div style={{fontWeight:500, fontSize:15, color:"var(--text-primary)", flex:1}}>Tools</div>
                      <button onClick={()=>setEditingSkillAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                    </div>
                    <div style={{flex:1, overflowY:"auto", padding:"20px", display:"flex", flexDirection:"column", gap:16}}>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>GCP Project ID</label>
                        <input type="text" placeholder="e.g. google.com:projectId" value={vertexForm.projectId} onChange={e=>setVertexForm({...vertexForm, projectId: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}} />
                        <div style={{fontSize:11, color:"var(--text-tertiary)"}}>You can find the ID in the <a href="#" style={{color:"#a8c7fa"}}>GCP dashboard</a></div>
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Location</label>
                        <select value={vertexForm.location} onChange={e=>setVertexForm({...vertexForm, location: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none", appearance:"none"}}>
                          <option value="global">global</option>
                          <option value="us-central1">us-central1</option>
                        </select>
                        <div style={{fontSize:11, color:"var(--text-tertiary)"}}>You can find this information inside datastore details page</div>
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Collection ID</label>
                        <input type="text" placeholder="e.g., collectionId" value={vertexForm.collectionId} onChange={e=>setVertexForm({...vertexForm, collectionId: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}} />
                        <div style={{fontSize:11, color:"var(--text-tertiary)"}}>You can find this information inside datastore details page</div>
                      </div>
                      <div style={{display:"flex", flexDirection:"column", gap:6}}>
                        <label style={{fontSize:13, fontWeight:500, color:"var(--text-primary)"}}>Data Store ID</label>
                        <input type="text" placeholder="e.g., dataStoreId" value={vertexForm.dataStoreId} onChange={e=>setVertexForm({...vertexForm, dataStoreId: e.target.value})} style={{width:"100%", padding:"12px 14px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", fontSize:14, outline:"none"}} />
                        <div style={{fontSize:11, color:"var(--text-tertiary)"}}>You can find the IDs of the datastore in the <a href="#" style={{color:"#a8c7fa"}}>datastore overview page</a></div>
                      </div>
                      
                      <div style={{display:"flex", gap:12, padding:"12px 16px", background:"var(--bg-main)", border:"1px solid var(--border-color)", borderRadius:"var(--radius-md)", marginTop:8}}>
                         <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2" style={{flexShrink:0, marginTop:2}}><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                         <div style={{fontSize:12, color:"var(--text-primary)", lineHeight:1.5}}>Grant permissions to connect to a Vertex AI Search datastore using the instructions <a href="#" style={{color:"#a8c7fa"}}>here.</a></div>
                      </div>

                      <div style={{display:"flex", gap:16, marginTop:8}}>
                        <button onClick={()=>{
                          if(vertexForm.dataStoreId) setSkillForm({...skillForm, tools: [...skillForm.tools, `Vertex AI: ${vertexForm.dataStoreId}`]});
                          setActivePane('tools-main');
                        }} style={{padding:"8px 24px", borderRadius:"24px", border:"none", background:"#a8c7fa", color:"#0842a0", fontWeight:500, fontSize:13, cursor:"pointer"}}>Add</button>
                        <button onClick={()=>setActivePane('tools-main')} style={{padding:"8px 16px", background:"transparent", border:"none", color:"#a8c7fa", fontWeight:500, fontSize:13, cursor:"pointer"}}>Cancel</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}

      {/* LLM Settings Modal */}
      {showSettings && (
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{width:400, background:"var(--bg-panel)", borderRadius:"var(--radius-xl)", border:"1px solid var(--border-color)", overflow:"hidden", boxShadow:"0 20px 50px rgba(0,0,0,0.5)"}}>
            <div style={{padding:"20px", borderBottom:"1px solid var(--border-color)", display:"flex", justifyContent:"space-between", alignItems:"center"}}>
              <div style={{fontWeight:600, fontSize:16, color:"var(--text-primary)"}}>LLM Provider Settings</div>
              <button onClick={()=>setShowSettings(false)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <div style={{padding:"24px", display:"flex", flexDirection:"column", gap:20}}>
              <div style={{display:"flex", flexDirection:"column", gap:8}}>
                <label style={{fontSize:12, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase"}}>Provider</label>
                <select value={llmSettings.provider} onChange={e=>setLlmSettings({...llmSettings, provider: e.target.value})} style={{width:"100%", padding:"12px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", outline:"none"}}>
                  <option value="local">Local (No LLM)</option>
                  <option value="openai">OpenAI / Compatible</option>
                  <option value="anthropic">Anthropic (Claude)</option>
                  <option value="gemini">Google Gemini</option>
                </select>
              </div>

              {llmSettings.provider !== "local" && (
                <>
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    <label style={{fontSize:12, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase"}}>API Key</label>
                    <input type="password" value={llmSettings.apiKey} onChange={e=>setLlmSettings({...llmSettings, apiKey: e.target.value})} placeholder="sk-..." style={{width:"100%", padding:"12px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", outline:"none"}} />
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    <label style={{fontSize:12, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase"}}>Base URL</label>
                    <input type="text" value={llmSettings.baseUrl} onChange={e=>setLlmSettings({...llmSettings, baseUrl: e.target.value})} placeholder="https://api.openai.com/v1" style={{width:"100%", padding:"12px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", outline:"none"}} />
                  </div>
                  <div style={{display:"flex", flexDirection:"column", gap:8}}>
                    <label style={{fontSize:12, fontWeight:600, color:"var(--text-secondary)", textTransform:"uppercase"}}>Default Model</label>
                    <input type="text" value={llmSettings.model} onChange={e=>setLlmSettings({...llmSettings, model: e.target.value})} placeholder="gpt-4o-mini" style={{width:"100%", padding:"12px", borderRadius:"var(--radius-md)", border:"1px solid var(--border-color)", background:"var(--bg-main)", color:"var(--text-primary)", outline:"none"}} />
                  </div>
                </>
              )}

              <button onClick={()=>setShowSettings(false)} style={{marginTop:12, padding:"12px", borderRadius:"var(--radius-md)", border:"none", background:"var(--text-primary)", color:"var(--bg-main)", fontWeight:600, cursor:"pointer"}}>Save Settings</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
