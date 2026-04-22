/* eslint-disable */
import { useState, useEffect, useMemo } from "react";

// ── Supabase config ───────────────────────────────────────────────────────────
const SUPABASE_URL = "https://mswsvjaortcotuytlvdq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zd3N2amFvcnRjb3R1eXRsdmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Mzg3NjgsImV4cCI6MjA5MjQxNDc2OH0.9FxvfwGOW1ae6-EomRMhHMfVUY5aCfeyZHMDXgrCAyc";
const HEADERS = { "Content-Type": "application/json", "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` };

const db = {
  async getAll() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?select=*&order=created_at.desc`, { headers: HEADERS });
    return r.json();
  },
  async insert(lead) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads`, { method: "POST", headers: { ...HEADERS, "Prefer": "return=representation" }, body: JSON.stringify(toDb(lead)) });
    const data = await r.json();
    return data[0];
  },
  async update(id, patch) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, { method: "PATCH", headers: { ...HEADERS, "Prefer": "return=representation" }, body: JSON.stringify(toDb(patch)) });
    const data = await r.json();
    return data[0];
  },
  async delete(id) {
    await fetch(`${SUPABASE_URL}/rest/v1/leads?id=eq.${id}`, { method: "DELETE", headers: HEADERS });
  },
};

// map camelCase ↔ snake_case
const toDb = o => {
  const m = {};
  if (o.serialNo       !== undefined) m.serial_no       = o.serialNo;
  if (o.dateReceived   !== undefined) m.date_received   = o.dateReceived   || null;
  if (o.timeReceived   !== undefined) m.time_received   = o.timeReceived;
  if (o.leadName       !== undefined) m.lead_name       = o.leadName;
  if (o.phone          !== undefined) m.phone           = o.phone;
  if (o.whatsappNumber !== undefined) m.whatsapp_number = o.whatsappNumber;
  if (o.email          !== undefined) m.email           = o.email;
  if (o.gender         !== undefined) m.gender          = o.gender;
  if (o.city           !== undefined) m.city            = o.city;
  if (o.language       !== undefined) m.language        = o.language;
  if (o.adSource       !== undefined) m.ad_source       = o.adSource;
  if (o.adCampaign     !== undefined) m.ad_campaign     = o.adCampaign;
  if (o.adSet          !== undefined) m.ad_set          = o.adSet;
  if (o.product        !== undefined) m.product         = o.product;
  if (o.disposition    !== undefined) m.disposition     = o.disposition;
  if (o.callbackDate   !== undefined) m.callback_date   = o.callbackDate   || null;
  if (o.callbackTime   !== undefined) m.callback_time   = o.callbackTime;
  if (o.agent          !== undefined) m.agent           = o.agent;
  if (o.callNotes      !== undefined) m.call_notes      = o.callNotes;
  if (o.attemptCount   !== undefined) m.attempt_count   = o.attemptCount;
  if (o.lastCallDate   !== undefined) m.last_call_date  = o.lastCallDate   || null;
  if (o.sheetLink      !== undefined) m.sheet_link      = o.sheetLink;
  return m;
};

const fromDb = o => ({
  id:             o.id,
  serialNo:       o.serial_no       || "",
  dateReceived:   o.date_received   || "",
  timeReceived:   o.time_received   || "",
  leadName:       o.lead_name       || "",
  phone:          o.phone           || "",
  whatsappNumber: o.whatsapp_number || "",
  email:          o.email           || "",
  gender:         o.gender          || "Not Specified",
  city:           o.city            || "",
  language:       o.language        || "Arabic",
  adSource:       o.ad_source       || "Facebook",
  adCampaign:     o.ad_campaign     || "",
  adSet:          o.ad_set          || "",
  product:        o.product         || "",
  disposition:    o.disposition     || "New",
  callbackDate:   o.callback_date   || "",
  callbackTime:   o.callback_time   || "",
  agent:          o.agent           || "",
  callNotes:      o.call_notes      || "",
  attemptCount:   o.attempt_count   || 0,
  lastCallDate:   o.last_call_date  || "",
  sheetLink:      o.sheet_link      || "",
});

// ── constants ─────────────────────────────────────────────────────────────────
const AD_SOURCES  = ["Facebook", "Instagram", "WhatsApp Click-to-Chat"];
const DISPOSITIONS = [
  { label:"New",            color:"#6366f1", bg:"#eef2ff", icon:"🆕" },
  { label:"Contacted",      color:"#f59e0b", bg:"#fffbeb", icon:"📞" },
  { label:"Interested",     color:"#10b981", bg:"#ecfdf5", icon:"✅" },
  { label:"Not Interested", color:"#ef4444", bg:"#fef2f2", icon:"❌" },
  { label:"Callback",       color:"#3b82f6", bg:"#eff6ff", icon:"🔁" },
  { label:"No Answer",      color:"#8b5cf6", bg:"#f5f3ff", icon:"📵" },
  { label:"Wrong Number",   color:"#64748b", bg:"#f8fafc", icon:"🚫" },
  { label:"Converted",      color:"#059669", bg:"#d1fae5", icon:"🏆" },
  { label:"Dropped",        color:"#dc2626", bg:"#fee2e2", icon:"🗑️" },
];
const AGENTS    = ["Rania K.", "Omar S.", "Lina M.", "Tariq H.", "Sara A."];
const PRODUCTS  = ["Product A", "Product B", "Product C", "Service Plan X", "Service Plan Y"];
const LANGUAGES = ["Arabic", "English", "French", "Urdu", "Hindi", "Other"];
const GENDERS   = ["Male", "Female", "Not Specified"];
const CITIES    = ["Dubai","Abu Dhabi","Sharjah","Riyadh","Jeddah","Cairo","Amman","Kuwait City","Doha","Other"];

