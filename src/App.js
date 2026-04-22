/* eslint-disable */
import { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://mswsvjaortcotuytlvdq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zd3N2amFvcnRjb3R1eXRsdmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Mzg3NjgsImV4cCI6MjA5MjQxNDc2OH0.9FxvfwGOW1ae6-EomRMhHMfVUY5aCfeyZHMDXgrCAyc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const ADMIN_EMAIL = "rashick2012@gmail.com";
const SHEET_ID = "1jdXliIwb3J9R_IA2XAxIgNFrpjuAMUCtd3-d2o5UMxE";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

// ── Sheet column mapping ──────────────────────────────────────────────────────
// Your sheet columns: Date Received | Customer Name | Phone Number | EID NO |
// WhatsApp Number | Assigned Agent | Lead Status | Call Status | Call Outcome |
// Call Attempts | Last Call Time | Follow-up Date | Sales Status | Remarks | Last Updated
const parseSheetRow = (row, idx) => ({
  sheetRowId:    `row_${idx + 2}`,
  dateReceived:  cleanDate(row[0]  || ""),
  leadName:      row[1]  || "",
  phone:         row[2]  || "",
  eidNo:         row[3]  || "",
  whatsappNumber:row[4]  || "",
  agent:         row[5]  || "",
  leadStatus:    row[6]  || "",
  callStatus:    row[7]  || "",
  disposition:   mapDisposition(row[8] || ""),
  attemptCount:  parseInt(row[9]) || 0,
  lastCallDate:  cleanDate(row[10] || ""),
  callbackDate:  cleanDate(row[11] || ""),
  salesStatus:   row[12] || "",
  remarks:       row[13] || "",
  lastUpdated:   row[14] || "",
  // defaults
  serialNo:      `LD-${String(idx + 1).padStart(3,"0")}`,
  timeReceived:  "",
  whatsappNumber: row[4] || row[2] || "",
  email:         "",
  gender:        "Not Specified",
  city:          "",
  language:      "Arabic",
  adSource:      "Digital Leads",
  adCampaign:    "",
  adSet:         "",
  product:       "",
  callbackTime:  "",
  callNotes:     row[13] || "",
  sheetLink:     `https://docs.google.com/spreadsheets/d/${SHEET_ID}`,
});

function cleanDate(val) {
  if (!val) return "";
  // Try to parse various date formats
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return val;
}

function mapDisposition(val) {
  const v = (val || "").toLowerCase().trim();
  if (v.includes("convert") || v.includes("sold") || v.includes("success")) return "Converted";
  if (v.includes("interest")) return "Interested";
  if (v.includes("not interest") || v.includes("no interest")) return "Not Interested";
  if (v.includes("callback") || v.includes("call back") || v.includes("follow")) return "Callback";
  if (v.includes("no answer") || v.includes("no pick") || v.includes("busy")) return "No Answer";
  if (v.includes("wrong")) return "Wrong Number";
  if (v.includes("contact")) return "Contacted";
  if (v.includes("drop") || v.includes("cancel")) return "Dropped";
  if (v === "" || v.includes("new") || v.includes("fresh")) return "New";
  return "New";
}

// ── constants ─────────────────────────────────────────────────────────────────
const AD_SOURCES   = ["Digital Leads", "Others"];
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
const PRODUCTS  = ["Product A","Product B","Product C","Service Plan X","Service Plan Y"];
const LANGUAGES = ["Arabic","English","French","Urdu","Hindi","Other"];
const GENDERS   = ["Male","Female","Not Specified"];
const CITIES    = ["Dubai","Abu Dhabi","Sharjah","Riyadh","Jeddah","Cairo","Amman","Kuwait City","Doha","Other"];

const todayStr   = () => new Date().toISOString().split("T")[0];
const isOverdue  = l => l.disposition==="Callback" && l.callbackDate && l.callbackDate < todayStr();
const isDueToday = l => l.disposition==="Callback" && l.callbackDate && l.callbackDate === todayStr();
const getD       = label => DISPOSITIONS.find(d => d.label===label) || DISPOSITIONS[0];

// DB mapping
const fromDb = o => ({
  id: o.id, serialNo: o.serial_no||"", dateReceived: o.date_received||"",
  timeReceived: o.time_received||"", leadName: o.lead_name||"", phone: o.phone||"",
  whatsappNumber: o.whatsapp_number||"", email: o.email||"", gender: o.gender||"Not Specified",
  city: o.city||"", language: o.language||"Arabic", adSource: o.ad_source||"Digital Leads",
  adCampaign: o.ad_campaign||"", adSet: o.ad_set||"", product: o.product||"",
  disposition: o.disposition||"New", callbackDate: o.callback_date||"",
  callbackTime: o.callback_time||"", agent: o.agent||"", callNotes: o.call_notes||"",
  attemptCount: o.attempt_count||0, lastCallDate: o.last_call_date||"", sheetLink: o.sheet_link||"",
  eidNo: o.eid_no||"", leadStatus: o.lead_status||"", callStatus: o.call_status||"",
  salesStatus: o.sales_status||"", remarks: o.remarks||"", lastUpdated: o.last_updated||"",
  sheetRowId: o.sheet_row_id||"",
});

const toDb = o => ({
  serial_no: o.serialNo, date_received: o.dateReceived||null, time_received: o.timeReceived,
  lead_name: o.leadName, phone: o.phone, whatsapp_number: o.whatsappNumber, email: o.email,
  gender: o.gender, city: o.city, language: o.language, ad_source: o.adSource,
  ad_campaign: o.adCampaign, ad_set: o.adSet, product: o.product, disposition: o.disposition,
  callback_date: o.callbackDate||null, callback_time: o.callbackTime, agent: o.agent,
  call_notes: o.callNotes, attempt_count: o.attemptCount, last_call_date: o.lastCallDate||null,
  sheet_link: o.sheetLink, eid_no: o.eidNo, lead_status: o.leadStatus,
  call_status: o.callStatus, sales_status: o.salesStatus, remarks: o.remarks,
  last_updated: o.lastUpdated, sheet_row_id: o.sheetRowId,
});

// ── UI helpers ────────────────────────────────────────────────────────────────
function Badge({ label }) {
  const d = getD(label);
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:d.bg, color:d.color, border:`1px solid ${d.color}33`, borderRadius:20, padding:"2px 9px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{d.icon} {label}</span>;
}
function SrcBadge({ source }) {
  const m = { "Digital Leads":{c:"#6366f1",bg:"#eef2ff",i:"📲"}, "Others":{c:"#64748b",bg:"#f1f5f9",i:"◉"} };
  const s = m[source]||{c:"#64748b",bg:"#f1f5f9",i:"◉"};
  return <span style={{ display:"inline-flex", alignItems:"center", gap:4, background:s.bg, color:s.c, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:800 }}>{s.i} {source}</span>;
}
function Ava({ name, size=30 }) {
  const pal = ["#6366f1","#f59e0b","#10b981","#3b82f6","#ec4899","#8b5cf6"];
  const c = pal[(name||"A").charCodeAt(0)%pal.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:c, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:800, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2)}</div>;
}
function Stat({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background:"#fff", borderRadius:13, padding:"16px 18px", flex:1, minWidth:120, border:"1px solid #e9ecf3", position:"relative", overflow:"hidden" }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:accent }}/>
      <div style={{ fontSize:18, marginBottom:5 }}>{icon}</div>
      <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, letterSpacing:.5 }}>{label}</div>
      <div style={{ fontSize:22, fontWeight:900, color:"#0f172a", fontFamily:"'Sora',sans-serif", lineHeight:1.1 }}>{value}</div>
      {sub&&<div style={{ fontSize:11, color:"#64748b", marginTop:2 }}>{sub}</div>}
    </div>
  );
}
function Modal({ show, onClose, width=640, children }) {
  useEffect(()=>{ document.body.style.overflow=show?"hidden":""; return()=>{document.body.style.overflow="";} },[show]);
  if(!show) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed", inset:0, background:"rgba(2,8,23,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(3px)" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:width, maxHeight:"93vh", overflowY:"auto", boxShadow:"0 32px 96px rgba(0,0,0,.22)", animation:"mIn .22s cubic-bezier(.34,1.56,.64,1)" }}>
        {children}
      </div>
    </div>
  );
}
function Toast({ msg, type }) {
  if(!msg) return null;
  return <div style={{ position:"fixed", bottom:24, right:24, background:type==="error"?"#ef4444":"#10b981", color:"#fff", borderRadius:10, padding:"12px 20px", fontWeight:700, fontSize:14, zIndex:9999, boxShadow:"0 8px 24px rgba(0,0,0,.2)", animation:"mIn .2s ease" }}>{msg}</div>;
}

