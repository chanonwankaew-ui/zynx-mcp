import { useState, useRef, useEffect, useCallback } from "react";
import { AGENTS, agentById } from "./agentCatalog";
import { createWorkflowFile, slugWorkflowName } from "../../../src/workflowSchema";

/* ── DATA ── */
const PRESETS = [
  { id:"w1", name:"Code Generation",  color:"#7F77DD", steps:["orchestrator","task-planner","router","code-gen","test-gen","reviewer","notifier"] },
  { id:"w2", name:"Data Validation",  color:"#378ADD", steps:["orchestrator","data-ingest","transformer","validator","db-agent","logger"] },
  { id:"w3", name:"Thai UI Flow",     color:"#1D9E75", steps:["deeja","orchestrator","router","rag-agent","code-gen","doc-writer","notifier"] },
  { id:"w4", name:"Full Automation",  color:"#D85A30", steps:["orchestrator","auth","task-planner","router","data-ingest","validator","transformer","db-agent","code-gen","doc-writer","reviewer","report-gen","notifier","logger"] },
  { id:"w5", name:"Business CRM",     color:"#BA7517", steps:["orchestrator","sales-bot","router","vector-store","rag-agent","report-gen","notifier"] },
  { id:"w6", name:"API Scaffolding",  color:"#3B6D11", steps:["orchestrator","task-planner","api-builder","validator","doc-writer","test-gen","webhook"] },
  { id:"w7", name:"Nightly Governance Validation", color:"#185FA5", steps:["orchestrator","data-ingest","validator","transformer","db-agent","reviewer","report-gen","notifier","logger"] },
];

const CAT_META = {
  core:   { label:"Core",     color:"#7F77DD" },
  ui:     { label:"UI",       color:"#1D9E75" },
  data:   { label:"Data",     color:"#378ADD" },
  worker: { label:"Worker",   color:"#3B6D11" },
  biz:    { label:"Business", color:"#D85A30" },
  output: { label:"Output",   color:"#185FA5" },
};
const CAT_ORDER = ["core","ui","data","worker","biz","output"];

/* ── STORAGE HELPERS ── */
const STORE_KEY = "zynx_wf_saved";
const loadSaved = () => { try { return JSON.parse(localStorage.getItem(STORE_KEY)||"[]"); } catch{ return []; } };
const persistSaved = list => { try { localStorage.setItem(STORE_KEY, JSON.stringify(list)); } catch{} };
const ZYNX_BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:8787";
const ZYNX_MCP_URL = (import.meta.env.VITE_MCP_URL ?? "http://localhost:3000") + "/mcp";

function parseSseJson(text) {
  const dataLine = text.split("\n").find(line => line.startsWith("data: "));
  if (!dataLine) return null;
  return JSON.parse(dataLine.replace(/^data:\s*/, ""));
}

function formatAgentList(ids) {
  return ids
    .map((id, index) => {
      const agent = agentById(id);
      return agent ? `${index + 1}. ${agent.name} — ${agent.role}` : null;
    })
    .filter(Boolean)
    .join("\n");
}

