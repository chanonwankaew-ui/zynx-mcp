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
  const [skillContent, setSkillContent] = useState("");
  const [isSavingSkill, setIsSavingSkill] = useState(false);

  const openSkillEditor = async (e, agentId) => {
    e.stopPropagation();
    setEditingSkillAgentId(agentId);
    setSkillContent("Loading...");
    try {
      const res = await fetch(`${ZYNX_BACKEND_URL}/agents/${agentId}/skill`);
      const data = await res.json();
      setSkillContent(data.skill || "");
    } catch (err) {
      setSkillContent("Error loading skill.");
    }
  };

  const saveSkill = async () => {
    if (!editingSkillAgentId) return;
    setIsSavingSkill(true);
    try {
      await fetch(`${ZYNX_BACKEND_URL}/agents/${editingSkillAgentId}/skill`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skill: skillContent })
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ goal: userText })
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
        headers: { "Content-Type": "application/json" },
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

      updateLastMessageMetadata({ status: "error", error: error.message });
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
              <div style={{fontSize:14, fontWeight:500, color:"var(--text-secondary)"}}>Zynx 1.0 (Local)</div>
              
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
        <div style={{position:"fixed", top:0, left:0, right:0, bottom:0, background:"rgba(0,0,0,0.7)", backdropFilter:"blur(4px)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <div style={{width:800, height:600, background:"var(--bg-panel)", borderRadius:"var(--radius-lg)", border:"1px solid var(--border-color)", display:"flex", flexDirection:"column", overflow:"hidden", boxShadow:"0 20px 40px rgba(0,0,0,0.4)"}}>
            <div style={{padding:"16px 20px", borderBottom:"1px solid var(--border-color)", display:"flex", justifyContent:"space-between", alignItems:"center", background:"var(--bg-main)"}}>
              <div style={{fontWeight:600, fontSize:15, color:"var(--text-primary)"}}>Edit Skill: {agentById(editingSkillAgentId)?.name} <span style={{color:"var(--text-tertiary)", fontWeight:400, marginLeft:6}}>({editingSkillAgentId}.md)</span></div>
              <button onClick={()=>setEditingSkillAgentId(null)} style={{background:"transparent", border:"none", color:"var(--text-secondary)", cursor:"pointer"}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
            </div>
            <textarea
              value={skillContent}
              onChange={e => setSkillContent(e.target.value)}
              placeholder="Define the agent's persona, aesthetic style, and specific skills in Markdown..."
              style={{flex:1, padding:20, background:"transparent", border:"none", outline:"none", color:"var(--text-primary)", fontSize:14, fontFamily:"var(--font-mono)", lineHeight:1.6, resize:"none"}}
            />
            <div style={{padding:"16px 20px", borderTop:"1px solid var(--border-color)", display:"flex", justifyContent:"flex-end", background:"var(--bg-main)", gap:12}}>
              <button onClick={()=>setEditingSkillAgentId(null)} style={{padding:"8px 16px", borderRadius:"var(--radius-sm)", border:"1px solid var(--border-color)", background:"transparent", color:"var(--text-primary)", cursor:"pointer", fontSize:13}}>Cancel</button>
              <button onClick={saveSkill} disabled={isSavingSkill} style={{padding:"8px 24px", borderRadius:"var(--radius-sm)", border:"none", background:"var(--accent)", color:"#fff", fontWeight:600, fontSize:13, cursor:isSavingSkill?"not-allowed":"pointer"}}>
                {isSavingSkill ? "Saving..." : "Save Skill"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