const EMPTY = { serialNo:"", dateReceived:new Date().toISOString().split("T")[0], timeReceived:"", leadName:"", phone:"", whatsappNumber:"", email:"", gender:"Not Specified", city:"", language:"Arabic", adSource:"Facebook", adCampaign:"", adSet:"", product:"", disposition:"New", callbackDate:"", callbackTime:"", agent:AGENTS[0], callNotes:"", attemptCount:0, lastCallDate:"", sheetLink:"" };

const todayStr  = () => new Date().toISOString().split("T")[0];
const isOverdue  = l => l.disposition==="Callback" && l.callbackDate && l.callbackDate < todayStr();
const isDueToday = l => l.disposition==="Callback" && l.callbackDate && l.callbackDate === todayStr();
const getD       = label => DISPOSITIONS.find(d => d.label===label) || DISPOSITIONS[0];

// ── tiny UI components ────────────────────────────────────────────────────────
function Badge({ label }) {
  const d = getD(label);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:d.bg, color:d.color, border:`1px solid ${d.color}33`, borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{d.icon} {label}</span>;
}

function SrcBadge({ source }) {
  const m = { Facebook:{c:"#1877f2",bg:"#e7f0fd",i:"f"}, Instagram:{c:"#c13584",bg:"#fce4f5",i:"◈"}, "WhatsApp Click-to-Chat":{c:"#25d366",bg:"#e3fbe9",i:"W"} };
  const s = m[source]||{c:"#64748b",bg:"#f1f5f9",i:"?"};
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.c, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:800 }}>{s.i} {source==="WhatsApp Click-to-Chat"?"WhatsApp":source}</span>;
}

function Ava({ name, size=30 }) {
  const pal = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6"];
  const c = pal[(name||"A").charCodeAt(0)%pal.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:c, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:800, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>;
}

function Stat({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background:"#fff", borderRadius:13, padding:"16px 18px", flex:1, minWidth:120, border:"1px solid #e9ecf3", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:accent }} />
      <div style={{ fontSize:18, marginBottom:5 }}>{icon}</div>
      <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, letterSpacing:.5 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:900, color:"#0f172a", fontFamily:"'Sora',sans-serif", lineHeight:1.1 }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

function Modal({ show, onClose, width=640, children }) {
  useEffect(() => { document.body.style.overflow = show?"hidden":""; return ()=>{document.body.style.overflow="";} }, [show]);
  if (!show) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(2,8,23,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(3px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:width, maxHeight:"93vh", overflowY:"auto", boxShadow:"0 32px 96px rgba(0,0,0,.22)", animation:"mIn .22s cubic-bezier(.34,1.56,.64,1)" }}>
        {children}
      </div>
    </div>
  );
}

function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type==="error" ? "#ef4444" : "#10b981";
  return <div style={{ position:"fixed", bottom:24, right:24, background:bg, color:"#fff", borderRadius:10, padding:"12px 20px", fontWeight:700, fontSize:14, zIndex:9999, boxShadow:"0 8px 24px rgba(0,0,0,.2)", animation:"mIn .2s ease" }}>{msg}</div>;
}