// ── SYNC STATUS BANNER ────────────────────────────────────────────────────────
function SyncBanner({ lastSync, syncing, newCount, onManualSync }) {
  const fmt = d => d ? new Date(d).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}) : "Never";
  return (
    <div style={{ background: syncing ? "#eff6ff" : newCount > 0 ? "#ecfdf5" : "#f8f9ff", border: `1px solid ${syncing?"#bfdbfe":newCount>0?"#bbf7d0":"#e9ecf3"}`, borderRadius:10, padding:"10px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:8 }}>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div style={{ width:8, height:8, borderRadius:"50%", background: syncing?"#3b82f6":newCount>0?"#10b981":"#94a3b8", animation: syncing?"pulse 1s infinite":"none" }}/>
        <span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>
          {syncing ? "⏳ Syncing from Google Sheet…" : newCount > 0 ? `✅ ${newCount} new leads imported from Google Sheet` : "📊 Google Sheet sync active"}
        </span>
        {!syncing && <span style={{ fontSize:11, color:"#94a3b8" }}>Last sync: {fmt(lastSync)} · Auto-syncs every 5 min</span>}
      </div>
      <button onClick={onManualSync} disabled={syncing} style={{ padding:"5px 14px", borderRadius:7, border:"1.5px solid #6366f1", background:"#fff", color:"#6366f1", cursor:syncing?"not-allowed":"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit", opacity:syncing?0.6:1 }}>
        {syncing ? "Syncing…" : "🔄 Sync Now"}
      </button>
    </div>
  );
}

// ── LOGIN SCREEN ──────────────────────────────────────────────────────────────
function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const handleLogin = async () => {
    setLoading(true); setError("");
    const { error } = await supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: window.location.origin } });
    if(error) { setError(error.message); setLoading(false); }
  };
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      <div style={{ background:"#fff", borderRadius:24, padding:"48px 40px", width:"100%", maxWidth:420, textAlign:"center", boxShadow:"0 32px 96px rgba(0,0,0,.4)" }}>
        <div style={{ width:64, height:64, background:"linear-gradient(135deg,#6366f1,#3b82f6)", borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px" }}>📲</div>
        <div style={{ fontWeight:900, fontSize:28, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:6 }}>LeadFlow</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:32 }}>Telesales CRM — Sign in to continue</div>
        {error&&<div style={{ background:"#fef2f2", color:"#dc2626", borderRadius:8, padding:"10px 14px", marginBottom:16, fontSize:13, fontWeight:600 }}>⚠️ {error}</div>}
        <button onClick={handleLogin} disabled={loading} style={{ width:"100%", padding:"14px 20px", borderRadius:12, border:"1.5px solid #e2e8f0", background:"#fff", cursor:loading?"not-allowed":"pointer", fontWeight:700, fontSize:15, color:"#0f172a", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:12, boxShadow:"0 2px 8px rgba(0,0,0,.08)", opacity:loading?0.7:1 }}>
          {loading
            ? <div style={{ width:20, height:20, border:"3px solid #e2e8f0", borderTop:"3px solid #6366f1", borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
            : <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
          }
          {loading ? "Redirecting to Google…" : "Sign in with Google"}
        </button>
        <div style={{ marginTop:20, fontSize:12, color:"#94a3b8" }}>Use your Gmail to access LeadFlow.<br/>Contact your admin if you need access.</div>
      </div>
    </div>
  );
}

// ── LEAD FORM ─────────────────────────────────────────────────────────────────
function LeadForm({ initial, onSave, onCancel, title, saving, agentName, isAdmin, agents }) {
  const [f,setF] = useState(initial);
  const s=(k,v)=>setF(x=>({...x,[k]:v}));
  const inp={width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fafbfc",boxSizing:"border-box",color:"#0f172a"};
  const F=({label,span,children})=>(<div style={{ gridColumn:span||"auto" }}><label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:3, letterSpacing:.4 }}>{label}</label>{children}</div>);
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
        <F label="EID No"><input value={f.eidNo||""} onChange={e=>s("eidNo",e.target.value)} style={inp} placeholder="Emirates ID"/></F>
      </div>

      <div style={{ fontSize:10, fontWeight:800, color:"#10b981", letterSpacing:1, marginBottom:10 }}>👤 CONTACT DETAILS</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
        <F label="Customer Name *" span="1/-1"><input value={f.leadName} onChange={e=>s("leadName",e.target.value)} style={inp} placeholder="Full name"/></F>
        <F label="Phone Number"><input value={f.phone} onChange={e=>s("phone",e.target.value)} style={inp} placeholder="+971501234567"/></F>
        <F label="WhatsApp Number"><input value={f.whatsappNumber} onChange={e=>s("whatsappNumber",e.target.value)} style={inp} placeholder="+971501234567"/></F>
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
        <F label="Assigned Agent">{isAdmin?<select value={f.agent} onChange={e=>s("agent",e.target.value)} style={{...inp,cursor:"pointer"}}><option value="">Select agent…</option>{(agents||[]).filter(a=>a.role!=="admin").map(a=><option key={a.id} value={a.full_name}>{a.full_name}</option>)}</select>:<input value={agentName} disabled style={{...inp,background:"#f1f5f9",color:"#64748b"}}/>}</F>
        <F label="Call Attempts"><input type="number" min="0" value={f.attemptCount} onChange={e=>s("attemptCount",Number(e.target.value))} style={inp}/></F>
        <F label="Disposition"><select value={f.disposition} onChange={e=>s("disposition",e.target.value)} style={{...inp,cursor:"pointer"}}>{DISPOSITIONS.map(d=><option key={d.label}>{d.label}</option>)}</select></F>
        <F label="Lead Status"><input value={f.leadStatus||""} onChange={e=>s("leadStatus",e.target.value)} style={inp} placeholder="e.g. Hot"/></F>
        <F label="Sales Status"><input value={f.salesStatus||""} onChange={e=>s("salesStatus",e.target.value)} style={inp} placeholder="e.g. Pending"/></F>
        <F label="Last Call Date"><input type="date" value={f.lastCallDate} onChange={e=>s("lastCallDate",e.target.value)} style={inp}/></F>
        <F label="Follow-up Date"><input type="date" value={f.callbackDate} onChange={e=>s("callbackDate",e.target.value)} style={inp}/></F>
        <F label="Google Sheet Link"><input value={f.sheetLink} onChange={e=>s("sheetLink",e.target.value)} style={inp} placeholder="https://docs.google.com/…"/></F>
      </div>

      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:3, letterSpacing:.4 }}>Remarks / Call Notes</label>
        <textarea value={f.callNotes} onChange={e=>s("callNotes",e.target.value)} rows={3} style={{...inp,resize:"vertical"}} placeholder="Notes from the call…"/>
      </div>

      <div style={{ display:"flex", gap:10, marginTop:20, justifyContent:"flex-end" }}>
        <button onClick={onCancel} style={{ padding:"9px 18px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, color:"#64748b", fontFamily:"inherit" }}>Cancel</button>
        <button onClick={()=>f.leadName&&onSave({...f,agent:isAdmin?f.agent:agentName})} disabled={saving}
          style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", fontFamily:"inherit", opacity:saving?0.7:1 }}>
          {saving?"Saving…":"Save Lead"}
        </button>
      </div>
    </div>
  );
}