function recommendWorkflow(prompt, currentSteps) {
  const q = prompt.toLowerCase();
  let title = "Recommended workflow";
  let steps = currentSteps.length ? currentSteps : ["orchestrator", "task-planner", "router", "code-gen", "reviewer", "notifier"];
  let reason = "ใช้ workflow ปัจจุบันเป็นฐาน แล้วเพิ่มการวางแผน ตรวจคุณภาพ และแจ้งผลลัพธ์ท้ายงาน";
  let nextAction = "กดเลือก agent ตามลำดับนี้ในแท็บ Build แล้วกด Save หรือ Export เป็น JSON";

  if (q.includes("deeja") || q.includes("thai") || q.includes("ui")) {
    title = "Deeja routing";
    steps = ["deeja", "orchestrator", "router", "rag-agent", "task-planner", "notifier"];
    reason = "Deeja ควรทำหน้าที่รับ intent และบริบทภาษาไทยก่อนส่งต่อให้ Orchestrator กับ Router เลือก agent ปลายทาง";
    nextAction = "เริ่มจาก preset Thai UI Flow แล้วเพิ่ม/ลด RAG Agent ตามว่าต้องอ้างอิง knowledge base หรือไม่";
  } else if (q.includes("typescript") || q.includes("retry") || q.includes("code")) {
    title = "TypeScript implementation";
    steps = ["orchestrator", "task-planner", "router", "code-gen", "test-gen", "reviewer", "notifier"];
    reason = "งานโค้ดควรมี Planner แยกงาน, Code Generator ลงมือ, Test Generator เพิ่ม coverage, และ Reviewer ตรวจ regression";
    nextAction = "ใช้ preset Code Generation แล้วเพิ่ม Test Generator ถ้ายังไม่ได้เลือก";
  } else if (q.includes("tenant") || q.includes("isolation") || q.includes("db") || q.includes("database")) {
    title = "Tenant isolation";
    steps = ["orchestrator", "auth", "task-planner", "validator", "db-agent", "logger", "reviewer"];
    reason = "งาน multi-tenant ต้องเริ่มจาก Auth/RBAC, ตรวจ schema, แตะ DB Agent อย่างมีขอบเขต และบันทึก audit trail";
    nextAction = "เพิ่ม Auth Guard, Schema Validator, DB Agent และ Logger ใน Build เพื่อทำเป็น workflow ด้าน security/data";
  } else if (q.includes("saas") || q.includes("automation") || q.includes("full")) {
    title = "SaaS automation";
    steps = ["orchestrator", "auth", "task-planner", "router", "data-ingest", "validator", "transformer", "db-agent", "code-gen", "reviewer", "report-gen", "notifier", "logger"];
    reason = "SaaS workflow ต้องครอบคลุม auth, data validation, execution, QA, reporting และ audit";
    nextAction = "ใช้ preset Full Automation แล้วตัด agent ที่ไม่เกี่ยวกับ use case ออก";
  } else if (q.includes("governance") || q.includes("nightly") || q.includes("repo") || q.includes("duplicate")) {
    title = "Nightly governance";
    steps = ["orchestrator", "data-ingest", "validator", "transformer", "db-agent", "reviewer", "report-gen", "notifier", "logger"];
    reason = "งาน governance ต้องตรวจ input, validate enum/report format, วิเคราะห์ duplicate แบบไม่ลบอัตโนมัติ, แล้วสร้าง report ให้มนุษย์ review";
    nextAction = "ใช้ preset Nightly Governance Validation แล้ว export เป็น workflows/nightly-governance-validation.json";
  } else if (q.includes("data") || q.includes("report") || q.includes("analytics")) {
    title = "Data workflow";
    steps = ["orchestrator", "data-ingest", "transformer", "validator", "db-agent", "report-gen", "notifier"];
    reason = "งานข้อมูลควรแยก ingest, transform, validate, persist และ report ให้ชัดก่อนส่งผลลัพธ์";
    nextAction = "ใช้ preset Data Validation แล้วเพิ่ม Report Generator ถ้าต้องส่งรายงาน";
  }

  return `${title}\n\n${reason}\n\nAgent order:\n${formatAgentList(steps)}\n\nNext action: ${nextAction}`;
}