// ── lead form ─────────────────────────────────────────────────────────────────
function LeadForm({ initial, onSave, onCancel, title, saving }) {
  const [f, setF] = useState(initial);
  const s = (k,v) => setF(x=>({...x,[k]:v}));
  const inp = { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#fafbfc", boxSizing:"border-box", color:"#0f172a" };
  const F = ({ label, span, children }) => (
    <div style={{ gridColumn:span||"auto" }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:3, letterSpacing:.4 }}>{label}</label>
      {children}
    </div>
  );

  return (
    <div style={{ padding:26 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontWeight:900, fontSize:18, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>{title}</div>
        <button onClick={onCancel} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
      </div>

      <div style={{ fontSize:10, fontWeight:800, color:"#6366f1", letterSpacing:1, marginBottom:10 }}>📋 LEAD INFO</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        <F label="Serial No"><input value={f.serialNo} onChange={e=>s("serialNo",e.target.value)} style={inp} placeholder="LD-001"/></F>
        <F label="Date Received"><input type="date" value={f.dateReceived} onChange={e=>s("dateReceived",e.target.value)} style={inp}/></F>
        <F label="Time Received"><input type="time" value={f.timeReceived} onChange={e=>s("timeReceived",e.target.value)} style={inp}/></F>
      </div>

      <div style={{ fontSize:10, fontWeight:800, color:"#10b981", letterSpacing:1, marginBottom:10 }}>👤 CONTACT DETAILS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <F label="Lead Name *" span="1/-1"><input value={f.leadName} onChange={e=>s("leadName",e.target.value)} style={inp} placeholder="Full name"/></F>
        <F label="Phone Number"><input value={f.phone} onChange={e=>s("phone",e.target.value)} style={inp} placeholder="+971501234567"/></F>
        <F label="WhatsApp Number"><input value={f.whatsappNumber} onChange={e=>s("whatsappNumber",e.target.value)} style={inp} placeholder="+971501234567"/></F>
        <F label="Email"><input type="email" value={f.email} onChange={e=>s("email",e.target.value)} style={inp}/></F>
        <F label="Gender"><select value={f.gender} onChange={e=>s("gender",e.target.value)} style={{...inp,cursor:"pointer"}}>{GENDERS.map(g=><option key={g}>{g}</option>)}</select></F>
        <F label="City"><select value={f.city} onChange={e=>s("city",e.target.value)} style={{...inp,cursor:"pointer"}}><option value="">Select city…</option>{CITIES.map(c=><option key={c}>{c}</option>)}</select></F>
        <F label="Language"><select value={f.language} onChange={e=>s("language",e.target.value)} style={{...inp,cursor:"pointer"}}>{LANGUAGES.map(l=><option key={l}>{l}</option>)}</select></F>
      </div>

      <div style={{ fontSize:10, fontWeight:800, color:"#f59e0b", letterSpacing:1, marginBottom:10 }}>📣 AD SOURCE</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        <F label="Platform"><select value={f.adSource} onChange={e=>s("adSource",e.target.value)} style={{...inp,cursor:"pointer"}}>{AD_SOURCES.map(x=><option key={x}>{x}</option>)}</select></F>
        <F label="Campaign Name"><input value={f.adCampaign} onChange={e=>s("adCampaign",e.target.value)} style={inp} placeholder="e.g. Ramadan Promo"/></F>
        <F label="Ad Set / Audience"><input value={f.adSet} onChange={e=>s("adSet",e.target.value)} style={inp} placeholder="e.g. UAE Males 25-40"/></F>
      </div>

      <div style={{ fontSize:10, fontWeight:800, color:"#3b82f6", letterSpacing:1, marginBottom:10 }}>💼 SALES DETAILS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:10, marginBottom:16 }}>
        <F label="Product / Service"><select value={f.product} onChange={e=>s("product",e.target.value)} style={{...inp,cursor:"pointer"}}><option value="">Select…</option>{PRODUCTS.map(p=><option key={p}>{p}</option>)}</select></F>
        <F label="Assigned Agent"><select value={f.agent} onChange={e=>s("agent",e.target.value)} style={{...inp,cursor:"pointer"}}>{AGENTS.map(a=><option key={a}>{a}</option>)}</select></F>
        <F label="Call Attempts"><input type="number" min="0" value={f.attemptCount} onChange={e=>s("attemptCount",Number(e.target.value))} style={inp}/></F>
        <F label="Disposition"><select value={f.disposition} onChange={e=>s("disposition",e.target.value)} style={{...inp,cursor:"pointer"}}>{DISPOSITIONS.map(d=><option key={d.label}>{d.label}</option>)}</select></F>
        <F label="Last Call Date"><input type="date" value={f.lastCallDate} onChange={e=>s("lastCallDate",e.target.value)} style={inp}/></F>
        <F label="Google Sheet Link"><input value={f.sheetLink} onChange={e=>s("sheetLink",e.target.value)} style={inp} placeholder="https://docs.google.com/…"/></F>
      </div>

      {(f.disposition==="Callback"||f.disposition==="No Answer") && (
        <div style={{ background:"#eff6ff", border:"1.5px solid #3b82f6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:800, color:"#3b82f6", letterSpacing:1, marginBottom:10 }}>🔁 CALLBACK SCHEDULE</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <F label="Callback Date"><input type="date" value={f.callbackDate} onChange={e=>s("callbackDate",e.target.value)} style={inp}/></F>
            <F label="Callback Time"><input type="time" value={f.callbackTime} onChange={e=>s("callbackTime",e.target.value)} style={inp}/></F>
          </div>
        </div>
      )}

      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:3, letterSpacing:.4 }}>Call Notes</label>
        <textarea value={f.callNotes} onChange={e=>s("callNotes",e.target.value)} rows={3} style={{...inp,resize:"vertical"}} placeholder="Notes from the call…"/>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{ padding:"9px 18px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, color:"#64748b", fontFamily:"inherit" }}>Cancel</button>
        <button onClick={()=>f.leadName&&onSave(f)} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(99,102,241,.35)", opacity:saving?0.7:1 }}>
          {saving ? "Saving…" : "Save Lead"}
        </button>
      </div>
    </div>
  );
}

// ── disposition quick panel ───────────────────────────────────────────────────
function DispPanel({ lead, onUpdate, onClose, saving }) {
  const [disp, setDisp]     = useState(lead.disposition);
  const [notes, setNotes]   = useState(lead.callNotes);
  const [cbDate, setCbDate] = useState(lead.callbackDate);
  const [cbTime, setCbTime] = useState(lead.callbackTime);
  const [tries, setTries]   = useState(lead.attemptCount);
  const needCb = disp==="Callback"||disp==="No Answer";
  const inp = { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#fff", boxSizing:"border-box" };

  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontWeight:900, fontSize:17, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>Update Disposition</div>
          <div style={{ fontSize:13, color:"#64748b", marginTop:1 }}>{lead.leadName} · {lead.phone}</div>
        </div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
      </div>

      <div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:8, letterSpacing:.4 }}>SELECT DISPOSITION</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7, marginBottom:16 }}>
        {DISPOSITIONS.map(d=>(
          <button key={d.label} onClick={()=>setDisp(d.label)} style={{ padding:"8px 5px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit", border:disp===d.label?`2px solid ${d.color}`:"1.5px solid #e2e8f0", background:disp===d.label?d.bg:"#fafbfc", color:disp===d.label?d.color:"#64748b" }}>
            {d.icon} {d.label}
          </button>
        ))}
      </div>

      {needCb && (
        <div style={{ background:"#eff6ff", border:"1.5px solid #3b82f6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
          <div style={{ fontSize:10, fontWeight:700, color:"#3b82f6", marginBottom:10 }}>🔁 SCHEDULE CALLBACK</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            <div><div style={{ fontSize:11, color:"#64748b", marginBottom:3 }}>Date</div><input type="date" value={cbDate} onChange={e=>setCbDate(e.target.value)} style={inp}/></div>
            <div><div style={{ fontSize:11, color:"#64748b", marginBottom:3 }}>Time</div><input type="time" value={cbTime} onChange={e=>setCbTime(e.target.value)} style={inp}/></div>
          </div>
        </div>
      )}

      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:6 }}>CALL NOTES</div>
        <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{...inp,resize:"vertical"}} placeholder="What happened on this call?"/>
      </div>

      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b" }}>CALL ATTEMPTS</div>
        <button onClick={()=>setTries(Math.max(0,tries-1))} style={{ width:28, height:28, borderRadius:6, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"inherit" }}>−</button>
        <span style={{ fontWeight:800, fontSize:16, minWidth:24, textAlign:"center" }}>{tries}</span>
        <button onClick={()=>setTries(tries+1)} style={{ width:28, height:28, borderRadius:6, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"inherit" }}>+</button>
      </div>

      <button onClick={()=>onUpdate({ disposition:disp, callNotes:notes, callbackDate:cbDate, callbackTime:cbTime, attemptCount:tries, lastCallDate:todayStr() })}
        disabled={saving}
        style={{ width:"100%", padding:12, borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", cursor:"pointer", fontWeight:800, fontSize:14, color:"#fff", fontFamily:"inherit", opacity:saving?0.7:1 }}>
        {saving ? "Saving…" : "Save Update"}
      </button>
    </div>
  );
}