// ── DISPOSITION PANEL ─────────────────────────────────────────────────────────
function DispPanel({ lead, onUpdate, onClose, saving }) {
  const [disp,setDisp]=useState(lead.disposition);
  const [notes,setNotes]=useState(lead.callNotes);
  const [cbDate,setCbDate]=useState(lead.callbackDate);
  const [cbTime,setCbTime]=useState(lead.callbackTime);
  const [tries,setTries]=useState(lead.attemptCount);
  const needCb=disp==="Callback"||disp==="No Answer";
  const inp={width:"100%",border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",outline:"none",background:"#fff",boxSizing:"border-box"};
  return (
    <div style={{ padding:24 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div><div style={{ fontWeight:900, fontSize:17, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>Update Disposition</div><div style={{ fontSize:13, color:"#64748b" }}>{lead.leadName} · {lead.phone}</div></div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
      </div>
      <div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:8 }}>SELECT DISPOSITION</div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:7, marginBottom:16 }}>
        {DISPOSITIONS.map(d=>(
          <button key={d.label} onClick={()=>setDisp(d.label)} style={{ padding:"8px 5px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit", border:disp===d.label?`2px solid ${d.color}`:"1.5px solid #e2e8f0", background:disp===d.label?d.bg:"#fafbfc", color:disp===d.label?d.color:"#64748b" }}>
            {d.icon} {d.label}
          </button>
        ))}
      </div>
      {needCb&&(<div style={{ background:"#eff6ff", border:"1.5px solid #3b82f6", borderRadius:10, padding:"12px 14px", marginBottom:14 }}>
        <div style={{ fontSize:10, fontWeight:700, color:"#3b82f6", marginBottom:10 }}>🔁 SCHEDULE FOLLOW-UP</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          <div><div style={{ fontSize:11, color:"#64748b", marginBottom:3 }}>Date</div><input type="date" value={cbDate} onChange={e=>setCbDate(e.target.value)} style={inp}/></div>
          <div><div style={{ fontSize:11, color:"#64748b", marginBottom:3 }}>Time</div><input type="time" value={cbTime} onChange={e=>setCbTime(e.target.value)} style={inp}/></div>
        </div>
      </div>)}
      <div style={{ marginBottom:14 }}><div style={{ fontSize:10, fontWeight:700, color:"#64748b", marginBottom:6 }}>CALL NOTES / REMARKS</div><textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} style={{...inp,resize:"vertical"}} placeholder="What happened on this call?"/></div>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b" }}>CALL ATTEMPTS</div>
        <button onClick={()=>setTries(Math.max(0,tries-1))} style={{ width:28, height:28, borderRadius:6, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"inherit" }}>−</button>
        <span style={{ fontWeight:800, fontSize:16, minWidth:24, textAlign:"center" }}>{tries}</span>
        <button onClick={()=>setTries(tries+1)} style={{ width:28, height:28, borderRadius:6, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:800, fontSize:14, fontFamily:"inherit" }}>+</button>
      </div>
      <button onClick={()=>onUpdate({disposition:disp,callNotes:notes,callbackDate:cbDate,callbackTime:cbTime,attemptCount:tries,lastCallDate:todayStr()})} disabled={saving}
        style={{ width:"100%", padding:12, borderRadius:10, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", cursor:"pointer", fontWeight:800, fontSize:14, color:"#fff", fontFamily:"inherit", opacity:saving?0.7:1 }}>
        {saving?"Saving…":"Save Update"}
      </button>
    </div>
  );
}

// ── CALLBACKS PANEL ───────────────────────────────────────────────────────────
function CallbacksPanel({ leads, onSelect }) {
  const overdue=leads.filter(isOverdue),dueToday=leads.filter(isDueToday);
  const upcoming=leads.filter(l=>l.disposition==="Callback"&&l.callbackDate&&l.callbackDate>todayStr());
  const Row=({lead,tag,tagColor})=>(
    <div onClick={()=>onSelect(lead)} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 14px", borderRadius:10, background:"#fff", border:"1px solid #e9ecf3", marginBottom:8, cursor:"pointer" }}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,.08)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
      <Ava name={lead.leadName} size={36}/>
      <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:14, color:"#0f172a" }}>{lead.leadName}</div><div style={{ fontSize:12, color:"#64748b" }}>{lead.phone} · {lead.agent}</div></div>
      <div style={{ textAlign:"right" }}><div style={{ fontSize:12, fontWeight:700, color:tagColor, background:tagColor+"18", borderRadius:6, padding:"2px 8px", marginBottom:2 }}>{tag}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{lead.callbackDate} {lead.callbackTime}</div></div>
    </div>
  );
  const Section=({title,items,tag,tagColor})=>items.length?(<div style={{ marginBottom:20 }}><div style={{ fontSize:12, fontWeight:800, color:tagColor, marginBottom:10 }}>{title} ({items.length})</div>{items.map(l=><Row key={l.id} lead={l} tag={tag} tagColor={tagColor}/>)}</div>):null;
  return overdue.length+dueToday.length+upcoming.length===0?(
    <div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}><div style={{ fontSize:36, marginBottom:8 }}>✅</div><div style={{ fontWeight:600 }}>No follow-ups scheduled</div></div>
  ):(<><Section title="🚨 OVERDUE" items={overdue} tag="Overdue" tagColor="#ef4444"/><Section title="⏰ DUE TODAY" items={dueToday} tag="Today" tagColor="#f59e0b"/><Section title="📅 UPCOMING" items={upcoming} tag="Scheduled" tagColor="#3b82f6"/></>);
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser]           = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [agents,setAgents]       = useState([]);
  const [leads,setLeads]         = useState([]);
  const [loading,setLoading]     = useState(false);
  const [saving,setSaving]       = useState(false);
  const [syncing,setSyncing]     = useState(false);
  const [lastSync,setLastSync]   = useState(null);
  const [newCount,setNewCount]   = useState(0);
  const [toast,setToast]         = useState(null);
  const [tab,setTab]             = useState("leads");
  const [search,setSearch]       = useState("");
  const [fDisp,setFDisp]         = useState("All");
  const [fSrc,setFSrc]           = useState("All");
  const [fAgent,setFAgent]       = useState("All");
  const [sortBy,setSortBy]       = useState("dateReceived");
  const [showAdd,setShowAdd]     = useState(false);
  const [showWaAdd,setShowWaAdd] = useState(false);
  const [showAgents,setShowAgents] = useState(false);
  const [waPhone,setWaPhone]     = useState("");
  const [editLead,setEditLead]   = useState(null);
  const [dispLead,setDispLead]   = useState(null);
  const [detail,setDetail]       = useState(null);
  const [delLead,setDelLead]     = useState(null);

  const isAdmin    = user?.email===ADMIN_EMAIL;
  const agentName  = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Agent";
  const agentPhoto = user?.user_metadata?.avatar_url;

  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  // Auth
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setUser(session?.user||null); setAuthLoading(false); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{ setUser(session?.user||null); setAuthLoading(false); });
    return()=>subscription.unsubscribe();
  },[]);

  // Auto-register agent + load agents list
  useEffect(()=>{
    if(!user) return;
    // Auto-register this user as agent if not already in agents table
    supabase.from("agents").upsert({
      id: user.id,
      email: user.email,
      full_name: user?.user_metadata?.full_name || user.email.split("@")[0],
      avatar_url: user?.user_metadata?.avatar_url || "",
      role: user.email===ADMIN_EMAIL ? "admin" : "agent",
      is_active: true,
    }, { onConflict: "id" });
    // Load all agents (for admin dropdown)
    supabase.from("agents").select("*").eq("is_active",true).order("full_name")
      .then(({data})=>setAgents(data||[]));
  },[user]);

  // Load leads
  useEffect(()=>{
    if(!user) return;
    setLoading(true);
    const q=isAdmin?supabase.from("leads").select("*").order("created_at",{ascending:false}):supabase.from("leads").select("*").eq("agent",agentName).order("created_at",{ascending:false});
    q.then(({data,error})=>{ if(error) showToast("Failed to load leads","error"); else setLeads((data||[]).map(fromDb)); setLoading(false); });
  },[user]);

  // ── Google Sheet sync ─────────────────────────────────────────────────────
  const syncFromSheet = useCallback(async () => {
    if(syncing) return;
    setSyncing(true);
    setNewCount(0);
    try {
      const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;
      const res = await fetch(csvUrl);
      if(!res.ok) throw new Error("Failed to fetch sheet");
      const text = await res.text();

      // Parse CSV
      const rows = text.trim().split("\n").map(row => {
        const cols = [];
        let cur = "", inQ = false;
        for(let i=0; i<row.length; i++) {
          if(row[i]==='"') { inQ=!inQ; continue; }
          if(row[i]==="," && !inQ) { cols.push(cur.trim()); cur=""; continue; }
          cur+=row[i];
        }
        cols.push(cur.trim());
        return cols;
      });

      // Skip header row (row 0)
      const dataRows = rows.slice(1).filter(r => r[1] && r[1].trim() !== "");
      let imported = 0;

      for(let i=0; i<dataRows.length; i++) {
        const parsed = parseSheetRow(dataRows[i], i);
        if(!parsed.leadName) continue;

        // Check if this row already exists by sheetRowId
        const {data:existing} = await supabase.from("leads").select("id,disposition,callNotes").eq("sheet_row_id", parsed.sheetRowId).single();

        if(!existing) {
          // New lead — insert
          const {error} = await supabase.from("leads").insert(toDb(parsed));
          if(!error) imported++;
        }
        // If exists — don't overwrite (agent may have updated disposition/notes)
      }

      // Refresh leads list
      const q=isAdmin?supabase.from("leads").select("*").order("created_at",{ascending:false}):supabase.from("leads").select("*").eq("agent",agentName).order("created_at",{ascending:false});
      const {data}=await q;
      setLeads((data||[]).map(fromDb));
      setLastSync(new Date());
      setNewCount(imported);
      if(imported>0) showToast(`✅ ${imported} new lead${imported>1?"s":""} imported from Google Sheet!`);
    } catch(e) {
      showToast("⚠️ Sheet sync failed — check sheet is public","error");
    }
    setSyncing(false);
  },[syncing, isAdmin, agentName]);

  // Auto sync every 5 minutes
  useEffect(()=>{
    if(!user) return;
    syncFromSheet(); // initial sync on login
    const interval = setInterval(syncFromSheet, SYNC_INTERVAL);
    return()=>clearInterval(interval);
  },[user]);

  const urgentCbs=useMemo(()=>leads.filter(l=>isOverdue(l)||isDueToday(l)).length,[leads]);
  const allAgents=useMemo(()=>[...new Set(leads.map(l=>l.agent).filter(Boolean))],[leads]);

  const filtered=useMemo(()=>leads.filter(l=>{
    const q=search.toLowerCase();
    return (!q||l.leadName.toLowerCase().includes(q)||l.phone.includes(q)||l.adCampaign?.toLowerCase().includes(q)||l.eidNo?.includes(q))
      &&(fDisp==="All"||l.disposition===fDisp)
      &&(fSrc==="All"||l.adSource===fSrc)
      &&(fAgent==="All"||l.agent===fAgent);
  }).sort((a,b)=>sortBy==="leadName"?a.leadName.localeCompare(b.leadName):sortBy==="attempts"?b.attemptCount-a.attemptCount:(b.dateReceived+b.timeReceived).localeCompare(a.dateReceived+a.timeReceived)),[leads,search,fDisp,fSrc,fAgent,sortBy]);

  const add=async form=>{ setSaving(true); const {data,error}=await supabase.from("leads").insert(toDb(form)).select().single(); if(error) showToast("Failed to add","error"); else { setLeads(ls=>[fromDb(data),...ls]); setShowAdd(false); showToast("✅ Lead added!"); } setSaving(false); };
  const upd=async(id,patch)=>{ setSaving(true); const {data,error}=await supabase.from("leads").update(toDb(patch)).eq("id",id).select().single(); if(error) showToast("Failed to update","error"); else { const u=fromDb(data); setLeads(ls=>ls.map(l=>l.id===id?u:l)); if(detail?.id===id) setDetail(u); setDispLead(null); setEditLead(null); showToast("✅ Updated!"); } setSaving(false); };
  const del=async id=>{ setSaving(true); const {error}=await supabase.from("leads").delete().eq("id",id); if(error) showToast("Failed to delete","error"); else { setLeads(ls=>ls.filter(l=>l.id!==id)); setDelLead(null); setDetail(null); showToast("🗑️ Deleted"); } setSaving(false); };
  const signOut=async()=>{ await supabase.auth.signOut(); setUser(null); setLeads([]); };

  if(authLoading) return (<div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f8" }}><div style={{ textAlign:"center" }}><div style={{ width:44, height:44, border:"4px solid #e2e8f0", borderTop:"4px solid #6366f1", borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/><div style={{ color:"#64748b", fontWeight:600, fontFamily:"sans-serif" }}>Loading…</div></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>);
  if(!user) return <LoginScreen/>;

  const total=leads.length,conv=leads.filter(l=>l.disposition==="Converted").length;
  const intr=leads.filter(l=>l.disposition==="Interested").length,cbs=leads.filter(l=>l.disposition==="Callback").length;
  const digital=leads.filter(l=>l.adSource==="Digital Leads").length;
  const others=leads.filter(l=>l.adSource==="Others").length;
  const inp={border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none",cursor:"pointer",color:"#0f172a"};
  const navB=(id,lbl,badge)=>(<button onClick={()=>setTab(id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", background:tab===id?"#fff":"transparent", color:tab===id?"#0f172a":"#94a3b8", boxShadow:tab===id?"0 1px 4px rgba(0,0,0,.1)":"none", display:"flex", alignItems:"center", gap:5 }}>{lbl}{badge>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:900 }}>{badge}</span>}</button>);
  const EMPTY={serialNo:"",dateReceived:todayStr(),timeReceived:"",leadName:"",phone:"",whatsappNumber:"",email:"",gender:"Not Specified",city:"",language:"Arabic",adSource:"Digital Leads",adCampaign:"",adSet:"",product:"",disposition:"New",callbackDate:"",callbackTime:"",agent:agentName,callNotes:"",attemptCount:0,lastCallDate:"",sheetLink:"",eidNo:"",leadStatus:"",callStatus:"",salesStatus:"",remarks:""};

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f0f2f8", minHeight:"100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap');
        *{box-sizing:border-box} ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        @keyframes mIn{from{transform:scale(.94) translateY(12px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}} @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        input:focus,select:focus,textarea:focus{border-color:#6366f1!important;box-shadow:0 0 0 3px rgba(99,102,241,.1)}
        tbody tr:hover td{background:#f8f9ff!important}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"#fff", borderBottom:"1px solid #e9ecf3", padding:"0 22px" }}>
        <div style={{ maxWidth:1500, margin:"0 auto", display:"flex", alignItems:"center", justifyContent:"space-between", height:56 }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, background:"linear-gradient(135deg,#6366f1,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>📲</div>
            <div><div style={{ fontWeight:900, fontSize:16, color:"#0f172a", fontFamily:"'Sora',sans-serif", lineHeight:1.1 }}>LeadFlow</div><div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, letterSpacing:.4 }}>{isAdmin?"ADMIN":"TELESALES AGENT"}</div></div>
          </div>
          <div style={{ display:"flex", gap:3, background:"#f0f2f8", borderRadius:10, padding:3 }}>
            {navB("leads","📋 Leads")}{navB("callbacks","🔁 Follow-ups",urgentCbs)}{navB("analytics","📊 Analytics")}{isAdmin&&navB("agents","👥 Agents")}
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            {isAdmin&&<span style={{ background:"#fef3c7", color:"#92400e", borderRadius:8, padding:"3px 10px", fontSize:11, fontWeight:800 }}>👑 Admin</span>}
            {isAdmin&&<button onClick={()=>setShowWaAdd(true)} style={{ padding:"8px 14px", borderRadius:9, border:"none", background:"#25d366", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:6 }}>💬 WhatsApp Lead</button>}
            {isAdmin&&<button onClick={()=>setShowAdd(true)} style={{ padding:"8px 16px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"#fff", fontWeight:800, fontSize:13, cursor:"pointer", fontFamily:"inherit" }}>+ Add Lead</button>}
            <div style={{ display:"flex", alignItems:"center", gap:8, borderLeft:"1px solid #e9ecf3", paddingLeft:12 }}>
              {agentPhoto?<img src={agentPhoto} alt="" style={{ width:32, height:32, borderRadius:"50%", objectFit:"cover" }}/>:<Ava name={agentName} size={32}/>}
              <div><div style={{ fontSize:12, fontWeight:700, color:"#0f172a", lineHeight:1.2 }}>{agentName}</div><div style={{ fontSize:10, color:"#94a3b8" }}>{user.email}</div></div>
              <button onClick={signOut} style={{ padding:"5px 10px", borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontSize:11, fontWeight:700, color:"#64748b", fontFamily:"inherit" }}>Sign Out</button>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth:1500, margin:"0 auto", padding:"20px 22px" }}>

        {/* Sync Banner */}
        <SyncBanner lastSync={lastSync} syncing={syncing} newCount={newCount} onManualSync={syncFromSheet}/>

        {/* Role banner */}
        {!isAdmin&&<div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13 }}>👤 <span style={{ fontWeight:600, color:"#1e40af" }}>Showing leads assigned to <strong>{agentName}</strong></span></div>}
        {isAdmin&&<div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13 }}>👑 <span style={{ fontWeight:600, color:"#92400e" }}>Admin view — ALL leads from all agents ({total} total)</span></div>}

        {/* STATS */}
        <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
          <Stat icon="👥" label="TOTAL LEADS" value={loading?"…":total} sub={`${filtered.length} shown`} accent="#6366f1"/>
          <Stat icon="✅" label="INTERESTED" value={loading?"…":intr} sub="hot prospects" accent="#10b981"/>
          <Stat icon="🏆" label="CONVERTED" value={loading?"…":conv} sub={`${total?((conv/total)*100).toFixed(0):0}% rate`} accent="#059669"/>
          <Stat icon="🔁" label="FOLLOW-UPS" value={loading?"…":cbs} sub={`${urgentCbs} urgent`} accent="#3b82f6"/>
          <Stat icon="📲" label="DIGITAL LEADS" value={loading?"…":digital} sub="from ads" accent="#6366f1"/>
          <Stat icon="◉" label="OTHERS" value={loading?"…":others} sub="other sources" accent="#64748b"/>
        </div>

        {loading&&<div style={{ textAlign:"center", padding:60 }}><div style={{ width:40, height:40, border:"4px solid #e2e8f0", borderTop:"4px solid #6366f1", borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/><div style={{ color:"#64748b", fontWeight:600 }}>Loading leads…</div></div>}

        {/* LEADS TAB */}
        {!loading&&tab==="leads"&&(
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search name, phone, EID, campaign…" style={{...inp,flex:1,minWidth:200,cursor:"text"}}/>
              <select value={fDisp} onChange={e=>setFDisp(e.target.value)} style={inp}><option value="All">All Dispositions</option>{DISPOSITIONS.map(d=><option key={d.label}>{d.label}</option>)}</select>
              <select value={fSrc} onChange={e=>setFSrc(e.target.value)} style={inp}><option value="All">All Sources</option>{AD_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
              {isAdmin&&<select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={inp}><option value="All">All Agents</option>{allAgents.map(a=><option key={a}>{a}</option>)}</select>}
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={inp}><option value="dateReceived">Newest First</option><option value="leadName">Name A–Z</option><option value="attempts">Most Attempts</option></select>
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#f8f9ff", borderBottom:"1.5px solid #e9ecf3" }}>
                  {["#","Date","Customer Name","Phone / WhatsApp","EID","Source","Disposition","Lead Status","Sales Status","Agent","Attempts","Follow-up","Actions"].map(h=>(
                    <th key={h} style={{ padding:"11px 12px", textAlign:"left", fontSize:10, fontWeight:800, color:"#6366f1", letterSpacing:.5, whiteSpace:"nowrap" }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {filtered.map(l=>{
                    const ov=isOverdue(l),dt=isDueToday(l);
                    return (<tr key={l.id} style={{ borderBottom:"1px solid #f1f5f9", background:ov?"#fff5f5":dt?"#fffbeb":"#fff" }}>
                      <td style={{ padding:"10px 12px", color:"#94a3b8", fontSize:11, fontWeight:700 }}>{l.serialNo||`LD-${l.id}`}</td>
                      <td style={{ padding:"10px 12px", whiteSpace:"nowrap", fontSize:12, color:"#0f172a", fontWeight:600 }}>{l.dateReceived||"—"}</td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <Ava name={l.leadName} size={28}/>
                          <div><div style={{ fontWeight:700, color:"#0f172a", cursor:"pointer", textDecoration:"underline dotted" }} onClick={()=>setDetail(l)}>{l.leadName}</div><div style={{ fontSize:11, color:"#94a3b8" }}>{l.city}</div></div>
                        </div>
                      </td>
                      <td style={{ padding:"10px 12px", whiteSpace:"nowrap" }}>
                        <div style={{ fontWeight:600, fontSize:12 }}>{l.phone}</div>
                        <a href={`https://wa.me/${(l.whatsappNumber||l.phone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:3, marginTop:3, background:"#25d366", color:"#fff", borderRadius:5, padding:"2px 7px", fontSize:10, fontWeight:800, textDecoration:"none" }}>W Chat</a>
                      </td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:"#64748b" }}>{l.eidNo||"—"}</td>
                      <td style={{ padding:"10px 12px" }}><SrcBadge source={l.adSource}/></td>
                      <td style={{ padding:"10px 12px" }}><Badge label={l.disposition}/></td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:"#475569" }}>{l.leadStatus||"—"}</td>
                      <td style={{ padding:"10px 12px", fontSize:12, color:"#475569" }}>{l.salesStatus||"—"}</td>
                      <td style={{ padding:"10px 12px" }}><div style={{ display:"flex", alignItems:"center", gap:6 }}><Ava name={l.agent||"?"} size={22}/><span style={{ fontSize:12, color:"#475569" }}>{l.agent}</span></div></td>
                      <td style={{ padding:"10px 12px", textAlign:"center" }}><span style={{ fontWeight:800, fontSize:14, color:l.attemptCount>=4?"#ef4444":l.attemptCount>=2?"#f59e0b":"#0f172a" }}>{l.attemptCount}</span></td>
                      <td style={{ padding:"10px 12px", whiteSpace:"nowrap" }}>
                        {l.callbackDate?(<div style={{ fontSize:11 }}><div style={{ fontWeight:700, color:ov?"#ef4444":dt?"#f59e0b":"#3b82f6" }}>{ov?"🚨 Overdue":dt?"⏰ Today":"📅 "+l.callbackDate}</div></div>):<span style={{ color:"#cbd5e1", fontSize:11 }}>—</span>}
                      </td>
                      <td style={{ padding:"10px 12px" }}>
                        <div style={{ display:"flex", gap:4 }}>
                          <button onClick={()=>setDispLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#eef2ff", color:"#6366f1", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Update</button>
                          {isAdmin&&<button onClick={()=>setEditLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#f1f5f9", color:"#475569", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Edit</button>}
                          {isAdmin&&<button onClick={()=>setDelLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#fef2f2", color:"#ef4444", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Del</button>}
                        </div>
                      </td>
                    </tr>);
                  })}
                  {filtered.length===0&&<tr><td colSpan={13} style={{ padding:44, textAlign:"center", color:"#94a3b8", fontStyle:"italic" }}>{leads.length===0?"No leads yet — syncing from Google Sheet…":"No leads match your filters"}</td></tr>}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop:8, fontSize:12, color:"#94a3b8", textAlign:"right" }}>Showing {filtered.length} of {total} leads</div>
          </>
        )}

        {/* CALLBACKS TAB */}
        {!loading&&tab==="callbacks"&&(
          <div style={{ maxWidth:680 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:18 }}>🔁 Follow-up Schedule</div>
            <CallbacksPanel leads={leads} onSelect={l=>setDispLead(l)}/>
          </div>
        )}

        {/* ANALYTICS TAB */}
        {!loading&&tab==="analytics"&&(
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Call Outcome Breakdown</div>
              {DISPOSITIONS.map(d=>{ const n=leads.filter(l=>l.disposition===d.label).length,p=total?(n/total)*100:0; return n>0?(<div key={d.label} style={{ marginBottom:11 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}><span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>{d.icon} {d.label}</span><div style={{ display:"flex", gap:10 }}><span style={{ fontSize:12, color:"#94a3b8" }}>{n}</span><span style={{ fontSize:12, fontWeight:800, color:d.color }}>{p.toFixed(0)}%</span></div></div><div style={{ background:"#f1f5f9", borderRadius:6, height:7, overflow:"hidden" }}><div style={{ height:"100%", width:`${p}%`, background:d.color, borderRadius:6 }}/></div></div>):null; })}
            </div>
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>Leads by Source</div>
              {[{src:"Digital Leads",n:digital,c:"#6366f1"},{src:"Others",n:others,c:"#64748b"}].map(({src,n,c})=>{ const p=total?(n/total)*100:0; return (<div key={src} style={{ marginBottom:18 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}><span style={{ fontSize:13, fontWeight:700 }}>{src}</span><span style={{ fontSize:13, fontWeight:800, color:c }}>{n} ({p.toFixed(0)}%)</span></div><div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden" }}><div style={{ height:"100%", width:`${p}%`, background:c, borderRadius:8 }}/></div></div>); })}
            </div>
            {isAdmin&&(
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22, gridColumn:"1/-1" }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>👑 Agent Performance</div>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                  <thead><tr style={{ borderBottom:"1px solid #f1f5f9" }}>{["Agent","Total Leads","Converted","Interested","No Answer","Conv Rate"].map(h=><th key={h} style={{ padding:"5px 10px", textAlign:"left", fontSize:10, fontWeight:800, color:"#94a3b8" }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {allAgents.map(a=>{ const al=leads.filter(l=>l.agent===a),ac=al.filter(l=>l.disposition==="Converted").length,ai=al.filter(l=>l.disposition==="Interested").length,na=al.filter(l=>l.disposition==="No Answer").length,r=((ac/al.length)*100).toFixed(0); return (<tr key={a} style={{ borderBottom:"1px solid #f8f9fc" }}><td style={{ padding:"10px 10px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Ava name={a} size={26}/><span style={{ fontWeight:700 }}>{a}</span></div></td><td style={{ padding:"10px 10px", color:"#475569" }}>{al.length}</td><td style={{ padding:"10px 10px" }}><span style={{ background:"#d1fae5", color:"#059669", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{ac}</span></td><td style={{ padding:"10px 10px" }}><span style={{ background:"#ecfdf5", color:"#10b981", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{ai}</span></td><td style={{ padding:"10px 10px" }}><span style={{ background:"#f5f3ff", color:"#8b5cf6", borderRadius:20, padding:"1px 8px", fontSize:11, fontWeight:800 }}>{na}</span></td><td style={{ padding:"10px 10px", fontWeight:900, color:Number(r)>=20?"#059669":"#0f172a" }}>{r}%</td></tr>); })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* AGENTS TAB */}
        {!loading&&tab==="agents"&&isAdmin&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>👥 Agent Management</div>
              <div style={{ fontSize:13, color:"#64748b" }}>Agents auto-register when they first sign in with Gmail</div>
            </div>

            {/* Agent cards */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14, marginBottom:24 }}>
              {agents.filter(a=>a.role!=="admin").map(a=>{
                const aLeads = leads.filter(l=>l.agent===a.full_name);
                const aConv  = aLeads.filter(l=>l.disposition==="Converted").length;
                const aIntr  = aLeads.filter(l=>l.disposition==="Interested").length;
                const aCb    = aLeads.filter(l=>l.disposition==="Callback"&&l.callbackDate).length;
                return (
                  <div key={a.id} style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:20, position:"relative" }}>
                    {/* Active indicator */}
                    <div style={{ position:"absolute", top:16, right:16, width:8, height:8, borderRadius:"50%", background:a.is_active?"#10b981":"#ef4444" }}/>
                    <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:16 }}>
                      {a.avatar_url
                        ? <img src={a.avatar_url} alt="" style={{ width:44, height:44, borderRadius:"50%", objectFit:"cover" }}/>
                        : <Ava name={a.full_name||"?"} size={44}/>
                      }
                      <div>
                        <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{a.full_name}</div>
                        <div style={{ fontSize:12, color:"#64748b" }}>{a.email}</div>
                        <div style={{ fontSize:10, background:"#eef2ff", color:"#6366f1", borderRadius:6, padding:"1px 7px", display:"inline-block", fontWeight:700, marginTop:3 }}>Agent</div>
                      </div>
                    </div>
                    {/* Stats */}
                    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr 1fr", gap:8, marginBottom:14 }}>
                      {[["Total",aLeads.length,"#6366f1"],["Converted",aConv,"#059669"],["Interested",aIntr,"#10b981"],["Follow-ups",aCb,"#3b82f6"]].map(([lbl,val,c])=>(
                        <div key={lbl} style={{ background:"#f8f9ff", borderRadius:8, padding:"8px 6px", textAlign:"center" }}>
                          <div style={{ fontSize:18, fontWeight:900, color:c, fontFamily:"'Sora',sans-serif" }}>{val}</div>
                          <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700, letterSpacing:.3 }}>{lbl.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    {/* Assign leads today */}
                    <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:12 }}>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:8, fontWeight:600 }}>📋 Unassigned leads today: <strong style={{ color:"#6366f1" }}>{leads.filter(l=>!l.agent&&l.dateReceived===todayStr()).length}</strong></div>
                      <button onClick={async()=>{
                        // Assign all today's unassigned leads to this agent
                        const unassigned = leads.filter(l=>(!l.agent||l.agent==="")&&l.dateReceived===todayStr());
                        if(unassigned.length===0){ showToast("No unassigned leads for today","error"); return; }
                        for(const lead of unassigned){
                          await supabase.from("leads").update({agent:a.full_name}).eq("id",lead.id);
                        }
                        setLeads(ls=>ls.map(l=>(!l.agent||l.agent==="")&&l.dateReceived===todayStr()?{...l,agent:a.full_name}:l));
                        showToast(`✅ ${unassigned.length} leads assigned to ${a.full_name}!`);
                      }} style={{ width:"100%", padding:"8px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#6366f1,#3b82f6)", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>
                        Assign Today's Leads →
                      </button>
                    </div>
                  </div>
                );
              })}
              {agents.filter(a=>a.role!=="admin").length===0&&(
                <div style={{ gridColumn:"1/-1", textAlign:"center", padding:48, color:"#94a3b8" }}>
                  <div style={{ fontSize:36, marginBottom:8 }}>👥</div>
                  <div style={{ fontWeight:600, marginBottom:4 }}>No agents yet</div>
                  <div style={{ fontSize:13 }}>Agents will appear here automatically when they first sign in with their Gmail</div>
                </div>
              )}
            </div>

            {/* Bulk assign section */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>⚡ Bulk Assign Leads</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Distribute all unassigned leads equally among all active agents automatically</div>
              <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
                <div style={{ background:"#f8f9ff", borderRadius:8, padding:"10px 16px", fontSize:13 }}>
                  <span style={{ color:"#94a3b8" }}>Unassigned leads: </span>
                  <span style={{ fontWeight:800, color:"#6366f1", fontSize:16 }}>{leads.filter(l=>!l.agent||l.agent==="").length}</span>
                </div>
                <div style={{ background:"#f8f9ff", borderRadius:8, padding:"10px 16px", fontSize:13 }}>
                  <span style={{ color:"#94a3b8" }}>Active agents: </span>
                  <span style={{ fontWeight:800, color:"#10b981", fontSize:16 }}>{agents.filter(a=>a.role!=="admin"&&a.is_active).length}</span>
                </div>
                <button onClick={async()=>{
                  const unassigned = leads.filter(l=>!l.agent||l.agent==="");
                  const activeAgents = agents.filter(a=>a.role!=="admin"&&a.is_active);
                  if(unassigned.length===0){ showToast("No unassigned leads","error"); return; }
                  if(activeAgents.length===0){ showToast("No active agents","error"); return; }
                  // Distribute round-robin
                  for(let i=0; i<unassigned.length; i++){
                    const agentForLead = activeAgents[i%activeAgents.length];
                    await supabase.from("leads").update({agent:agentForLead.full_name}).eq("id",unassigned[i].id);
                  }
                  // Reload leads
                  const {data}=await supabase.from("leads").select("*").order("created_at",{ascending:false});
                  setLeads((data||[]).map(fromDb));
                  showToast(`✅ ${unassigned.length} leads distributed among ${activeAgents.length} agents!`);
                }} style={{ padding:"10px 20px", borderRadius:9, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>
                  ⚡ Auto-Distribute All
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <Modal show={showWaAdd} onClose={()=>{setShowWaAdd(false);setWaPhone("");}} width={480}>
        <div style={{ padding:28 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
            <div style={{ fontWeight:900, fontSize:18, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>💬 Quick Add WhatsApp Lead</div>
            <button onClick={()=>{setShowWaAdd(false);setWaPhone("");}} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
          </div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:22 }}>Paste the WhatsApp number from your phone — the lead form will open pre-filled.</div>

          {/* Step indicator */}
          <div style={{ display:"flex", gap:0, marginBottom:24 }}>
            {["1. Copy number from WhatsApp","2. Paste here","3. Lead form opens"].map((s,i)=>(
              <div key={i} style={{ flex:1, textAlign:"center" }}>
                <div style={{ width:28, height:28, borderRadius:"50%", background: i===1?"#25d366":"#e9ecf3", color: i===1?"#fff":"#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, margin:"0 auto 6px" }}>{i+1}</div>
                <div style={{ fontSize:10, color: i===1?"#25d366":"#94a3b8", fontWeight:600, lineHeight:1.3 }}>{s}</div>
              </div>
            ))}
          </div>

          <div style={{ background:"#f0fdf4", border:"1.5px solid #86efac", borderRadius:12, padding:16, marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#166534", marginBottom:8, letterSpacing:.4 }}>📱 WHATSAPP NUMBER</div>
            <input
              value={waPhone}
              onChange={e=>setWaPhone(e.target.value)}
              placeholder="+971501234567"
              autoFocus
              style={{ width:"100%", border:"1.5px solid #86efac", borderRadius:8, padding:"10px 14px", fontSize:16, fontFamily:"inherit", outline:"none", background:"#fff", boxSizing:"border-box", fontWeight:700, color:"#0f172a" }}
            />
            <div style={{ fontSize:11, color:"#64748b", marginTop:6 }}>Include country code e.g. +971 for UAE, +966 for KSA, +20 for Egypt</div>
          </div>

          {/* Campaign selector */}
          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, letterSpacing:.4 }}>📣 WHICH CAMPAIGN IS THIS FROM?</div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8 }}>
              {["Ramadan Promo","Spring Sale","KSA Launch","Egypt Campaign","April Awareness","Other"].map(c=>(
                <button key={c} id={`camp_${c}`} onClick={e=>{
                  document.querySelectorAll("[id^='camp_']").forEach(b=>{ b.style.background="#fafbfc"; b.style.border="1.5px solid #e2e8f0"; b.style.color="#64748b"; });
                  e.currentTarget.style.background="#eff6ff"; e.currentTarget.style.border="1.5px solid #6366f1"; e.currentTarget.style.color="#6366f1";
                  e.currentTarget.dataset.selected="true";
                }} style={{ padding:"8px 10px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fafbfc", cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:"inherit", color:"#64748b", textAlign:"left" }}>
                  {c}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={()=>{
              if(!waPhone.trim()) return;
              const now = new Date();
              const selectedCamp = [...document.querySelectorAll("[id^='camp_']")].find(b=>b.dataset.selected==="true");
              const campaign = selectedCamp?.textContent || "";
              const prefilledEmpty = {
                ...EMPTY,
                phone: waPhone.trim(),
                whatsappNumber: waPhone.trim(),
                adSource: "Digital Leads",
                adCampaign: campaign,
                dateReceived: todayStr(),
                timeReceived: now.toTimeString().slice(0,5),
                disposition: "New",
                agent: agentName,
              };
              setShowWaAdd(false);
              setWaPhone("");
              setShowAdd(true);
              // store prefilled in sessionStorage to pass to form
              sessionStorage.setItem("wa_prefill", JSON.stringify(prefilledEmpty));
              window.__waPrefill = prefilledEmpty;
            }}
            disabled={!waPhone.trim()}
            style={{ width:"100%", padding:"12px", borderRadius:10, border:"none", background: waPhone.trim()?"#25d366":"#e2e8f0", color: waPhone.trim()?"#fff":"#94a3b8", cursor: waPhone.trim()?"pointer":"not-allowed", fontWeight:800, fontSize:15, fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8 }}>
            💬 Open Lead Form →
          </button>

          <div style={{ marginTop:16, padding:12, background:"#f8f9ff", borderRadius:10, fontSize:12, color:"#64748b" }}>
            <div style={{ fontWeight:700, color:"#0f172a", marginBottom:4 }}>💡 How to use on mobile:</div>
            <div>1. Open WhatsApp Business → tap on the message</div>
            <div>2. Copy the sender's number</div>
            <div>3. Open LeadFlow → tap <strong>WhatsApp Lead</strong></div>
            <div>4. Paste number → select campaign → tap Open</div>
            <div>5. Fill name & details → Save ✅</div>
          </div>
        </div>
      </Modal>

      <Modal show={showAdd} onClose={()=>setShowAdd(false)} width={700}>
        <LeadForm
          initial={window.__waPrefill || EMPTY}
          onSave={form=>{ window.__waPrefill=null; add(form); }}
          onCancel={()=>{ window.__waPrefill=null; setShowAdd(false); }}
          title="➕ Add New Lead"
          saving={saving}
          agentName={agentName}
          isAdmin={isAdmin}
          agents={agents}
        />
      </Modal>
      <Modal show={!!editLead} onClose={()=>setEditLead(null)} width={700}>{editLead&&<LeadForm initial={editLead} onSave={f=>upd(editLead.id,f)} onCancel={()=>setEditLead(null)} title="✏️ Edit Lead" saving={saving} agentName={agentName} isAdmin={isAdmin} agents={agents}/>}</Modal>
      <Modal show={!!dispLead} onClose={()=>setDispLead(null)} width={480}>{dispLead&&<DispPanel lead={dispLead} onUpdate={p=>upd(dispLead.id,p)} onClose={()=>setDispLead(null)} saving={saving}/>}</Modal>
      <Modal show={!!detail} onClose={()=>setDetail(null)} width={580}>
        {detail&&(<div style={{ padding:26 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
            <div style={{ display:"flex", gap:12, alignItems:"center" }}><Ava name={detail.leadName} size={46}/><div><div style={{ fontWeight:900, fontSize:18, fontFamily:"'Sora',sans-serif" }}>{detail.leadName}</div><div style={{ display:"flex", gap:8, marginTop:5, flexWrap:"wrap" }}><SrcBadge source={detail.adSource}/><Badge label={detail.disposition}/></div></div></div>
            <button onClick={()=>setDetail(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12 }}>
            {[["📞 Phone",detail.phone],["💬 WhatsApp",detail.whatsappNumber||detail.phone],["🪪 EID No",detail.eidNo||"—"],["🏙️ City",detail.city||"—"],["📅 Date Received",detail.dateReceived||"—"],["👤 Agent",detail.agent],["📊 Call Attempts",detail.attemptCount],["📅 Last Call",detail.lastCallDate||"—"],["🏷️ Lead Status",detail.leadStatus||"—"],["💰 Sales Status",detail.salesStatus||"—"],["📣 Campaign",detail.adCampaign||"—"],["🔁 Follow-up",detail.callbackDate||"—"]].map(([k,v])=>(
              <div key={k} style={{ background:"#f8f9ff", borderRadius:8, padding:"9px 12px" }}><div style={{ fontSize:10, color:"#94a3b8", fontWeight:700, marginBottom:1 }}>{k}</div><div style={{ fontSize:13, fontWeight:700, color:"#0f172a" }}>{String(v)}</div></div>
            ))}
          </div>
          {detail.callNotes&&<div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:10, padding:"10px 14px", marginBottom:12 }}><div style={{ fontSize:10, fontWeight:800, color:"#92400e", marginBottom:3 }}>📝 REMARKS / CALL NOTES</div><div style={{ fontSize:13, color:"#78350f" }}>{detail.callNotes}</div></div>}
          {detail.sheetLink&&<a href={detail.sheetLink} target="_blank" rel="noreferrer" style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e8f5e9", color:"#2e7d32", borderRadius:8, padding:"7px 14px", textDecoration:"none", fontWeight:700, fontSize:13, marginBottom:14 }}>📊 Open Google Sheet</a>}
          <div style={{ display:"flex", gap:8, justifyContent:"flex-end", marginTop:4 }}>
            <a href={`https://wa.me/${(detail.whatsappNumber||detail.phone||"").replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ padding:"9px 15px", borderRadius:8, background:"#25d366", color:"#fff", fontWeight:800, fontSize:13, textDecoration:"none" }}>W Chat</a>
            <button onClick={()=>{setDispLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#eef2ff", color:"#6366f1", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Update Status</button>
            {isAdmin&&<button onClick={()=>{setEditLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#0f172a", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Edit Lead</button>}
          </div>
        </div>)}
      </Modal>
      <Modal show={!!delLead} onClose={()=>setDelLead(null)} width={380}>
        {delLead&&(<div style={{ padding:32, textAlign:"center" }}><div style={{ fontSize:42, marginBottom:12 }}>🗑️</div><div style={{ fontWeight:900, fontSize:17, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>Delete this lead?</div><div style={{ color:"#64748b", marginBottom:22, fontSize:14 }}>Permanently remove <strong>{delLead.leadName}</strong>?</div><div style={{ display:"flex", gap:10, justifyContent:"center" }}><button onClick={()=>setDelLead(null)} style={{ padding:"9px 22px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", color:"#64748b" }}>Cancel</button><button onClick={()=>del(delLead.id)} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit", opacity:saving?0.7:1 }}>{saving?"Deleting…":"Delete"}</button></div></div>)}
      </Modal>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
    </div>
  );
}