/* ── MAIN APP ── */
export default function App() {
  const [mode, setMode] = useState("build");
  const [steps, setSteps] = useState([]);
  const [buildName, setBuildName] = useState("My Workflow");
  const [buildColor, setBuildColor] = useState("#7F77DD");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [catFilter, setCatFilter] = useState("all");
  const [saved, setSaved] = useState(loadSaved);
  const [versions, setVersions] = useState([]); // [{ts, steps, name}]
  const [showVersions, setShowVersions] = useState(false);
  const [exportFmt, setExportFmt] = useState("json");
  const [showExport, setShowExport] = useState(false);
  const [mcpStatus, setMcpStatus] = useState("idle");
  const [mcpData, setMcpData] = useState(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiResult, setAiResult] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [toast, setToast] = useState("");
  // drag state
  const dragIdx = useRef(null);
  const dragOver = useRef(null);

  const showToast = msg => { setToast(msg); setTimeout(()=>setToast(""),2200); };

  /* save workflow */
  function saveWorkflow() {
    if (!steps.length) return;
    const entry = { id: Date.now().toString(), name: buildName, color: buildColor, steps, savedAt: new Date().toISOString() };
    // snapshot version
    const snap = { ts: new Date().toISOString(), steps:[...steps], name: buildName };
    setVersions(v => [snap, ...v].slice(0,20));
    const updated = [entry, ...saved.filter(s=>s.name!==buildName)].slice(0,50);
    setSaved(updated);
    persistSaved(updated);
    showToast(`บันทึก "${buildName}" แล้ว`);
  }

  /* load saved */
  function loadWorkflow(wf) {
    setSteps([...wf.steps]);
    setBuildName(wf.name);
    setBuildColor(wf.color);
    setMode("build");
    showToast(`โหลด "${wf.name}" แล้ว`);
  }

  /* delete saved */
  function deleteSaved(id) {
    const updated = saved.filter(s=>s.id!==id);
    setSaved(updated); persistSaved(updated);
  }

  /* restore version */
  function restoreVersion(v) {
    setSteps([...v.steps]); setBuildName(v.name);
    setShowVersions(false);
    showToast("Restored version from " + v.ts.slice(0,16).replace("T"," "));
  }

  /* toggle agent */
  function toggleAgent(id) {
    setSteps(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  /* drag handlers */
  function onDragStart(e, idx) { dragIdx.current = idx; e.dataTransfer.effectAllowed = "move"; }
  function onDragEnter(idx) { dragOver.current = idx; }
  function onDragEnd() {
    const from = dragIdx.current, to = dragOver.current;
    if (from===null || to===null || from===to) { dragIdx.current=null; dragOver.current=null; return; }
    const snap = { ts: new Date().toISOString(), steps:[...steps], name: buildName };
    setVersions(v=>[snap,...v].slice(0,20));
    setSteps(prev => {
      const arr = [...prev];
      const [moved] = arr.splice(from,1);
      arr.splice(to,0,moved);
      return arr;
    });
    dragIdx.current=null; dragOver.current=null;
  }

  /* load preset */
  function loadPreset(wf) {
    setSteps([...wf.steps]); setBuildName(wf.name); setBuildColor(wf.color); setMode("build");
  }

  /* export */
  function exportPayload() {
    return buildExportPayload(steps, buildName, buildColor);
  }

  function exportContent() {
    const payload = exportPayload();
    return exportFmt==="json" ? JSON.stringify(payload,null,2) : toYAML(payload);
  }

  async function copyExport() {
    if (!steps.length) return;
    await navigator.clipboard.writeText(exportContent());
    showToast(`คัดลอก ${exportFmt.toUpperCase()} แล้ว`);
  }

  function doExport() {
    const payload = buildExportPayload(steps, buildName, buildColor);
    let content, mime, ext;
    if (exportFmt==="json") { content=JSON.stringify(payload,null,2); mime="application/json"; ext="json"; }
    else { content=toYAML(payload); mime="text/yaml"; ext="yaml"; }
    const blob = new Blob([content],{type:mime});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href=url; a.download=`zynx-workflow.${ext}`; a.click();
    URL.revokeObjectURL(url);
  }

  /* MCP */
  async function connectMCP() {
    setMcpStatus("loading"); setMcpData(null);
    try {
      const [healthRes, agentsRes, mcpRes] = await Promise.all([
        fetch(`${ZYNX_BACKEND_URL}/health`),
        fetch(`${ZYNX_BACKEND_URL}/agents`),
        fetch(ZYNX_MCP_URL, {
          method: "POST",
          headers: {
            "accept": "application/json, text/event-stream",
            "content-type": "application/json"
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "initialize",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: {
                name: "zynx-workflow-mapper",
                version: "0.1.0"
              }
            }
          })
        })
      ]);

      if (!healthRes.ok) throw new Error(`Backend health failed: HTTP ${healthRes.status}`);
      if (!agentsRes.ok) throw new Error(`Agent registry failed: HTTP ${agentsRes.status}`);
      if (!mcpRes.ok) throw new Error(`MCP initialize failed: HTTP ${mcpRes.status}`);

      const health = await healthRes.json();
      const agentRegistry = await agentsRes.json();
      const mcpText = await mcpRes.text();
      const mcpPayload = parseSseJson(mcpText);
      const agents = Array.isArray(agentRegistry.agents) ? agentRegistry.agents : [];
      const serverInfo = mcpPayload?.result?.serverInfo ?? {};

      setMcpData({
        platform: serverInfo.name || health.service || "Zynx MCP",
        status: "online",
        activeAgents: agents.length,
        pendingJobs: 0,
        llmRouter: {
          primary: "local-backend",
          fallback: "not configured"
        },
        lastSync: new Date().toISOString(),
        notes: `Backend ${health.version || "unknown"} · MCP ${serverInfo.version || "unknown"}`
      });
      setMcpStatus("ok");
      showToast("เชื่อมต่อ MCP local สำเร็จ");
    } catch(e) {
      setMcpStatus("error");
      setMcpData({error:e.message});
      showToast("เชื่อมต่อ MCP ไม่สำเร็จ");
    }
  }

  /* AI */
  async function runAI() {
    if (!aiPrompt.trim()) return;
    setAiLoading(true); setAiResult("");
    try {
      setAiResult(recommendWorkflow(aiPrompt, steps));
    } catch(e){ setAiResult("Advisor error: "+e.message); }
    setAiLoading(false);
  }

  const filteredAgents = catFilter==="all" ? AGENTS : AGENTS.filter(a=>a.cat===catFilter);
  const palette = ["#7F77DD","#1D9E75","#378ADD","#3B6D11","#D85A30","#BA7517","#185FA5","#993556"];
  const selectedAgents = steps.map(id=>agentById(id)).filter(Boolean);
  const selectedDuration = selectedAgents.reduce((sum, agent)=>sum + agent.dur, 0);
  const exportFileName = `${slugWorkflowName(buildName)}.${exportFmt}`;

  return (
    <div style={{fontFamily:"var(--font-sans)",color:"var(--color-text-primary)",padding:"1.25rem 1rem",maxWidth:800,position:"relative"}}>
      {/* Toast */}
      {toast && <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",background:"#2C2C2A",color:"#fff",padding:"8px 18px",borderRadius:"var(--border-radius-md)",fontSize:13,zIndex:999,pointerEvents:"none"}}>{toast}</div>}

      {/* Header */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8,flexWrap:"wrap",gap:8}}>
        <div>
          <h2 style={{fontSize:18,fontWeight:500,margin:0}}>Zynx Agentic Workflow Planner</h2>
          <p style={{fontSize:12,color:"var(--color-text-secondary)",margin:"2px 0 0"}}>35 agents · planner presets · governance reports · Flow · Gantt · export</p>
        </div>
        <button onClick={connectMCP} disabled={mcpStatus==="loading"}
          style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:`0.5px solid ${mcpStatus==="ok"?"#1D9E75":mcpStatus==="error"?"#E24B4A":"var(--color-border-secondary)"}`,background:"var(--color-background-primary)",cursor:"pointer",display:"flex",alignItems:"center",gap:5}}>
          <span style={{width:7,height:7,borderRadius:"50%",background:mcpStatus==="ok"?"#1D9E75":mcpStatus==="error"?"#E24B4A":mcpStatus==="loading"?"#BA7517":"#888780",display:"inline-block"}}/>
          {mcpStatus==="loading"?"Connecting…":mcpStatus==="ok"?"MCP Live":mcpStatus==="error"?"MCP Error":"Connect MCP"}
        </button>
      </div>

      {/* MCP panel */}
      {mcpData && mcpStatus==="ok" && (
        <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"10px 14px",fontSize:12,marginBottom:"1rem",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(120px,1fr))",gap:8}}>
          {[["Platform",mcpData.platform],["Status",mcpData.status,"#1D9E75"],["Backend Agents",mcpData.activeAgents],["Mapped Agents",AGENTS.length],["Runtime",mcpData.llmRouter?.primary],["Last Check",mcpData.lastSync?.slice(11,19)+" UTC"]].map(([l,v,c])=>(
            <div key={l}><div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2}}>{l}</div><div style={{fontSize:13,fontWeight:500,color:c||"var(--color-text-primary)"}}>{v??"-"}</div></div>
          ))}
        </div>
      )}
      {mcpData && mcpStatus==="error" && (
        <div style={{background:"#fff5f5",border:"0.5px solid #E24B4A",borderRadius:"var(--border-radius-md)",padding:"10px 14px",fontSize:12,marginBottom:"1rem",color:"#9b1c1c"}}>
          <div style={{fontWeight:600,marginBottom:3}}>MCP connection failed</div>
          <div>{mcpData.error || "Local backend or MCP wrapper is unavailable."}</div>
        </div>
      )}

      {/* Mode tabs */}
      <div style={{display:"flex",gap:6,marginBottom:"1.25rem",flexWrap:"wrap"}}>
        {[["build","🔧 Build"],["explore","🗺 Presets"],["saved","💾 Saved"],["flow","Flow"],["gantt","📊 Gantt"],["ai","✦ AI Advisor"]].map(([m,lbl])=>(
          <button key={m} onClick={()=>{setMode(m);setSelectedAgent(null);setShowExport(false);}}
            style={{fontSize:13,padding:"6px 14px",borderRadius:"var(--border-radius-md)",
              border:mode===m?"2px solid var(--color-border-info)":"0.5px solid var(--color-border-secondary)",
              background:mode===m?"var(--color-background-info)":"var(--color-background-primary)",
              color:mode===m?"var(--color-text-info)":"var(--color-text-primary)",cursor:"pointer",fontWeight:mode===m?500:400}}>
            {lbl}{m==="saved"&&saved.length?` (${saved.length})`:""}
          </button>
        ))}
      </div>

      {/* ── BUILD ── */}
      {mode==="build" && (
        <div>
          {/* Toolbar */}
          <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:"0.75rem",flexWrap:"wrap"}}>
            <input value={buildName} onChange={e=>setBuildName(e.target.value)}
              style={{flex:1,minWidth:140,fontSize:13,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
            <div style={{display:"flex",gap:4}}>
              {palette.map(c=>(
                <button key={c} onClick={()=>setBuildColor(c)}
                  style={{width:18,height:18,borderRadius:"50%",background:c,border:buildColor===c?"2px solid var(--color-text-primary)":"2px solid transparent",cursor:"pointer",padding:0}}/>
              ))}
            </div>
            <button onClick={()=>setSteps([])} style={{fontSize:12,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>Reset</button>
            <button onClick={saveWorkflow} disabled={!steps.length}
              style={{fontSize:12,padding:"6px 12px",borderRadius:"var(--border-radius-md)",border:`0.5px solid ${buildColor}`,background:buildColor+"20",color:buildColor,cursor:"pointer",fontWeight:500}}>
              💾 Save
            </button>
            {versions.length>0 && (
              <button onClick={()=>setShowVersions(!showVersions)}
                style={{fontSize:12,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>
                🕐 History ({versions.length})
              </button>
            )}
          </div>

          {/* Workflow summary */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:"0.75rem"}}>
            {[
              ["Workflow", buildName || "Untitled"],
              ["Agents", selectedAgents.length],
              ["Duration", `${selectedDuration} units`],
              ["Export", exportFileName]
            ].map(([label,value])=>(
              <div key={label} style={{borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 0 7px"}}>
                <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2,textTransform:"uppercase",letterSpacing:0}}>{label}</div>
                <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{value}</div>
              </div>
            ))}
          </div>

          {/* Version history panel */}
          {showVersions && (
            <div style={{background:"var(--color-background-secondary)",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"10px 12px",marginBottom:"0.75rem",maxHeight:180,overflowY:"auto"}}>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8,fontWeight:500}}>VERSION HISTORY</div>
              {versions.map((v,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",borderBottom:"0.5px solid var(--color-border-tertiary)"}}>
                  <div>
                    <span style={{fontSize:12,fontWeight:500}}>{v.name}</span>
                    <span style={{fontSize:11,color:"var(--color-text-secondary)",marginLeft:8}}>{v.ts.slice(0,16).replace("T"," ")} · {v.steps.length} agents</span>
                  </div>
                  <button onClick={()=>restoreVersion(v)} style={{fontSize:11,padding:"2px 8px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",cursor:"pointer"}}>Restore</button>
                </div>
              ))}
            </div>
          )}

          {/* Cat filter */}
          <div style={{display:"flex",gap:6,marginBottom:"0.75rem",flexWrap:"wrap"}}>
            {["all",...CAT_ORDER].map(c=>(
              <button key={c} onClick={()=>setCatFilter(c)}
                style={{fontSize:11,padding:"3px 10px",borderRadius:"var(--border-radius-md)",
                  border:catFilter===c?`1.5px solid ${c==="all"?"var(--color-border-primary)":CAT_META[c]?.color}`:"0.5px solid var(--color-border-secondary)",
                  background:catFilter===c?(c==="all"?"var(--color-background-secondary)":CAT_META[c]?.color+"18"):"transparent",cursor:"pointer"}}>
                {c==="all"?"All":CAT_META[c]?.label}
              </button>
            ))}
          </div>

          {/* Agent grid */}
          <div style={{display:"flex",flexWrap:"wrap",gap:7,marginBottom:"1.25rem"}}>
            {filteredAgents.map(agent=>{
              const sel = steps.includes(agent.id);
              const idx = steps.indexOf(agent.id);
              return (
                <button key={agent.id} onClick={()=>toggleAgent(agent.id)}
                  style={{display:"flex",alignItems:"center",gap:6,padding:"5px 11px",borderRadius:"var(--border-radius-md)",
                    border:sel?`2px solid ${agent.color}`:"0.5px solid var(--color-border-secondary)",
                    background:sel?agent.color+"20":"var(--color-background-primary)",cursor:"pointer",fontSize:12}}>
                  {sel && <span style={{width:16,height:16,borderRadius:"50%",background:agent.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,flexShrink:0}}>{idx+1}</span>}
                  <span style={{fontWeight:sel?500:400}}>{agent.name}</span>
                </button>
              );
            })}
          </div>

          {/* Drag-to-reorder flow */}
          {steps.length===0 && (
            <div style={{border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",padding:"14px",marginBottom:"1rem",background:"var(--color-background-secondary)"}}>
              <div style={{fontSize:13,fontWeight:600,marginBottom:8}}>No workflow selected</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {PRESETS.slice(0,4).map(wf=>(
                  <button key={wf.id} onClick={()=>loadPreset(wf)}
                    style={{fontSize:12,padding:"6px 10px",borderRadius:"var(--border-radius-md)",border:`0.5px solid ${wf.color}`,background:wf.color+"12",color:wf.color,cursor:"pointer",fontWeight:500}}>
                    {wf.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {steps.length>0 && (
            <>
              <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8}}>ลาก agent เพื่อเรียงลำดับใหม่</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:"0.75rem"}}>
                {steps.map((id,i)=>{
                  const a = agentById(id); if(!a) return null;
                  return (
                    <div key={id} draggable
                      onDragStart={e=>onDragStart(e,i)}
                      onDragEnter={()=>onDragEnter(i)}
                      onDragOver={e=>e.preventDefault()}
                      onDragEnd={onDragEnd}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"6px 12px",borderRadius:"var(--border-radius-md)",
                        border:`0.5px solid ${a.color}`,background:a.color+"18",cursor:"grab",fontSize:12,userSelect:"none"}}>
                      <span style={{fontSize:10,color:"var(--color-text-secondary)"}}>⠿</span>
                      <span style={{width:17,height:17,borderRadius:"50%",background:a.color,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:500,flexShrink:0}}>{i+1}</span>
                      <span style={{fontWeight:500}}>{a.name}</span>
                      <button onClick={()=>toggleAgent(id)} style={{background:"none",border:"none",cursor:"pointer",fontSize:10,color:"var(--color-text-secondary)",padding:"0 0 0 2px",lineHeight:1}}>✕</button>
                    </div>
                  );
                })}
              </div>

              {/* Export bar */}
              <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap",marginBottom:"0.5rem"}}>
                <button onClick={()=>setShowExport(!showExport)} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>
                  {showExport?"▲ Hide":"▼ Export"}
                </button>
                {showExport && <>
                  {["json","yaml"].map(f=>(
                    <button key={f} onClick={()=>setExportFmt(f)}
                      style={{fontSize:12,padding:"5px 10px",borderRadius:"var(--border-radius-md)",
                        border:exportFmt===f?"1.5px solid var(--color-border-info)":"0.5px solid var(--color-border-secondary)",
                        background:exportFmt===f?"var(--color-background-info)":"transparent",
                        color:exportFmt===f?"var(--color-text-info)":"var(--color-text-secondary)",cursor:"pointer"}}>
                      {f.toUpperCase()}
                    </button>
                  ))}
                  <button onClick={copyExport} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",cursor:"pointer"}}>Copy</button>
                  <button onClick={doExport} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",cursor:"pointer"}}>Download ↓</button>
                  <span style={{fontSize:11,color:"var(--color-text-secondary)"}}>workflows/{exportFileName}</span>
                </>}
              </div>
              {showExport && (
                <pre style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"10px 12px",fontSize:11,overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",lineHeight:1.6,maxHeight:220,marginBottom:"0.75rem"}}>
                  {exportContent()}
                </pre>
              )}
            </>
          )}
        </div>
      )}

      {/* ── PRESETS ── */}
      {mode==="explore" && (
        <div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:8,marginBottom:"1.25rem"}}>
            {PRESETS.map(wf=>(
              <div key={wf.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"10px 12px"}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:wf.color,marginBottom:5}}/>
                <div style={{fontSize:13,fontWeight:500,marginBottom:4}}>{wf.name}</div>
                <div style={{fontSize:11,color:"var(--color-text-secondary)",marginBottom:8}}>{wf.steps.length} agents</div>
                <button onClick={()=>loadPreset(wf)} style={{fontSize:11,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:`0.5px solid ${wf.color}`,background:wf.color+"15",color:wf.color,cursor:"pointer"}}>Load →</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── SAVED ── */}
      {mode==="saved" && (
        <div>
          {saved.length===0
            ? <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>ยังไม่มี workflow ที่บันทึกไว้ — ไปที่ Build แล้วกด 💾 Save</p>
            : saved.map(wf=>(
              <div key={wf.id} style={{background:"var(--color-background-primary)",border:"0.5px solid var(--color-border-secondary)",borderRadius:"var(--border-radius-md)",padding:"12px 14px",marginBottom:8,display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:wf.color,flexShrink:0}}/>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500}}>{wf.name}</div>
                  <div style={{fontSize:11,color:"var(--color-text-secondary)"}}>{wf.steps.length} agents · บันทึกเมื่อ {wf.savedAt?.slice(0,16).replace("T"," ")}</div>
                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginTop:6}}>
                    {wf.steps.slice(0,6).map(id=>{const a=agentById(id);return a?(<span key={id} style={{fontSize:10,padding:"2px 7px",borderRadius:"var(--border-radius-md)",background:a.color+"18",border:`0.5px solid ${a.color}`,color:a.color}}>{a.name}</span>):null;})}
                    {wf.steps.length>6&&<span style={{fontSize:10,color:"var(--color-text-secondary)",alignSelf:"center"}}>+{wf.steps.length-6} more</span>}
                  </div>
                </div>
                <div style={{display:"flex",gap:6,flexShrink:0}}>
                  <button onClick={()=>loadWorkflow(wf)} style={{fontSize:12,padding:"5px 12px",borderRadius:"var(--border-radius-md)",border:`0.5px solid ${wf.color}`,background:wf.color+"15",color:wf.color,cursor:"pointer"}}>Load</button>
                  <button onClick={()=>deleteSaved(wf.id)} style={{fontSize:12,padding:"5px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"transparent",color:"var(--color-text-secondary)",cursor:"pointer"}}>✕</button>
                </div>
              </div>
            ))
          }
        </div>
      )}

      {/* ── GANTT ── */}
      {mode==="flow" && (
        <div>
          {steps.length<2
            ? <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>เพิ่ม agent อย่างน้อย 2 ตัวใน Build mode ก่อน แล้วกลับมาดู Flow</p>
            : <FlowPreview steps={steps} name={buildName}/>
          }
        </div>
      )}

      {/* ── GANTT ── */}
      {mode==="gantt" && (
        <div>
          {steps.length<2
            ? <p style={{fontSize:13,color:"var(--color-text-secondary)"}}>เพิ่ม agent ใน Build mode ก่อน แล้วกลับมาดู Gantt</p>
            : <GanttView steps={steps} name={buildName} color={buildColor}/>
          }
        </div>
      )}

      {/* ── AI ADVISOR ── */}
      {mode==="ai" && (
        <div>
          <div style={{display:"flex",gap:8,marginBottom:10}}>
            <input value={aiPrompt} onChange={e=>setAiPrompt(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runAI()}
              placeholder="ถาม: agent ไหนเหมาะ? workflow ไหนใช้กับ use case นี้?"
              style={{flex:1,fontSize:13,padding:"8px 12px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",color:"var(--color-text-primary)"}}/>
            <button onClick={runAI} disabled={aiLoading}
              style={{fontSize:13,padding:"8px 16px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-secondary)",cursor:"pointer"}}>
              {aiLoading?"…":"ถาม ↗"}
            </button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
            {["workflow สำหรับ SaaS multi-tenant?","agent ไหน handle TypeScript retry?","Deeja ควร route ไปหา agent ไหน?","ออกแบบ tenant isolation ใน DB Agent?"].map(q=>(
              <button key={q} onClick={()=>setAiPrompt(q)} style={{fontSize:11,padding:"4px 10px",borderRadius:"var(--border-radius-md)",border:"0.5px solid var(--color-border-secondary)",background:"var(--color-background-primary)",cursor:"pointer",color:"var(--color-text-secondary)"}}>{q}</button>
            ))}
          </div>
          {aiResult&&<div style={{background:"var(--color-background-secondary)",borderRadius:"var(--border-radius-md)",padding:"12px 14px",fontSize:13,lineHeight:1.75,border:"0.5px solid var(--color-border-tertiary)",whiteSpace:"pre-wrap"}}>{aiResult}</div>}
        </div>
      )}
    </div>
  );
}