// ── callbacks panel ───────────────────────────────────────────────────────────
function CallbacksPanel({ leads, onSelect }) {
  const overdue  = leads.filter(isOverdue);
  const dueToday = leads.filter(isDueToday);
  const upcoming = leads.filter(l=>l.disposition==="Callback"&&l.callbackDate&&l.callbackDate>todayStr());

  const Row = ({ lead, tag, tagColor }) => (
    <div onClick={()=>onSelect(lead)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background:"#fff", border:"1px solid #e9ecf3", marginBottom:8, cursor:"pointer" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.08)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <Ava name={lead.leadName} size={36}/>
      <div style={{ flex:1 }}>
        <div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{lead.leadName}</div>
        <div style={{ fontSize:12, color:"#64748b" }}>{lead.phone} · {lead.agent}</div>
      </div>
      <div style={{ textAlign:"right" }}>
        <div style={{ fontSize:12, fontWeight:700, color:tagColor, background:tagColor+"18", borderRadius:6, padding:"2px 8px", marginBottom:2 }}>{tag}</div>
        <div style={{ fontSize:11, color:"#94a3b8" }}>{lead.callbackDate} {lead.callbackTime}</div>
      </div>
    </div>
  );

  const Section = ({ title, items, tag, tagColor }) => items.length ? (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:12, fontWeight:800, color:tagColor, marginBottom:10 }}>{title} ({items.length})</div>
      {items.map(l=><Row key={l.id} lead={l} tag={tag} tagColor={tagColor}/>)}
    </div>
  ) : null;

  return overdue.length+dueToday.length+upcoming.length===0 ? (
    <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}><div style={{ fontSize:36, marginBottom:8 }}>✅</div><div style={{ fontWeight:600 }}>No callbacks scheduled</div></div>
  ) : (
    <>
      <Section title="🚨 OVERDUE"   items={overdue}  tag="Overdue"   tagColor="#ef4444"/>
      <Section title="⏰ DUE TODAY" items={dueToday} tag="Today"     tagColor="#f59e0b"/>
      <Section title="📅 UPCOMING"  items={upcoming} tag="Scheduled" tagColor="#3b82f6"/>
    </>
  );
}