/* ── FLOW PREVIEW ── */
function FlowPreview({ steps, name }) {
  const agents = steps.map(id=>agentById(id)).filter(Boolean);
  const nodeWidth = 128;
  const nodeHeight = 58;
  const gap = 34;
  const width = agents.length * nodeWidth + Math.max(0, agents.length - 1) * gap + 32;
  const height = 118;
  const edges = agents.slice(1).map((agent, index)=>({ source: agents[index], target: agent }));

  return (
    <div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:8,marginBottom:12}}>
        {[
          ["Workflow", name],
          ["Nodes", agents.length],
          ["Edges", edges.length],
          ["Executor", "npm run workflow:run"]
        ].map(([label,value])=>(
          <div key={label} style={{borderBottom:"0.5px solid var(--color-border-tertiary)",padding:"2px 0 7px"}}>
            <div style={{fontSize:10,color:"var(--color-text-secondary)",marginBottom:2,textTransform:"uppercase",letterSpacing:0}}>{label}</div>
            <div style={{fontSize:13,fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{overflowX:"auto",border:"0.5px solid var(--color-border-tertiary)",borderRadius:"var(--border-radius-md)",background:"var(--color-background-secondary)",padding:10}}>
        <svg width={width} height={height} role="img" aria-label={`${name} flow preview`}>
          <defs>
            <marker id="flow-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" fill="#888780" />
            </marker>
          </defs>
          {edges.map(({source, target}, index) => {
            const x1 = 16 + index * (nodeWidth + gap) + nodeWidth;
            const x2 = x1 + gap - 8;
            return (
              <line
                key={`${source.id}-${target.id}`}
                x1={x1}
                y1={48}
                x2={x2}
                y2={48}
                stroke="#888780"
                strokeWidth="1.5"
                markerEnd="url(#flow-arrow)"
              />
            );
          })}
          {agents.map((agent, index) => {
            const x = 16 + index * (nodeWidth + gap);
            return (
              <g key={agent.id} transform={`translate(${x},20)`}>
                <rect width={nodeWidth} height={nodeHeight} rx="6" fill="#fff" stroke={agent.color} strokeWidth="1.5" />
                <circle cx="17" cy="18" r="10" fill={agent.color} />
                <text x="17" y="22" textAnchor="middle" fontSize="10" fontWeight="600" fill="#fff">{index + 1}</text>
                <text x="34" y="20" fontSize="11" fontWeight="600" fill="#2C2C2A">
                  {agent.name.length > 16 ? `${agent.name.slice(0, 15)}…` : agent.name}
                </text>
                <text x="12" y="42" fontSize="9" fill="#6b6a66">
                  {agent.role.length > 22 ? `${agent.role.slice(0, 21)}…` : agent.role}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div style={{fontSize:11,color:"var(--color-text-secondary)",marginTop:8}}>
        Flow นี้เป็นลำดับ executor แบบ sequential: node แรกเริ่มงาน แล้วส่ง context ไป node ถัดไปตาม edge
      </div>
    </div>
  );
}

/* ── GANTT ── */
function GanttView({ steps, name, color }) {
  const agents = steps.map(id=>agentById(id)).filter(Boolean);
  let cursor = 0;
  const rows = agents.map(a => {
    const start = cursor;
    cursor += a.dur;
    return { ...a, start, end: cursor };
  });
  const total = cursor || 1;
  const W = 560;
  return (
    <div>
      <div style={{fontSize:13,fontWeight:500,marginBottom:12}}>{name} — Execution Timeline (estimated units)</div>
      <div style={{overflowX:"auto"}}>
        <div style={{minWidth:640}}>
          {/* Header */}
          <div style={{display:"flex",marginBottom:4,paddingLeft:160}}>
            {Array.from({length:total+1},(_,i)=>(
              <div key={i} style={{width:`${100/total}%`,fontSize:10,color:"var(--color-text-secondary)",textAlign:"left"}}>{i}</div>
            ))}
          </div>
          {/* Rows */}
          {rows.map((a,i)=>(
            <div key={a.id} style={{display:"flex",alignItems:"center",marginBottom:5}}>
              <div style={{width:155,flexShrink:0,fontSize:11,fontWeight:500,color:"var(--color-text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",paddingRight:8,textAlign:"right"}}>{a.name}</div>
              <div style={{flex:1,position:"relative",height:24,background:"var(--color-background-secondary)",borderRadius:4}}>
                <div style={{
                  position:"absolute",
                  left:`${(a.start/total)*100}%`,
                  width:`${(a.dur/total)*100}%`,
                  height:"100%",
                  background:a.color+"CC",
                  borderRadius:4,
                  display:"flex",alignItems:"center",justifyContent:"center"
                }}>
                  <span style={{fontSize:10,color:"#fff",fontWeight:500,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",padding:"0 4px"}}>{a.dur}u</span>
                </div>
              </div>
            </div>
          ))}
          {/* Total */}
          <div style={{paddingLeft:160,marginTop:8,fontSize:11,color:"var(--color-text-secondary)"}}>Total sequential: {total} units · {agents.length} agents</div>
        </div>
      </div>
    </div>
  );
}

/* ── HELPERS ── */
function buildExportPayload(steps, name, color) {
  const agents = steps.map((id,i)=>{
    const a=agentById(id);
    return {
      step:i+1,
      id,
      name:a?.name ?? id,
      role:a?.role ?? "Workflow agent",
      category:a?.cat ?? "worker",
      estimatedDuration:a?.dur ?? 1
    };
  });

  return createWorkflowFile({
    id: slugWorkflowName(name),
    name,
    color,
    created: new Date().toISOString(),
    agents
  });
}

function toYAML(payload) {
  const a = payload.workflow;
  const rows = a.agents.map(ag=>`  - step: ${ag.step}\n    id: ${ag.id}\n    name: "${ag.name}"\n    role: "${ag.role}"\n    category: ${ag.category}\n    estimatedDuration: ${ag.estimatedDuration}`).join("\n");
  const nodes = a.flow.nodes.map(node=>`    - id: ${node.id}\n      type: ${node.type}\n      label: "${node.label}"\n      role: "${node.role}"\n      category: ${node.category}\n      estimatedDuration: ${node.estimatedDuration}`).join("\n");
  const edges = a.flow.edges.map(edge=>`    - source: ${edge.source}\n      target: ${edge.target}`).join("\n");
  return `workflow:\n  id: ${a.id}\n  name: "${a.name}"\n  color: "${a.color}"\n  created: ${a.created}\n  agents:\n${rows}\n  flow:\n    nodes:\n${nodes}\n    edges:\n${edges}`;
}