// ── main app ──────────────────────────────────────────────────────────────────
export default function App() {
  const [leads, setLeads]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [toast, setToast]       = useState(null);
  const [tab, setTab]           = useState("leads");
  const [search, setSearch]     = useState("");
  const [fDisp, setFDisp]       = useState("All");
  const [fSrc, setFSrc]         = useState("All");
  const [fAgent, setFAgent]     = useState("All");
  const [fProd, setFProd]       = useState("All");
  const [sortBy, setSortBy]     = useState("dateReceived");
  const [showAdd, setShowAdd]   = useState(false);
  const [editLead, setEditLead] = useState(null);
  const [dispLead, setDispLead] = useState(null);
  const [detail, setDetail]     = useState(null);
  const [delLead, setDelLead]   = useState(null);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // load leads from Supabase on mount
  useEffect(() => {
    db.getAll()
      .then(data => { setLeads((data||[]).map(fromDb)); setLoading(false); })
      .catch(() => { showToast("Failed to load leads", "error"); setLoading(false); });
  }, []);

  const urgentCbs = useMemo(()=>leads.filter(l=>isOverdue(l)||isDueToday(l)).length,[leads]);

  const filtered = useMemo(()=>leads.filter(l=>{
    const q=search.toLowerCase();
    return (!q||l.leadName.toLowerCase().includes(q)||l.phone.includes(q)||l.adCampaign?.toLowerCase().includes(q))
      &&(fDisp==="All"||l.disposition===fDisp)
      &&(fSrc==="All"||l.adSource===fSrc)
      &&(fAgent==="All"||l.agent===fAgent)
      &&(fProd==="All"||l.product===fProd);
  }).sort((a,b)=>{
    if(sortBy==="leadName") return a.leadName.localeCompare(b.leadName);
    if(sortBy==="attempts") return b.attemptCount-a.attemptCount;
    return (b.dateReceived+b.timeReceived).localeCompare(a.dateReceived+a.timeReceived);
  }),[leads,search,fDisp,fSrc,fAgent,fProd,sortBy]);

  const add = async form => {
    setSaving(true);
    try {
      const saved = await db.insert(form);
      setLeads(ls=>[fromDb(saved), ...ls]);
      setShowAdd(false);
      showToast("✅ Lead added successfully!");
    } catch { showToast("Failed to add lead", "error"); }
    setSaving(false);
  };

  const upd = async (id, patch) => {
    setSaving(true);
    try {
      const saved = await db.update(id, patch);
      const updated = fromDb(saved);
      setLeads(ls=>ls.map(l=>l.id===id ? updated : l));
      if(detail?.id===id) setDetail(updated);
      setDispLead(null); setEditLead(null);
      showToast("✅ Lead updated!");
    } catch { showToast("Failed to update lead", "error"); }
    setSaving(false);
  };

  const del = async id => {
    setSaving(true);
    try {
      await db.delete(id);
      setLeads(ls=>ls.filter(l=>l.id!==id));
      setDelLead(null); setDetail(null);
      showToast("🗑️ Lead deleted");
    } catch { showToast("Failed to delete lead", "error"); }
    setSaving(false);
  };

  const total=leads.length;
  const fb=leads.filter(l=>l.adSource==="Facebook").length;
  const ig=leads.filter(l=>l.adSource==="Instagram").length;
  const wa=leads.filter(l=>l.adSource==="WhatsApp Click-to-Chat").length;
  const conv=leads.filter(l=>l.disposition==="Converted").length;
  const intr=leads.filter(l=>l.disposition==="Interested").length;
  const cbs=leads.filter(l=>l.disposition==="Callback").length;

  const inp = { border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 11px", fontSize:13, fontFamily:"inherit", background:"#fff", outline:"none", cursor:"pointer", color:"#0f172a" };
  const navB = (id,lbl,badge) => (
    <button onClick={()=>setTab(id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", background:tab===id?"#fff":"transparent", color:tab===id?"#0f172a":"#94a3b8", boxShadow:tab===id?"0 1px 4px rgba(0,0,0,.1)":"none", display:"flex", alignItems:"center", gap:5 }}>
      {lbl}{badge>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:900 }}>{badge}</span>}
    </button>
  );

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f0f2f8", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        @keyframes mIn{from{transform:scale(.94) translateY(12px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        input:focus,select:focus,textarea:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
        tbody tr:hover td{background:#f8f9ff!important}
      `}</style>

      {/* header */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e9ecf3", padding:"0 22px" }}>
        <div style={{ maxWidth:1500, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:"linear-gradient(135deg,#6366f1,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📲</div>
            <div>
              <div style={{ fontWeight:900, fontSize:16, color:"#0f172a", fontFamily:"'Sora',sans-serif", lineHeight:1.1 }}>LeadFlow</div>
              <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, letterSpacing:.4 }}>TELESALES CRM</div>
            </div>
          </div>
          <div style={{ display:"flex", gap:3, background:"#f0f2f8", borderRadius:10, padding:3 }}>
            {navB("leads","📋 All Leads")}
            {navB("callbacks","🔁 Callbacks",urgentCbs)}
            {navB("analytics","📊 Analytics")}
          </div>
          <button onClick={()=>setShowAdd(true)} style={{ padding:"9px 18px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 14px rgba(99,102,241,.4)" }}>+ Add Lead</button>
        </div>
      </div>

      <div style={{ maxWidth:1500, margin:"0 auto", padding:"20px 22px" }}>

        {/* stats */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <Stat icon="👥" label="TOTAL LEADS" value={loading?"…":total} sub={`${filtered.length} shown`} accent="#6366f1"/>
          <Stat icon="✅" label="INTERESTED"  value={loading?"…":intr}  sub="hot prospects"              accent="#10b981"/>
          <Stat icon="🏆" label="CONVERTED"   value={loading?"…":conv}  sub={`${total?((conv/total)*100).toFixed(0):0}% rate`} accent="#059669"/>
          <Stat icon="🔁" label="CALLBACKS"   value={loading?"…":cbs}   sub={`${urgentCbs} urgent`}      accent="#3b82f6"/>
          <Stat icon="f"  label="FACEBOOK"    value={loading?"…":fb}    sub="leads"                      accent="#1877f2"/>
          <Stat icon="◈"  label="INSTAGRAM"   value={loading?"…":ig}    sub="leads"                      accent="#c13584"/>
          <Stat icon="W"  label="WHATSAPP"    value={loading?"…":wa}    sub="leads"                      accent="#25d366"/>
        </div>

        {/* loading state */}
        {loading && (
          <div style={{ textAlign:"center", padding:60 }}>
            <div style={{ width:40, height:40, border:"4px solid #e2e8f0", borderTop:"4px solid #6366f1", borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/>
            <div style={{ color:"#64748b", fontWeight:600 }}>Loading leads from database…</div>
          </div>
        )}

        {/* ── LEADS TAB ── */}
        {!loading && tab==="leads" && (
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search name, phone, campaign…" style={{...inp,flex:1,minWidth:200,cursor:"text"}}/>
              <select value={fDisp}  onChange={e=>setFDisp(e.target.value)}  style={inp}><option value="All">All Dispositions</option>{DISPOSITIONS.map(d=><option key={d.label}>{d.label}</option>)}</select>
              <select value={fSrc}   onChange={e=>setFSrc(e.target.value)}   style={inp}><option value="All">All Sources</option>{AD_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
              <select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={inp}><option value="All">All Agents</option>{AGENTS.map(a=><option key={a}>{a}</option>)}</select>
              <select value={fProd}  onChange={e=>setFProd(e.target.value)}  style={inp}><option value="All">All Products</option>{PRODUCTS.map(p=><option key={p}>{p}</option>)}</select>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={inp}>
                <option value="dateReceived">Newest First</option>
                <option value="leadName">Name A–Z</option>
                <option value="attempts">Most Attempts</option>
              </select>
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ background:"#f8f9ff", borderBottom:"1.5px solid #e9ecf3" }}>
                    {["#","Date / Time","Lead Name","Phone & WhatsApp","Source","Campaign / Ad Set","Product","Disposition","Agent","Tries","Callback","Actions"].map(h=>(
                      <th key={h} style={{ padding:"11px 12px", textAlign:"left", fontSize:10, fontWeight:800, color:"#6366f1", letterSpacing:.5, whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(l=>{
                    const ov=isOverdue(l), dt=isDueToday(l);
                    return (
                      <tr key={l.id} style={{ borderBottom:"1px solid #f1f5f9", background:ov?"#fff5f5":dt?"#fffbeb":"#fff" }}>
                        <td style={{ padding:"11px 12px", color:"#94a3b8", fontSize:11, fontWeight:700 }}>{l.serialNo||`LD-${l.id}`}</td>
                        <td style={{ padding:"11px 12px", whiteSpace:"nowrap" }}>
                          <div style={{ fontSize:12, fontWeight:700, color:"#0f172a" }}>{l.dateReceived}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{l.timeReceived||"—"}</div>
                        </td>
                        <td style={{ padding:"11px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                            <Ava name={l.leadName} size={30}/>
                            <div>
                              <div style={{ fontWeight:700, color:"#0f172a", cursor:"pointer", textDecoration:"underline dotted" }} onClick={()=>setDetail(l)}>{l.leadName}</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>{l.city} · {l.gender} · {l.language}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ padding:"11px 12px", whiteSpace:"nowrap" }}>
                          <div style={{ fontWeight:600 }}>{l.phone}</div>
                          <a href={`https://wa.me/${(l.whatsappNumber||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer"
                            style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3, background:"#25d366", color:"#fff", borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:800, textDecoration:"none" }}>
                            W Chat
                          </a>
                        </td>
                        <td style={{ padding:"11px 12px" }}><SrcBadge source={l.adSource}/></td>
                        <td style={{ padding:"11px 12px" }}>
                          <div style={{ fontSize:12, fontWeight:600, color:"#0f172a" }}>{l.adCampaign||"—"}</div>
                          <div style={{ fontSize:11, color:"#94a3b8" }}>{l.adSet||""}</div>
                        </td>
                        <td style={{ padding:"11px 12px", fontSize:12, color:"#475569", fontWeight:600 }}>{l.product||"—"}</td>
                        <td style={{ padding:"11px 12px" }}><Badge label={l.disposition}/></td>
                        <td style={{ padding:"11px 12px" }}>
                          <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                            <Ava name={l.agent} size={22}/>
                            <span style={{ fontSize:12, color:"#475569" }}>{l.agent}</span>
                          </div>
                        </td>
                        <td style={{ padding:"11px 12px", textAlign:"center" }}>
                          <span style={{ fontWeight:800, fontSize:14, color:l.attemptCount>=4?"#ef4444":l.attemptCount>=2?"#f59e0b":"#0f172a" }}>{l.attemptCount}</span>
                        </td>
                        <td style={{ padding:"11px 12px", whiteSpace:"nowrap" }}>
                          {l.callbackDate?(
                            <div style={{ fontSize:11 }}>
                              <div style={{ fontWeight:700, color:ov?"#ef4444":dt?"#f59e0b":"#3b82f6" }}>{ov?"🚨 Overdue":dt?"⏰ Today":"📅 "+l.callbackDate}</div>
                              <div style={{ color:"#94a3b8" }}>{l.callbackTime}</div>
                            </div>
                          ):<span style={{ color:"#cbd5e1", fontSize:11 }}>—</span>}
                        </td>
                        <td style={{ padding:"11px 12px" }}>
                          <div style={{ display:"flex", gap:4 }}>
                            <button onClick={()=>setDispLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#eef2ff", color:"#6366f1", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Update</button>
                            <button onClick={()=>setEditLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#f1f5f9", color:"#475569", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Edit</button>
                            <button onClick={()=>setDelLead(l)}  style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#fef2f2", color:"#ef4444", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Del</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length===0&&<tr><td colSpan={12} style={{ padding:44, textAlign:"center", color:"#94a3b8", fontStyle:"italic" }}>{leads.length===0?"No leads yet — add your first lead!":"No leads match your filters"}</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:"#94a3b8", textAlign:"right" }}>Showing {filtered.length} of {total} leads</div>
          </>
        )}

        {/* ── CALLBACKS TAB ── */}
        {!loading && tab==="callbacks" && (
          <div style={{ maxWidth:680 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:18 }}>🔁 Callback Schedule</div>
            <CallbacksPanel leads={leads} onSelect={l=>setDispLead(l)}/>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {!loading && tab==="analytics" && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Disposition Breakdown</div>
              {DISPOSITIONS.map(d=>{
                const n=leads.filter(l=>l.disposition===d.label).length;
                const p=total?(n/total)*100:0;
                return n>0?(
                  <div key={d.label} style={{ marginBottom:11 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>{d.icon} {d.label}</span>
                      <div style={{ display:"flex", gap:10 }}><span style={{ fontSize:12, color:"#94a3b8" }}>{n}</span><span style={{ fontSize:12, fontWeight:800, color:d.color }}>{p.toFixed(0)}%</span></div>
                    </div>
                    <div style={{ background:"#f1f5f9", borderRadius:6, height:7, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`, background:d.color, borderRadius:6 }}/>
                    </div>
                  </div>
                ):null;
              })}
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Leads by Ad Platform</div>
              {[{src:"Facebook",n:fb,c:"#1877f2"},{src:"Instagram",n:ig,c:"#c13584"},{src:"WhatsApp Click-to-Chat",n:wa,c:"#25d366"}].map(({src,n,c})=>{
                const p=total?(n/total)*100:0;
                return (
                  <div key={src} style={{ marginBottom:18 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                      <span style={{ fontSize:13, fontWeight:700 }}>{src==="WhatsApp Click-to-Chat"?"WhatsApp":src}</span>
                      <span style={{ fontSize:13, fontWeight:800, color:c }}>{n} ({p.toFixed(0)}%)</span>
                    </div>
                    <div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${p}%`, background:c, borderRadius:8 }}/>
                    </div>
                  </div>
                );
              })}
              <div style={{ borderTop:"1px solid #f1f5f9", marginTop:16, paddingTop:16 }}>
                <div style={{ fontWeight:800, fontSize:14, marginBottom:12 }}>Conversion by Source</div>
                {AD_SOURCES.map(src=>{
                  const sl=leads.filter(l=>l.adSource===src);
                  const sc=sl.filter(l=>l.disposition==="Converted").length;
                  return <div key={src} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid #f8f9fc", fontSize:13 }}>
                    <span style={{ color:"#475569", fontWeight:600 }}>{src==="WhatsApp Click-to-Chat"?"WhatsApp":src}</span>
                    <span style={{ fontWeight:800, color:"#059669" }}>{sc}/{sl.length} ({sl.length?((sc/sl.length)*100).toFixed(0):0}%)</span>
                  </div>;
                })}
              </div>
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Agent Performance</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ borderBottom:"1px solid #f1f5f9" }}>{["Agent","Leads","Conv","Int","Rate"].map(h=><th key={h} style={{ padding:"5px 8px", textAlign:"left", fontSize:10, fontWeight:800, color:"#94a3b8" }}>{h}</th>)}</tr></thead>
                <tbody>
                  {AGENTS.map(a=>{
                    const al=leads.filter(l=>l.agent===a);
                    if(!al.length) return null;
                    const ac=al.filter(l=>l.disposition==="Converted").length;
                    const ai=al.filter(l=>l.disposition==="Interested").length;
                    const r=((ac/al.length)*100).toFixed(0);
                    return <tr key={a} style={{ borderBottom:"1px solid #f8f9fc" }}>
                      <td style={{ padding:"9px 8px" }}><div style={{ display:"flex", alignItems:"center", gap:7 }}><Ava name={a} size={24}/><span style={{ fontWeight:700 }}>{a}</span></div></td>
                      <td style={{ padding:"9px 8px", color:"#475569" }}>{al.length}</td>
                      <td style={{ padding:"9px 8px" }}><span style={{ background:"#d1fae5", color:"#059669", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{ac}</span></td>
                      <td style={{ padding:"9px 8px" }}><span style={{ background:"#ecfdf5", color:"#10b981", borderRadius:20, padding:"1px 7px", fontSize:11, fontWeight:800 }}>{ai}</span></td>
                      <td style={{ padding:"9px 8px", fontWeight:900, color:Number(r)>=20?"#059669":"#0f172a" }}>{r}%</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Top Campaigns</div>
              {(()=>{
                const m={};
                leads.forEach(l=>{ if(l.adCampaign) m[l.adCampaign]=(m[l.adCampaign]||0)+1; });
                const entries=Object.entries(m).sort((a,b)=>b[1]-a[1]);
                return entries.length===0?<div style={{ color:"#94a3b8", fontSize:13 }}>No campaign data yet</div>:entries.map(([name,n])=>(
                  <div key={name} style={{ marginBottom:11 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                      <span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>{name}</span>
                      <span style={{ fontSize:12, fontWeight:800, color:"#6366f1" }}>{n} leads</span>
                    </div>
                    <div style={{ background:"#f1f5f9", borderRadius:6, height:7, overflow:"hidden" }}>
                      <div style={{ height:"100%", width:`${(n/total)*100}%`, background:"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:6 }}/>
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
        )}
      </div>

      {/* modals */}
      <Modal show={showAdd} onClose={()=>setShowAdd(false)} width={700}>
        <LeadForm initial={EMPTY} onSave={add} onCancel={()=>setShowAdd(false)} title="➕ Add New Lead" saving={saving}/>
      </Modal>
      <Modal show={!!editLead} onClose={()=>setEditLead(null)} width={700}>
        {editLead&&<LeadForm initial={editLead} onSave={f=>upd(editLead.id,f)} onCancel={()=>setEditLead(null)} title="✏️ Edit Lead" saving={saving}/>}
      </Modal>
      <Modal show={!!dispLead} onClose={()=>setDispLead(null)} width={480}>
        {dispLead&&<DispPanel lead={dispLead} onUpdate={p=>upd(dispLead.id,p)} onClose={()=>setDispLead(null)} saving={saving}/>}
      </Modal>

      {/* detail modal */}
      <Modal show={!!detail} onClose={()=>setDetail(null)} width={560}>
        {detail&&(
          <div style={{ padding:26 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
              <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                <Ava name={detail.leadName} size={46}/>
                <div>
                  <div style={{ fontWeight:900, fontSize:18, fontFamily:"'Sora',sans-serif" }}>{detail.leadName}</div>
                  <div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}><SrcBadge source={detail.adSource}/><Badge label={detail.disposition}/></div>
                </div>
              </div>
              <button onClick={()=>setDetail(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
              {[["📞 Phone",detail.phone],["💬 WhatsApp",detail.whatsappNumber],["📧 Email",detail.email||"—"],["🏙️ City",detail.city||"—"],["🗣️ Language",detail.language],["⚥ Gender",detail.gender],["📣 Campaign",detail.adCampaign||"—"],["👥 Ad Set",detail.adSet||"—"],["🛒 Product",detail.product||"—"],["👤 Agent",detail.agent],["📊 Attempts",detail.attemptCount],["📅 Last Call",detail.lastCallDate||"—"]].map(([k,v])=>(
                <div key={k} style={{ background:"#f8f9ff", borderRadius:8, padding:"9px 12px" }}>
                  <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, marginBottom:1 }}>{k}</div>
                  <div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{String(v)}</div>
                </div>
              ))}
            </div>
            {detail.callbackDate&&<div style={{ background:"#eff6ff", border:"1px solid #3b82f6", borderRadius:10, padding:"10px 14px", marginBottom:10 }}><div style={{ fontSize:10, fontWeight:800, color:"#3b82f6", marginBottom:2 }}>🔁 CALLBACK SCHEDULED</div><div style={{ fontWeight:700 }}>{detail.callbackDate} at {detail.callbackTime}</div></div>}
            {detail.callNotes&&<div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:12 }}><div style={{ fontSize:10, fontWeight:800, color:"#92400e", marginBottom:3 }}>📝 CALL NOTES</div><div style={{ fontSize:13, color:"#78350f" }}>{detail.callNotes}</div></div>}
            {detail.sheetLink&&<a href={detail.sheetLink} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e8f5e9", color:"#2e7d32", borderRadius:8, padding:"7px 14px", textDecoration:"none", fontWeight:700, fontSize:13, marginBottom:14 }}>📊 Open Google Sheet</a>}
            <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
              <a href={`https://wa.me/${(detail.whatsappNumber||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ padding:"9px 15px", borderRadius:8, background:"#25d366", color:"#fff", fontWeight:800, fontSize:13, textDecoration:"none" }}>W Chat</a>
              <button onClick={()=>{setDispLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#eef2ff", color:"#6366f1", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Update Status</button>
              <button onClick={()=>{setEditLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#0f172a", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Edit Lead</button>
            </div>
          </div>
        )}
      </Modal>

      {/* delete confirm */}
      <Modal show={!!delLead} onClose={()=>setDelLead(null)} width={380}>
        {delLead&&(
          <div style={{ padding:32, textAlign:"center" }}>
            <div style={{ fontSize:42, marginBottom:12 }}>🗑️</div>
            <div style={{ fontWeight:900, fontSize:17, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>Delete this lead?</div>
            <div style={{ color:"#64748b", marginBottom:22, fontSize:14 }}>This will permanently remove <strong>{delLead.leadName}</strong> from the database.</div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={()=>setDelLead(null)} style={{ padding:"9px 22px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", color:"#64748b" }}>Cancel</button>
              <button onClick={()=>del(delLead.id)} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit", opacity:saving?0.7:1 }}>{saving?"Deleting…":"Delete"}</button>
            </div>
          </div>
        )}
      </Modal>

      {/* toast */}
      {toast && <Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}
