/* eslint-disable */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// Error boundary to catch white screen crashes
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e) { return { error: e }; }
  render() {
    if (this.state.error) return (
      <div style={{ padding:40, fontFamily:"sans-serif", background:"#fef2f2", minHeight:"100vh" }}>
        <h2 style={{ color:"#dc2626" }}>⚠️ App Error — Please share this with support</h2>
        <pre style={{ background:"#fee2e2", padding:20, borderRadius:8, fontSize:13, whiteSpace:"pre-wrap", overflowX:"auto" }}>{this.state.error?.message}{"\n\n"}{this.state.error?.stack}</pre>
        <button onClick={()=>window.location.reload()} style={{ marginTop:16, padding:"10px 20px", borderRadius:8, background:"#6366f1", color:"#fff", border:"none", cursor:"pointer", fontSize:14, fontWeight:700 }}>🔄 Reload App</button>
      </div>
    );
    return this.props.children;
  }
}

const SUPABASE_URL = "https://mswsvjaortcotuytlvdq.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zd3N2amFvcnRjb3R1eXRsdmRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4Mzg3NjgsImV4cCI6MjA5MjQxNDc2OH0.9FxvfwGOW1ae6-EomRMhHMfVUY5aCfeyZHMDXgrCAyc";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const SUPER_ADMIN = "rashick2012@gmail.com"; // always admin, cannot be removed
const getAdminEmails = () => {
  try { return JSON.parse(localStorage.getItem("lf_admins")||"[]"); } catch { return []; }
};
const isAdminEmail = (email) => email === SUPER_ADMIN || getAdminEmails().includes(email);
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
  { label:"New",            color:"#1d4ed8", bg:"#eef2ff", icon:"🆕" },
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
const LANGUAGES = ["Arabic","English","Malayalam","Filipino","Hindi","Urdu","French","Other"];
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
  const pal = ["#1e3a5f","#1d4ed8","#0369a1","#0f766e","#4338ca","#6d28d9"];
  const c = pal[(name||"A").charCodeAt(0)%pal.length];
  return <div style={{ width:size, height:size, borderRadius:"50%", background:c, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontSize:size*0.36, fontWeight:700, flexShrink:0 }}>{(name||"?").split(" ").map(n=>n[0]).join("").slice(0,2).toUpperCase()}</div>;
}
function Stat({ icon, label, value, sub, accent }) {
  return (
    <div style={{ background:"#fff", borderRadius:10, padding:"14px 16px", flex:1, minWidth:110, border:"1px solid #e2e8f0", position:"relative", overflow:"hidden", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
      <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:accent }}/>
      <div style={{ fontSize:16, marginBottom:4 }}>{icon}</div>
      <div style={{ fontSize:9, color:"#64748b", fontWeight:700, letterSpacing:.8, textTransform:"uppercase", marginBottom:2 }}>{label}</div>
      <div style={{ fontSize:20, fontWeight:800, color:"#0f2744", lineHeight:1.1 }}>{value}</div>
      {sub&&<div style={{ fontSize:10, color:"#94a3b8", marginTop:2 }}>{sub}</div>}
    </div>
  );
}
function Modal({ show, onClose, width=640, children }) {
  useEffect(()=>{ document.body.style.overflow=show?"hidden":""; return()=>{document.body.style.overflow="";} },[show]);
  if(!show) return null;
  return (
    <div
      onMouseDown={(e)=>{ if(e.target===e.currentTarget) onClose(); }}
      style={{ position:"fixed", inset:0, background:"rgba(2,8,23,.55)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center", padding:16, backdropFilter:"blur(3px)" }}>
      <div
        onMouseDown={e=>e.stopPropagation()}
        onClick={e=>e.stopPropagation()}
        style={{ background:"#fff", borderRadius:18, width:"100%", maxWidth:width, maxHeight:"93vh", overflowY:"auto", boxShadow:"0 32px 96px rgba(0,0,0,.22)", animation:"mIn .22s cubic-bezier(.34,1.56,.64,1)" }}>
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
      <button onClick={onManualSync} disabled={syncing} style={{ padding:"5px 14px", borderRadius:7, border:"1.5px solid #6366f1", background:"#fff", color:"#1d4ed8", cursor:syncing?"not-allowed":"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit", opacity:syncing?0.6:1 }}>
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
        <div style={{ width:64, height:64, background:"#0f2744", borderRadius:18, display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 20px" }}>📲</div>
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

      <div style={{ fontSize:10, fontWeight:800, color:"#1d4ed8", letterSpacing:1, marginBottom:10 }}>📋 LEAD INFO</div>
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
          style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"#0f2744", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", fontFamily:"inherit", opacity:saving?0.7:1 }}>
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
        style={{ width:"100%", padding:12, borderRadius:10, border:"none", background:"#0f2744", cursor:"pointer", fontWeight:800, fontSize:14, color:"#fff", fontFamily:"inherit", opacity:saving?0.7:1 }}>
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

// ── ADMIN MANAGER COMPONENT ───────────────────────────────────────────────────
function AdminManager({ superAdmin, showToast }) {
  const [admins,setAdmins]     = useState(getAdminEmails);
  const [newEmail,setNewEmail] = useState("");
  const [saving,setSaving]     = useState(false);
  const inp = { border:"1.5px solid #e2e8f0", borderRadius:8, padding:"8px 12px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#fafbfc", color:"#0f172a" };

  const save = list => { localStorage.setItem("lf_admins",JSON.stringify(list)); setAdmins(list); };

  const add = async () => {
    const email = newEmail.trim().toLowerCase();
    if(!email||!email.includes("@")) { showToast("Enter a valid Gmail address","error"); return; }
    if(email===superAdmin) { showToast("You are already super admin","error"); return; }
    if(admins.includes(email)) { showToast("Already an admin","error"); return; }
    setSaving(true);
    await supabase.from("agents").update({role:"admin"}).eq("email",email);
    save([...admins,email]);
    setNewEmail(""); setSaving(false);
    showToast(`✅ ${email} is now a Team Leader`);
  };

  const remove = async email => {
    await supabase.from("agents").update({role:"agent"}).eq("email",email);
    save(admins.filter(e=>e!==email));
    showToast(`⭕ ${email} removed from admins`);
  };

  return (
    <div>
      {/* Super admin */}
      <div style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#fef3c7", border:"1px solid #fde68a", borderRadius:10, marginBottom:8 }}>
        <div style={{ width:34, height:34, borderRadius:"50%", background:"#d97706", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, flexShrink:0 }}>👑</div>
        <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13, color:"#92400e" }}>{superAdmin}</div><div style={{ fontSize:11, color:"#b45309" }}>Super Admin — cannot be removed</div></div>
        <span style={{ background:"#d97706", color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:800 }}>SUPER ADMIN</span>
      </div>
      {/* Other admins */}
      {admins.map(email=>(
        <div key={email} style={{ display:"flex", alignItems:"center", gap:10, padding:"10px 14px", background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, marginBottom:8 }}>
          <div style={{ width:34, height:34, borderRadius:"50%", background:"#1d4ed8", color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:14, flexShrink:0 }}>🏅</div>
          <div style={{ flex:1 }}><div style={{ fontWeight:700, fontSize:13, color:"#1e3a5f" }}>{email}</div><div style={{ fontSize:11, color:"#3b82f6" }}>Team Leader — full admin access</div></div>
          <span style={{ background:"#1d4ed8", color:"#fff", borderRadius:6, padding:"2px 8px", fontSize:10, fontWeight:800, marginRight:8 }}>ADMIN</span>
          <button onClick={()=>remove(email)} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"#fef2f2", color:"#dc2626", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Remove</button>
        </div>
      ))}
      {admins.length===0&&<div style={{ fontSize:13, color:"#94a3b8", fontStyle:"italic", padding:"8px 0" }}>No team leaders added yet</div>}
      {/* Add new */}
      <div style={{ background:"#f8fafc", borderRadius:10, padding:"14px 16px", border:"1.5px dashed #e2e8f0", marginTop:12 }}>
        <div style={{ fontSize:11, fontWeight:700, color:"#64748b", marginBottom:8, letterSpacing:.4 }}>ADD TEAM LEADER</div>
        <div style={{ display:"flex", gap:10 }}>
          <input value={newEmail} onChange={e=>setNewEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&add()} placeholder="teamleader@gmail.com" type="email" style={{...inp,flex:1}}/>
          <button onClick={add} disabled={saving||!newEmail.trim()} style={{ padding:"8px 18px", borderRadius:8, border:"none", background:"#0f2744", color:"#fff", cursor:newEmail.trim()?"pointer":"not-allowed", fontWeight:700, fontSize:13, fontFamily:"inherit", opacity:saving||!newEmail.trim()?0.6:1 }}>
            {saving?"Adding…":"+ Add"}
          </button>
        </div>
        <div style={{ fontSize:11, color:"#94a3b8", marginTop:8 }}>The team leader must sign in with this exact Gmail. They get admin access automatically on login.</div>
      </div>
    </div>
  );
}

// ── IMPORT CSV COMPONENT ──────────────────────────────────────────────────────
function ImportCSV({ onClose, onImport, EMPTY }) {
  const [step,setStep]       = useState(1); // 1=upload, 2=map, 3=preview
  const [headers,setHeaders] = useState([]);
  const [rows,setRows]       = useState([]);
  const [mapping,setMapping] = useState({});
  const [importing,setImporting] = useState(false);

  const FIELDS = [
    {key:"phone",         label:"Phone / WhatsApp Number", required:true},
    {key:"whatsappNumber",label:"WhatsApp Number (if different)", required:false},
    {key:"leadName",      label:"Customer Name",           required:false},
    {key:"eidNo",         label:"EID No",                  required:false},
    {key:"dateReceived",  label:"Date Received",           required:false},
    {key:"agent",         label:"Assigned Agent",          required:false},
    {key:"adCampaign",    label:"Campaign",                required:false},
    {key:"adSet",         label:"Ad Set",                  required:false},
    {key:"disposition",   label:"Call Outcome",            required:false},
    {key:"callNotes",     label:"Remarks",                 required:false},
    {key:"leadStatus",    label:"Lead Status",             required:false},
    {key:"salesStatus",   label:"Sales Status",            required:false},
    {key:"city",          label:"City",                    required:false},
    {key:"language",      label:"Language",                required:false},
    {key:"callbackDate",  label:"Follow-up Date",          required:false},
    {key:"lastCallDate",  label:"Last Call Date",          required:false},
    {key:"attemptCount",  label:"Call Attempts",           required:false},
  ];

  const handleFile = e => {
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const text = ev.target.result;
      const lines = text.trim().split("\n");
      const parseCSVLine = line => {
        const cols=[]; let cur="", inQ=false;
        for(let i=0;i<line.length;i++){
          if(line[i]==='"'){inQ=!inQ;continue;}
          if(line[i]===","&&!inQ){cols.push(cur.trim());cur="";continue;}
          cur+=line[i];
        }
        cols.push(cur.trim());
        return cols;
      };
      const hdrs = parseCSVLine(lines[0]);
      const data = lines.slice(1).filter(l=>l.trim()).map(l=>parseCSVLine(l));
      setHeaders(hdrs);
      setRows(data);
      // Auto-map headers
      const autoMap = {};
      FIELDS.forEach(f=>{
        const match = hdrs.findIndex(h=>h.toLowerCase().includes(f.label.toLowerCase().split(" ")[0])||h.toLowerCase().includes(f.key.toLowerCase()));
        if(match>=0) autoMap[f.key]=match;
      });
      setMapping(autoMap);
      setStep(2);
    };
    reader.readAsText(file);
  };

  const mapped = rows.map((row,idx)=>{
    const lead={...EMPTY};
    Object.entries(mapping).forEach(([field,colIdx])=>{
      if(colIdx!==undefined && row[colIdx]!==undefined && row[colIdx].toString().trim()!=="")
        lead[field]=row[colIdx].toString().trim();
    });
    // Auto-fill whatsapp from phone if not set
    if(!lead.whatsappNumber && lead.phone) lead.whatsappNumber = lead.phone;
    // Default name if missing
    if(!lead.leadName) lead.leadName = lead.phone || `Lead ${idx+1}`;
    // Default serial
    lead.serialNo = lead.serialNo || `IMP-${String(idx+1).padStart(3,"0")}`;
    lead.disposition = lead.disposition || "New";
    lead.adSource = lead.adSource || "Digital Leads";
    lead.dateReceived = lead.dateReceived || new Date().toISOString().split("T")[0];
    return lead;
  }).filter(l=>l.phone); // only phone is required

  return (
    <div style={{ padding:26 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ fontWeight:900, fontSize:18, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>📥 Import Leads from CSV/Excel</div>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#94a3b8" }}>✕</button>
      </div>

      {/* Step indicator */}
      <div style={{ display:"flex", gap:0, marginBottom:24 }}>
        {["Upload File","Map Columns","Preview & Import"].map((s,i)=>(
          <div key={s} style={{ flex:1, textAlign:"center" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:step>i+1?"#10b981":step===i+1?"#6366f1":"#e9ecf3", color:step>=i+1?"#fff":"#94a3b8", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:800, fontSize:12, margin:"0 auto 6px" }}>{step>i+1?"✓":i+1}</div>
            <div style={{ fontSize:10, color:step===i+1?"#6366f1":"#94a3b8", fontWeight:700 }}>{s}</div>
          </div>
        ))}
      </div>

      {step===1&&(
        <div style={{ textAlign:"center", padding:32 }}>
          <div style={{ fontSize:48, marginBottom:16 }}>📂</div>
          <div style={{ fontWeight:700, fontSize:16, marginBottom:8 }}>Upload your CSV or Excel file</div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>Export your Excel sheet as CSV first (File → Save As → CSV)</div>

          {/* Sample CSV download */}
          <div style={{ background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:10, padding:"14px 20px", marginBottom:20, display:"inline-block", textAlign:"left" }}>
            <div style={{ fontWeight:700, fontSize:13, color:"#166534", marginBottom:6 }}>📋 Not sure about the format?</div>
            <div style={{ fontSize:12, color:"#15803d", marginBottom:10 }}>Download our sample CSV file to see exactly which columns and format is required</div>
            <button onClick={()=>{
              const headers = ["Phone / WhatsApp Number","Customer Name","EID NO","Date Received","Assigned Agent","Campaign Name","Ad Set","Lead Status","Call Outcome","Remarks","City"];
              const rows = [
                ["+971501234567","","","2026-04-24","","Ramadan Promo","UAE Males 25-40","","","",""],
                ["+971509876543","","","2026-04-24","","Ramadan Promo","UAE Males 25-40","","","",""],
                ["+966551234567","","","2026-04-24","","KSA Launch","KSA All","","","",""],
                ["+971557654321","Ahmed Al-Rashidi","784-1990-1234567-1","2026-04-23","Sara Ahmed","April Campaign","","Hot","Interested","Very interested","Dubai"],
                ["+20101234567","Fatima Hassan","","2026-04-23","Omar Khalid","Spring Sale","","Warm","Callback","Call back after 2pm","Cairo"],
              ];
              const csv = [headers,...rows].map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
              const blob = new Blob([csv],{type:"text/csv;charset=utf-8;"});
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href=url; a.download="leadflow_sample_import.csv"; a.click();
              URL.revokeObjectURL(url);
            }} style={{ padding:"8px 18px", borderRadius:7, border:"none", background:"#16a34a", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", display:"inline-flex", alignItems:"center", gap:6 }}>
              📥 Download Sample CSV
            </button>
          </div>

          <div>
            <label style={{ padding:"12px 32px", borderRadius:10, border:"2px dashed #1d4ed8", background:"#eff6ff", color:"#1d4ed8", cursor:"pointer", fontWeight:800, fontSize:14, display:"inline-block" }}>
              📂 Choose CSV File to Upload
              <input type="file" accept=".csv,.txt" onChange={handleFile} style={{ display:"none" }}/>
            </label>
          </div>
        </div>
      )}

      {step===2&&(
        <div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>Match your file columns to LeadFlow fields. <strong>{rows.length}</strong> rows found.</div>
          <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px", marginBottom:14, fontSize:12, color:"#92400e" }}>
            ⚠️ Only <strong>Phone / WhatsApp Number</strong> is required. All other fields are optional — agents will fill in customer details after the call
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:20, maxHeight:360, overflowY:"auto" }}>
            {FIELDS.map(f=>(
              <div key={f.key}>
                <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"flex", alignItems:"center", gap:5, marginBottom:3 }}>
                  {f.label}
                  {f.required
                    ? <span style={{ background:"#fef2f2", color:"#dc2626", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:700 }}>REQUIRED</span>
                    : <span style={{ background:"#f1f5f9", color:"#94a3b8", borderRadius:4, padding:"1px 5px", fontSize:9, fontWeight:600 }}>optional</span>
                  }
                </label>
                <select value={mapping[f.key]??""} onChange={e=>setMapping(m=>({...m,[f.key]:e.target.value===""?undefined:Number(e.target.value)}))}
                  style={{ width:"100%", border:`1.5px solid ${f.required&&mapping[f.key]===undefined?"#fca5a5":"#e2e8f0"}`, borderRadius:8, padding:"7px 10px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#fafbfc" }}>
                  <option value="">— Skip —</option>
                  {headers.map((h,i)=><option key={i} value={i}>{h}</option>)}
                </select>
              </div>
            ))}
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setStep(1)} style={{ padding:"9px 18px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", color:"#64748b" }}>Back</button>
            <button onClick={()=>setStep(3)} disabled={mapped.length===0} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"#0f2744", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", fontFamily:"inherit", opacity:mapped.length===0?0.5:1 }}>
              Preview {mapped.length} Leads →
            </button>
          </div>
        </div>
      )}

      {step===3&&(
        <div>
          <div style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>Ready to import <strong>{mapped.length}</strong> leads. First 5 shown below:</div>
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", marginBottom:12, fontSize:12, color:"#166534" }}>
            ✅ Missing fields are fine — leads will be imported with blank values and can be edited later in the app
          </div>
          <div style={{ background:"#f8f9ff", borderRadius:10, overflow:"auto", marginBottom:20, maxHeight:260 }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
              <thead><tr style={{ background:"#eff6ff" }}>
                {["Name","Phone","Agent","Campaign","Disposition"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontWeight:700, color:"#1d4ed8", whiteSpace:"nowrap" }}>{h}</th>)}
              </tr></thead>
              <tbody>
                {mapped.slice(0,5).map((l,i)=>(
                  <tr key={i} style={{ borderBottom:"1px solid #e9ecf3" }}>
                    <td style={{ padding:"7px 10px", fontWeight:600 }}>{l.leadName||"—"}</td>
                    <td style={{ padding:"7px 10px" }}>{l.phone||"—"}</td>
                    <td style={{ padding:"7px 10px" }}>{l.agent||"—"}</td>
                    <td style={{ padding:"7px 10px" }}>{l.adCampaign||"—"}</td>
                    <td style={{ padding:"7px 10px" }}>{l.disposition||"New"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
            <button onClick={()=>setStep(2)} style={{ padding:"9px 18px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", color:"#64748b" }}>Back</button>
            <button onClick={async()=>{ setImporting(true); await onImport(mapped); setImporting(false); }} disabled={importing}
              style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"linear-gradient(135deg,#10b981,#059669)", cursor:"pointer", fontWeight:800, fontSize:13, color:"#fff", fontFamily:"inherit", opacity:importing?0.7:1 }}>
              {importing?`Importing ${mapped.length} leads…`:`✅ Import ${mapped.length} Leads`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── CUSTOM DISPOSITIONS COMPONENT ────────────────────────────────────────────
function CustomDispositions({ current, onChange, onReset }) {
  const [disps,setDisps] = useState(current.map(d=>({...d})));
  const COLORS = ["#6366f1","#f59e0b","#10b981","#ef4444","#3b82f6","#8b5cf6","#64748b","#059669","#dc2626","#f97316","#06b6d4","#ec4899"];
  const ICONS  = ["🆕","📞","✅","❌","🔁","📵","🚫","🏆","🗑️","⭐","🔥","💎","📋","⏸️"];

  const update=(i,k,v)=>setDisps(ds=>ds.map((d,j)=>j===i?{...d,[k]:v}:d));
  const remove=(i)=>setDisps(ds=>ds.filter((_,j)=>j!==i));
  const add=()=>setDisps(ds=>[...ds,{label:`Status ${ds.length+1}`,color:COLORS[ds.length%COLORS.length],bg:"#f8f9ff",icon:"📋"}]);

  return (
    <div>
      <div style={{ display:"grid", gap:8, marginBottom:12 }}>
        {disps.map((d,i)=>(
          <div key={i} style={{ display:"flex", gap:8, alignItems:"center", background:"#f8f9ff", borderRadius:8, padding:"8px 12px" }}>
            <select value={d.icon} onChange={e=>update(i,"icon",e.target.value)} style={{ border:"1.5px solid #e2e8f0", borderRadius:6, padding:"4px", fontSize:16, background:"#fff", cursor:"pointer", outline:"none" }}>
              {ICONS.map(ic=><option key={ic}>{ic}</option>)}
            </select>
            <input value={d.label} onChange={e=>update(i,"label",e.target.value)} style={{ flex:1, border:"1.5px solid #e2e8f0", borderRadius:6, padding:"6px 10px", fontSize:13, fontFamily:"inherit", outline:"none" }}/>
            <input type="color" value={d.color} onChange={e=>update(i,"color",e.target.value)} style={{ width:32, height:32, borderRadius:6, border:"none", cursor:"pointer", padding:2 }}/>
            <span style={{ background:d.bg||"#f8f9ff", color:d.color, border:`1px solid ${d.color}33`, borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{d.icon} {d.label}</span>
            <button onClick={()=>remove(i)} style={{ background:"#fef2f2", border:"none", color:"#ef4444", borderRadius:6, padding:"4px 8px", cursor:"pointer", fontWeight:700, fontFamily:"inherit" }}>✕</button>
          </div>
        ))}
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <button onClick={add} style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid #6366f1", background:"#eff6ff", color:"#1d4ed8", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>+ Add Status</button>
        <button onClick={()=>onChange(disps.map(d=>({...d,bg:d.color+"18"})))} style={{ padding:"7px 14px", borderRadius:8, border:"none", background:"#0f2744", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>Save Changes</button>
        <button onClick={onReset} style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", color:"#64748b", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>Reset Defaults</button>
      </div>
    </div>
  );
}

// ── CALL HISTORY COMPONENT ────────────────────────────────────────────────────
function CallHistory({ leads, supabase, ngrokUrl, isAdmin, agentName, EMPTY, setShowAdd, showToast }) {
  const [logs, setLogs] = useState([]);
  useEffect(()=>{
    supabase.from("call_logs").select("*").order("created_at",{ascending:false}).limit(20)
      .then(({data})=>setLogs(data||[]));
  },[]);
  if(logs.length===0) return <div style={{ color:"#94a3b8", fontSize:13, textAlign:"center", padding:20 }}>No call history yet — calls will appear here automatically</div>;
  return (
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
      <thead><tr style={{ borderBottom:"1px solid #f1f5f9" }}>
        {["Time","Agent","Extension","Phone","Direction","Status","Duration","Lead"].map(h=>(
          <th key={h} style={{ padding:"6px 10px", textAlign:"left", fontSize:10, fontWeight:800, color:"#94a3b8" }}>{h}</th>
        ))}
      </tr></thead>
      <tbody>
        {logs.map(log=>{
          const matchLead = leads.find(l=>(l.phone||"").replace(/\D/g,"").slice(-9)===(log.phone_number||"").replace(/\D/g,"").slice(-9));
          const dur = log.duration ? `${Math.floor(log.duration/60)}:${(log.duration%60).toString().padStart(2,"0")}` : "—";
          const statusColor = { ended:"#10b981", answered:"#3b82f6", ringing:"#f59e0b", missed:"#ef4444" };
          return (
            <tr key={log.id} style={{ borderBottom:"1px solid #f8f9fc" }}>
              <td style={{ padding:"9px 10px", fontSize:11, color:"#64748b" }}>{new Date(log.created_at).toLocaleString()}</td>
              <td style={{ padding:"9px 10px", fontWeight:600 }}>{log.agent_name||"—"}</td>
              <td style={{ padding:"9px 10px" }}><span style={{ background:"#eff6ff", color:"#1d4ed8", borderRadius:6, padding:"2px 8px", fontWeight:700, fontSize:12 }}>{log.extension||"—"}</span></td>
              <td style={{ padding:"9px 10px", fontWeight:600 }}>{log.phone_number||"—"}</td>
              <td style={{ padding:"9px 10px" }}><span style={{ fontSize:12 }}>{log.direction==="inbound"?"📥 In":"📤 Out"}</span></td>
              <td style={{ padding:"9px 10px" }}><span style={{ color:statusColor[log.status]||"#64748b", fontWeight:700, fontSize:12 }}>{log.status||"—"}</span></td>
              <td style={{ padding:"9px 10px", fontWeight:700, fontFamily:"monospace" }}>{dur}</td>
              <td style={{ padding:"9px 10px" }}>
                {matchLead
                  ? <span style={{ color:"#059669", fontWeight:700, fontSize:12 }}>✅ {matchLead.leadName}</span>
                  : <span style={{ color:"#94a3b8", fontSize:12 }}>No match</span>
                }
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── PRE-REGISTER AGENT FORM ───────────────────────────────────────────────────
function PreRegisterAgent({ onSave }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const inp = { width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"9px 12px", fontSize:13, fontFamily:"inherit", outline:"none", background:"#fafbfc", boxSizing:"border-box", color:"#0f172a" };
  return (
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr auto", gap:10, alignItems:"end" }}>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>AGENT NAME (must match sheet exactly)</label>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Sara Ahmed" style={inp}/>
      </div>
      <div>
        <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:4 }}>GMAIL (optional — for when they log in)</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="sara@gmail.com" type="email" style={inp}/>
      </div>
      <button onClick={async()=>{ if(!name.trim()) return; setSaving(true); await onSave(name.trim(), email.trim()); setName(""); setEmail(""); setSaving(false); }}
        disabled={!name.trim()||saving}
        style={{ padding:"9px 18px", borderRadius:8, border:"none", background:"#0f2744", color:"#fff", cursor:name.trim()?"pointer":"not-allowed", fontWeight:800, fontSize:13, fontFamily:"inherit", whiteSpace:"nowrap", opacity:saving?0.7:1 }}>
        {saving?"Adding…":"+ Add Agent"}
      </button>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
function App() {
  const [user,setUser]           = useState(null);
  const [authLoading,setAuthLoading] = useState(true);
  const [needsName,setNeedsName] = useState(false);
  const [typedName,setTypedName] = useState("");
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
  const [dateFrom,setDateFrom]   = useState("");
  const [dateTo,setDateTo]       = useState("");
  const [sortBy,setSortBy]       = useState("dateReceived");
  // Daily target
  const [target,setTarget]       = useState(()=>Number(localStorage.getItem("lf_target")||10));
  const [showTargetEdit,setShowTargetEdit] = useState(false);
  const [tempTarget,setTempTarget] = useState(10);
  // Arabic UI
  const [isArabic,setIsArabic]   = useState(()=>localStorage.getItem("lf_lang")==="ar");
  // Audit log
  const [auditLog,setAuditLog]   = useState([]);
  // Auto rotation
  const [rotationEnabled,setRotationEnabled] = useState(()=>localStorage.getItem("lf_rotation")==="1");
  // Custom dispositions
  const [customDisps,setCustomDisps] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("lf_disps")||"null")||null; }catch{ return null; }
  });
  // Leaderboard period state
  const [lbPeriod,setLbPeriod] = useState("today");
  const [showImport,setShowImport] = useState(false);
  const [showAdd,setShowAdd]     = useState(false);
  const [showWaAdd,setShowWaAdd] = useState(false);
  const [showAgents,setShowAgents] = useState(false);
  const [ngrokUrl,setNgrokUrl]   = useState(()=>localStorage.getItem("lf_ngrok")||"");
  const [liveCalls,setLiveCalls] = useState([]);
  const [callTick,setCallTick]   = useState(0);
  const [waPhone,setWaPhone]     = useState("");
  const [editLead,setEditLead]   = useState(null);
  const [dispLead,setDispLead]   = useState(null);
  const [detail,setDetail]       = useState(null);
  const [delLead,setDelLead]     = useState(null);

  // Active dispositions — custom or default
  const ACTIVE_DISPS = customDisps || DISPOSITIONS;
  // agentName comes from agents table (their typed name), fallback to Google name
  const [agentName, setAgentName] = useState("");
  const isAdmin    = isAdminEmail(user?.email||"");
  const agentPhoto = user?.user_metadata?.avatar_url;

  const showToast=(msg,type="success")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),4000); };

  // Auth
  useEffect(()=>{
    supabase.auth.getSession().then(({data:{session}})=>{ setUser(session?.user||null); setAuthLoading(false); });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_,session)=>{ setUser(session?.user||null); setAuthLoading(false); });
    return()=>subscription.unsubscribe();
  },[]);

  // On login: check if agent exists in DB, if not → show name entry screen
  useEffect(()=>{
    if(!user) return;
    const register = async () => {
      // Check if already registered
      const {data:existing} = await supabase.from("agents").select("*").eq("id", user.id).single();
      if(existing) {
        // Already registered — use their saved name
        setAgentName(existing.full_name);
        setNeedsName(false);
        // Reload agents list
        const {data:allAgents} = await supabase.from("agents").select("*").eq("is_active",true).order("full_name");
        setAgents(allAgents||[]);
      } else {
        // First time — admin auto-registers with email prefix, agents must type name
        if(user.email===SUPER_ADMIN) {
          await supabase.from("agents").insert({
            id: user.id, email: user.email,
            full_name: "Admin",
            avatar_url: user?.user_metadata?.avatar_url||"",
            role: "admin", is_active: true,
          });
          setAgentName("Admin");
          setNeedsName(false);
          const {data:allAgents} = await supabase.from("agents").select("*").eq("is_active",true).order("full_name");
          setAgents(allAgents||[]);
        } else {
          // New agent — ask for their name
          setNeedsName(true);
        }
      }
    };
    register();
  },[user]);

  // Save agent name (called after they type it)
  const saveAgentName = async () => {
    if(!typedName.trim()) return;
    const name = typedName.trim();
    const role = isAdminEmail(user.email) ? "admin" : "agent";
    await supabase.from("agents").insert({
      id: user.id, email: user.email,
      full_name: name,
      avatar_url: user?.user_metadata?.avatar_url||"",
      role, is_active: true,
    });
    setAgentName(name);
    setNeedsName(false);
    const {data:allAgents} = await supabase.from("agents").select("*").eq("is_active",true).order("full_name");
    setAgents(allAgents||[]);
    showToast(`Welcome ${name}! Your account is ready ✅`);
  };

  // Load leads (depends on agentName being set)
  useEffect(()=>{
    if(!user || !agentName) return;
    setLoading(true);
    const q=isAdmin?supabase.from("leads").select("*").order("created_at",{ascending:false}):supabase.from("leads").select("*").eq("agent",agentName).order("created_at",{ascending:false});
    q.then(({data,error})=>{ if(error) showToast("Failed to load leads","error"); else setLeads((data||[]).map(fromDb)); setLoading(false); });
  },[agentName]);

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
    if(!user || !agentName) return;
    syncFromSheet();
    const interval = setInterval(syncFromSheet, SYNC_INTERVAL);
    return()=>clearInterval(interval);
  },[agentName]);

  // ── Live calls from Yeastar bridge ───────────────────────────────────────
  useEffect(()=>{
    if(!agentName || !ngrokUrl) return;
    const fetchLiveCalls = async ()=>{
      try {
        const res = await fetch(`${ngrokUrl}/live-calls`);
        const data = await res.json();
        // Handle different response shapes from Yeastar
        const calls = data?.data || data?.calls || data || [];
        if(Array.isArray(calls)) setLiveCalls(calls);
      } catch(e) { /* bridge offline */ }
    };
    fetchLiveCalls();
    const interval = setInterval(fetchLiveCalls, 5000); // poll every 5s
    return()=>clearInterval(interval);
  },[agentName, ngrokUrl]);

  // Tick every second for live call duration display
  useEffect(()=>{
    const t = setInterval(()=>setCallTick(n=>n+1), 1000);
    return()=>clearInterval(t);
  },[]);
  useEffect(()=>{
    if(!agentName) return;
    const channel = supabase.channel("leads-realtime")
      .on("postgres_changes",{ event:"INSERT", schema:"public", table:"leads" }, payload=>{
        const newLead = fromDb(payload.new);
        if(isAdmin || newLead.agent===agentName){
          setLeads(ls=>{
            if(ls.find(l=>l.id===newLead.id)) return ls;
            showToast(`🆕 New lead: ${newLead.leadName}`);
            return [newLead,...ls];
          });
        }
      })
      .on("postgres_changes",{ event:"UPDATE", schema:"public", table:"leads" }, payload=>{
        const updated = fromDb(payload.new);
        if(isAdmin || updated.agent===agentName){
          setLeads(ls=>ls.map(l=>l.id===updated.id?updated:l));
          if(detail?.id===updated.id) setDetail(updated);
        }
      })
      .on("postgres_changes",{ event:"DELETE", schema:"public", table:"leads" }, payload=>{
        setLeads(ls=>ls.filter(l=>l.id!==payload.old.id));
      })
      .on("postgres_changes",{ event:"INSERT", schema:"public", table:"agents" }, payload=>{
        setAgents(ls=>[...ls, payload.new]);
      })
      .subscribe();
    return()=>supabase.removeChannel(channel);
  },[agentName]);

  // ── Callback reminder notifications ──────────────────────────────────────
  useEffect(()=>{
    if(!agentName) return;
    // Request notification permission
    if("Notification" in window && Notification.permission==="default"){
      Notification.requestPermission();
    }
    const checkCallbacks = ()=>{
      const now = new Date();
      const nowDate = now.toISOString().split("T")[0];
      const nowTime = now.toTimeString().slice(0,5);
      leads.forEach(l=>{
        if(l.disposition==="Callback" && l.callbackDate===nowDate && l.callbackTime){
          const diff = Math.abs(new Date(`${l.callbackDate}T${l.callbackTime}`)-now);
          if(diff < 60000){ // within 1 minute
            const key = `reminded_${l.id}_${l.callbackDate}_${l.callbackTime}`;
            if(!sessionStorage.getItem(key)){
              sessionStorage.setItem(key,"1");
              // Browser notification
              if(Notification.permission==="granted"){
                new Notification(`📞 Callback Due: ${l.leadName}`,{
                  body:`Call ${l.phone} now — scheduled for ${l.callbackTime}`,
                  icon:"/favicon.ico"
                });
              }
              showToast(`🔔 Callback due NOW: ${l.leadName} — ${l.phone}`,"error");
            }
          }
        }
      });
    };
    const interval = setInterval(checkCallbacks, 30000); // check every 30s
    checkCallbacks();
    return()=>clearInterval(interval);
  },[leads, agentName]);

  // ── Export to Excel ───────────────────────────────────────────────────────
  const exportToExcel = ()=>{
    const headers = ["Serial No","Date Received","Customer Name","Phone","WhatsApp","EID No","City","Language","Source","Campaign","Ad Set","Product","Disposition","Lead Status","Sales Status","Agent","Call Attempts","Last Call Date","Follow-up Date","Call Notes","Sheet Link"];
    const rows = filtered.map(l=>[
      l.serialNo, l.dateReceived, l.leadName, l.phone, l.whatsappNumber,
      l.eidNo, l.city, l.language, l.adSource, l.adCampaign, l.adSet,
      l.product, l.disposition, l.leadStatus, l.salesStatus, l.agent,
      l.attemptCount, l.lastCallDate, l.callbackDate, l.callNotes, l.sheetLink
    ]);
    const csv = [headers,...rows].map(r=>r.map(v=>`"${(v||"").toString().replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href=url; a.download=`leads_${todayStr()}.csv`; a.click();
    URL.revokeObjectURL(url);
    showToast(`✅ Exported ${filtered.length} leads to CSV`);
  };

  const urgentCbs=useMemo(()=>leads.filter(l=>isOverdue(l)||isDueToday(l)).length,[leads]);
  const allAgents=useMemo(()=>[...new Set(leads.map(l=>l.agent).filter(Boolean))],[leads]);
  const todayLeads = useMemo(()=>leads.filter(l=>l.dateReceived===todayStr()),[leads]);
  const todayConverted = useMemo(()=>todayLeads.filter(l=>l.disposition==="Converted").length,[todayLeads]);

  const filtered=useMemo(()=>leads.filter(l=>{
    const q=search.toLowerCase();
    const inDateRange = (!dateFrom||l.dateReceived>=dateFrom)&&(!dateTo||l.dateReceived<=dateTo);
    return (!q||l.leadName.toLowerCase().includes(q)||l.phone.includes(q)||l.adCampaign?.toLowerCase().includes(q)||l.eidNo?.includes(q))
      &&(fDisp==="All"||l.disposition===fDisp)
      &&(fSrc==="All"||l.adSource===fSrc)
      &&(fAgent==="All"||l.agent===fAgent)
      &&inDateRange;
  }).sort((a,b)=>sortBy==="leadName"?a.leadName.localeCompare(b.leadName):sortBy==="attempts"?b.attemptCount-a.attemptCount:(b.dateReceived+b.timeReceived).localeCompare(a.dateReceived+a.timeReceived)),[leads,search,fDisp,fSrc,fAgent,sortBy,dateFrom,dateTo]);

  const add=async form=>{ setSaving(true); const {data,error}=await supabase.from("leads").insert(toDb(form)).select().single(); if(error) showToast("Failed to add","error"); else { setLeads(ls=>[fromDb(data),...ls]); setShowAdd(false); showToast("✅ Lead added!"); logAudit("ADD",form.leadName,`Added by ${agentName}`); } setSaving(false); };
  const upd=async(id,patch)=>{ setSaving(true); const {data,error}=await supabase.from("leads").update(toDb(patch)).eq("id",id).select().single(); if(error) showToast("Failed to update","error"); else { const u=fromDb(data); setLeads(ls=>ls.map(l=>l.id===id?u:l)); if(detail?.id===id) setDetail(u); setDispLead(null); setEditLead(null); showToast("✅ Updated!"); logAudit("UPDATE",u.leadName,`Disposition→${patch.disposition||u.disposition} by ${agentName}`); } setSaving(false); };
  const del=async id=>{ setSaving(true); const lead=leads.find(l=>l.id===id); const {error}=await supabase.from("leads").delete().eq("id",id); if(error) showToast("Failed to delete","error"); else { setLeads(ls=>ls.filter(l=>l.id!==id)); setDelLead(null); setDetail(null); showToast("🗑️ Deleted"); logAudit("DELETE",lead?.leadName||"Unknown",`Deleted by ${agentName}`); } setSaving(false); };
  const signOut=async()=>{ await supabase.auth.signOut(); setUser(null); setLeads([]); };

  // ── Audit log ────────────────────────────────────────────────
  const logAudit = (action, leadName, detail) => {
    const entry = { action, leadName, detail, by: agentName, time: new Date().toISOString() };
    setAuditLog(prev => [entry, ...prev].slice(0, 200)); // keep last 200
    supabase.from("audit_log").insert({ action, lead_name: leadName, detail, performed_by: agentName }).then(()=>{});
  };

  // Load audit log
  useEffect(()=>{
    if(!agentName||!isAdmin) return;
    supabase.from("audit_log").select("*").order("created_at",{ascending:false}).limit(100)
      .then(({data})=>{ if(data) setAuditLog(data.map(d=>({action:d.action,leadName:d.lead_name,detail:d.detail,by:d.performed_by,time:d.created_at}))); });
  },[agentName]);

  // ── Auto Lead Rotation ────────────────────────────────────────
  useEffect(()=>{
    if(!rotationEnabled||!isAdmin||!agentName) return;
    const rotate = async ()=>{
      const activeAgents = agents.filter(a=>a.role!=="admin"&&a.is_active);
      if(activeAgents.length===0) return;
      const {data:unassigned}=await supabase.from("leads").select("id").or("agent.is.null,agent.eq.").limit(50);
      if(!unassigned||unassigned.length===0) return;
      for(let i=0;i<unassigned.length;i++){
        const agent=activeAgents[i%activeAgents.length];
        await supabase.from("leads").update({agent:agent.full_name}).eq("id",unassigned[i].id);
      }
      if(unassigned.length>0){
        const {data}=await supabase.from("leads").select("*").order("created_at",{ascending:false});
        setLeads((data||[]).map(fromDb));
        showToast(`🔄 Auto-rotated ${unassigned.length} leads`);
      }
    };
    rotate();
    const interval=setInterval(rotate, 5*60*1000);
    return()=>clearInterval(interval);
  },[rotationEnabled,agentName,agents]);

  if(authLoading || (user && !agentName && !needsName)) return (<div style={{ minHeight:"100vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f0f2f8" }}><div style={{ textAlign:"center" }}><div style={{ width:44, height:44, border:"4px solid #e2e8f0", borderTop:"4px solid #6366f1", borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/><div style={{ color:"#64748b", fontWeight:600, fontFamily:"sans-serif" }}>Setting up your account…</div></div><style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style></div>);
  if(!user) return <LoginScreen/>;

  // ── Pre-compute everything BEFORE early returns ───────────────
  const T = isArabic ? {
    leads:"العملاء", callbacks:"المتابعات", analytics:"التحليلات",
    agents:"الوكلاء", settings:"الإعدادات", livecalls:"المكالمات",
    leaderboard:"المتصدرون", kpi:"أداء الوكيل", audit:"سجل التغييرات",
    addLead:"+ إضافة عميل", search:"🔍 بحث...", total:"إجمالي العملاء",
    interested:"مهتم", converted:"تم التحويل", callbacks2:"مواعيد",
    digital:"عملاء رقميون", others:"آخرون", admin:"مدير",
    signOut:"تسجيل خروج", allDisp:"كل الحالات", allSrc:"كل المصادر",
    allAgents:"كل الوكلاء", newest:"الأحدث أولاً", nameAZ:"الاسم أ-ي",
    mostAttempts:"أكثر محاولات", export:"📤 تصدير",
  } : {
    leads:"📋 Leads", callbacks:"🔁 Follow-ups", analytics:"📊 Analytics",
    agents:"👥 Agents", settings:"⚙️ Settings", livecalls:"📞 Live Calls",
    leaderboard:"🏆 Leaderboard", kpi:"🎯 My KPIs", audit:"📋 Audit Log",
    addLead:"+ Add Lead", search:"🔍  Search...", total:"TOTAL LEADS",
    interested:"INTERESTED", converted:"CONVERTED", callbacks2:"FOLLOW-UPS",
    digital:"DIGITAL LEADS", others:"OTHERS", admin:"Admin",
    signOut:"Sign Out", allDisp:"All Dispositions", allSrc:"All Sources",
    allAgents:"All Agents", newest:"Newest First", nameAZ:"Name A–Z",
    mostAttempts:"Most Attempts", export:"📤 Export",
  };

  const total=leads.length,conv=leads.filter(l=>l.disposition==="Converted").length;
  const intr=leads.filter(l=>l.disposition==="Interested").length,cbs=leads.filter(l=>l.disposition==="Callback").length;
  const digital=leads.filter(l=>l.adSource==="Digital Leads").length;
  const others=leads.filter(l=>l.adSource==="Others").length;
  const inp={border:"1.5px solid #e2e8f0",borderRadius:8,padding:"8px 11px",fontSize:13,fontFamily:"inherit",background:"#fff",outline:"none",cursor:"pointer",color:"#0f172a"};
  const navB=(id,lbl,badge)=>(<button onClick={()=>setTab(id)} style={{ padding:"7px 14px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", background:tab===id?"#fff":"transparent", color:tab===id?"#0f172a":"#94a3b8", boxShadow:tab===id?"0 1px 4px rgba(0,0,0,.1)":"none", display:"flex", alignItems:"center", gap:5 }}>{lbl}{badge>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:10, fontWeight:900 }}>{badge}</span>}</button>);
  const EMPTY={serialNo:"",dateReceived:todayStr(),timeReceived:"",leadName:"",phone:"",whatsappNumber:"",email:"",gender:"Not Specified",city:"",language:"Arabic",adSource:"Digital Leads",adCampaign:"",adSet:"",product:"",disposition:"New",callbackDate:"",callbackTime:"",agent:agentName,callNotes:"",attemptCount:0,lastCallDate:"",sheetLink:"",eidNo:"",leadStatus:"",callStatus:"",salesStatus:"",remarks:""};

  // First time agent — ask for their name
  if(needsName) return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(135deg,#0f172a,#1e293b)", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"'DM Sans',sans-serif" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@700;800;900&family=DM+Sans:wght@400;500;600;700;800&display=swap'); *{box-sizing:border-box} @keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background:"#fff", borderRadius:24, padding:"48px 40px", width:"100%", maxWidth:440, textAlign:"center", boxShadow:"0 32px 96px rgba(0,0,0,.4)" }}>
        {/* Profile photo from Google */}
        {agentPhoto
          ? <img src={agentPhoto} alt="" style={{ width:72, height:72, borderRadius:"50%", objectFit:"cover", margin:"0 auto 16px", display:"block", border:"3px solid #6366f1" }}/>
          : <div style={{ width:72, height:72, borderRadius:"50%", background:"#0f2744", display:"flex", alignItems:"center", justifyContent:"center", fontSize:32, margin:"0 auto 16px" }}>👤</div>
        }
        <div style={{ fontWeight:900, fontSize:22, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:4 }}>Welcome to LeadFlow!</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:8 }}>{user.email}</div>
        <div style={{ fontSize:13, color:"#64748b", marginBottom:28 }}>Please enter your name so your team can identify you</div>

        <div style={{ textAlign:"left", marginBottom:20 }}>
          <label style={{ fontSize:11, fontWeight:700, color:"#64748b", display:"block", marginBottom:6, letterSpacing:.4 }}>YOUR FULL NAME</label>
          <input
            value={typedName}
            onChange={e=>setTypedName(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&saveAgentName()}
            placeholder="e.g. Sara Ahmed"
            autoFocus
            style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:10, padding:"12px 16px", fontSize:16, fontFamily:"inherit", outline:"none", boxSizing:"border-box", color:"#0f172a", fontWeight:600 }}
          />
          <div style={{ fontSize:11, color:"#94a3b8", marginTop:6 }}>This name will appear on leads assigned to you</div>
        </div>

        <button onClick={saveAgentName} disabled={!typedName.trim()}
          style={{ width:"100%", padding:"13px", borderRadius:12, border:"none", background: typedName.trim()?"linear-gradient(135deg,#6366f1,#3b82f6)":"#e2e8f0", color: typedName.trim()?"#fff":"#94a3b8", cursor: typedName.trim()?"pointer":"not-allowed", fontWeight:800, fontSize:15, fontFamily:"inherit" }}>
          Continue to LeadFlow →
        </button>
      </div>
    </div>
  );

  return (
    <div style={{ fontFamily:"'DM Sans','Segoe UI',sans-serif", background:"#f0f2f8", minHeight:"100vh", direction:isArabic?"rtl":"ltr" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:'Inter','DM Sans','Segoe UI',sans-serif}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:4px}
        @keyframes mIn{from{transform:scale(.96) translateY(8px);opacity:0}to{transform:scale(1) translateY(0);opacity:1}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        input:focus,select:focus,textarea:focus{border-color:#1e3a5f!important;box-shadow:0 0 0 3px rgba(30,58,95,.1)!important;outline:none}
        tbody tr:hover td{background:#f8fafd!important}
        .sidebar-item:hover{background:rgba(255,255,255,.08)!important}
        .sidebar-item.active{background:rgba(255,255,255,.15)!important;border-left:3px solid #60a5fa!important}
        .action-btn:hover{opacity:.88}
        th{user-select:none}
      `}</style>

      {/* ── LAYOUT WRAPPER ── */}
      <div style={{ display:"flex", minHeight:"100vh", background:"#f1f4f9", fontFamily:"'Inter','DM Sans',sans-serif", direction:isArabic?"rtl":"ltr" }}>

        {/* ── SIDEBAR ── */}
        <div style={{ width:220, background:"#0f2744", flexShrink:0, display:"flex", flexDirection:"column", position:"fixed", top:0, bottom:0, left:isArabic?"auto":"0", right:isArabic?"0":"auto", zIndex:100, overflowY:"auto" }}>
          {/* Logo */}
          <div style={{ padding:"20px 16px 16px", borderBottom:"1px solid rgba(255,255,255,.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ width:36, height:36, background:"linear-gradient(135deg,#2563eb,#3b82f6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>📲</div>
              <div>
                <div style={{ fontWeight:800, fontSize:16, color:"#fff", letterSpacing:-.3 }}>LeadFlow</div>
                <div style={{ fontSize:9, color:"#60a5fa", fontWeight:700, letterSpacing:.8, textTransform:"uppercase" }}>{isAdmin?"Administrator":"Telesales"}</div>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <nav style={{ flex:1, padding:"10px 8px" }}>
            {/* Main section */}
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:1.2, padding:"8px 8px 4px", textTransform:"uppercase" }}>Main</div>
            {[
              {id:"leads",     icon:"📋", label:isArabic?"العملاء":"Leads",        badge:0},
              {id:"pipeline",  icon:"🔁", label:isArabic?"خط سير":"Pipeline",      badge:0},
              {id:"callbacks", icon:"📞", label:isArabic?"المتابعات":"Follow-ups", badge:urgentCbs},
              {id:"livecalls", icon:"🔴", label:isArabic?"مكالمات":"Live Calls",   badge:liveCalls.length},
            ].map(({id,icon,label,badge})=>(
              <button key={id} onClick={()=>setTab(id)} className={`sidebar-item${tab===id?" active":""}`} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:7, border:tab===id?"none":"none", borderLeft:tab===id?"3px solid #60a5fa":"3px solid transparent", background:tab===id?"rgba(255,255,255,.12)":"transparent", color:tab===id?"#fff":"rgba(255,255,255,.6)", cursor:"pointer", fontWeight:tab===id?700:500, fontSize:13, fontFamily:"inherit", marginBottom:1, textAlign:"left", transition:"all .15s" }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span style={{ flex:1 }}>{label}</span>
                {badge>0&&<span style={{ background:"#ef4444", color:"#fff", borderRadius:10, padding:"1px 6px", fontSize:9, fontWeight:800, minWidth:18, textAlign:"center" }}>{badge}</span>}
              </button>
            ))}

            {/* Analytics section */}
            <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:1.2, padding:"12px 8px 4px", textTransform:"uppercase" }}>Analytics</div>
            {[
              {id:"analytics",   icon:"📊", label:isArabic?"التحليلات":"Analytics"},
              {id:"campaigns",   icon:"📣", label:isArabic?"الحملات":"Campaigns"},
              {id:"leaderboard", icon:"🏆", label:isArabic?"المتصدرون":"Leaderboard"},
              ...(!isAdmin?[{id:"kpi",icon:"🎯",label:isArabic?"أدائي":"My KPIs"}]:[]),
            ].map(({id,icon,label})=>(
              <button key={id} onClick={()=>setTab(id)} className={`sidebar-item${tab===id?" active":""}`} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:7, border:"none", borderLeft:tab===id?"3px solid #60a5fa":"3px solid transparent", background:tab===id?"rgba(255,255,255,.12)":"transparent", color:tab===id?"#fff":"rgba(255,255,255,.6)", cursor:"pointer", fontWeight:tab===id?700:500, fontSize:13, fontFamily:"inherit", marginBottom:1, textAlign:"left", transition:"all .15s" }}>
                <span style={{ fontSize:14 }}>{icon}</span>
                <span>{label}</span>
              </button>
            ))}

            {/* Admin section */}
            {isAdmin&&<>
              <div style={{ fontSize:9, fontWeight:700, color:"rgba(255,255,255,.35)", letterSpacing:1.2, padding:"12px 8px 4px", textTransform:"uppercase" }}>Admin</div>
              {[
                {id:"agents",  icon:"👥", label:isArabic?"الوكلاء":"Agents"},
                {id:"audit",   icon:"📋", label:isArabic?"السجل":"Audit Log"},
                {id:"settings",icon:"⚙️", label:isArabic?"الإعدادات":"Settings"},
              ].map(({id,icon,label})=>(
                <button key={id} onClick={()=>setTab(id)} className={`sidebar-item${tab===id?" active":""}`} style={{ width:"100%", display:"flex", alignItems:"center", gap:9, padding:"8px 10px", borderRadius:7, border:"none", borderLeft:tab===id?"3px solid #60a5fa":"3px solid transparent", background:tab===id?"rgba(255,255,255,.12)":"transparent", color:tab===id?"#fff":"rgba(255,255,255,.6)", cursor:"pointer", fontWeight:tab===id?700:500, fontSize:13, fontFamily:"inherit", marginBottom:1, textAlign:"left", transition:"all .15s" }}>
                  <span style={{ fontSize:14 }}>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </>}
          </nav>

          {/* User profile at bottom */}
          <div style={{ padding:"12px 12px 16px", borderTop:"1px solid rgba(255,255,255,.08)" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
              {agentPhoto?<img src={agentPhoto} alt="" style={{ width:32,height:32,borderRadius:"50%",objectFit:"cover",flexShrink:0 }}/>:<Ava name={agentName} size={32}/>}
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ fontSize:12, fontWeight:700, color:"#fff", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{agentName}</div>
                <div style={{ fontSize:9, color:"rgba(255,255,255,.45)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{user.email}</div>
              </div>
              {isAdmin&&<span style={{ background:"#1d4ed8", color:"#93c5fd", borderRadius:5, padding:"2px 5px", fontSize:8, fontWeight:800, flexShrink:0 }}>ADMIN</span>}
            </div>
            <div style={{ display:"flex", gap:6 }}>
              <button onClick={()=>{ const next=!isArabic; setIsArabic(next); localStorage.setItem("lf_lang",next?"ar":"en"); }} style={{ flex:1, padding:"6px", borderRadius:6, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.07)", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit", color:"rgba(255,255,255,.7)" }}>
                {isArabic?"EN":"ع"}
              </button>
              <button onClick={signOut} style={{ flex:2, padding:"6px", borderRadius:6, border:"1px solid rgba(255,255,255,.15)", background:"rgba(255,255,255,.07)", cursor:"pointer", fontWeight:600, fontSize:11, fontFamily:"inherit", color:"rgba(255,255,255,.7)" }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div style={{ marginLeft:isArabic?0:220, marginRight:isArabic?220:0, flex:1, display:"flex", flexDirection:"column", minWidth:0 }}>

          {/* ── TOP BAR ── */}
          <div style={{ background:"#fff", borderBottom:"1px solid #e2e8f0", padding:"0 24px", height:52, display:"flex", alignItems:"center", justifyContent:"space-between", position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 3px rgba(0,0,0,.06)" }}>
            {/* Page title */}
            <div style={{ display:"flex", alignItems:"center", gap:10 }}>
              <div style={{ fontWeight:700, fontSize:15, color:"#0f2744" }}>
                {tab==="leads"?"📋 Leads":tab==="pipeline"?"🔁 Pipeline":tab==="callbacks"?"📞 Follow-ups":tab==="livecalls"?"🔴 Live Calls":tab==="analytics"?"📊 Analytics":tab==="campaigns"?"📣 Campaign Performance":tab==="leaderboard"?"🏆 Leaderboard":tab==="kpi"?"🎯 My KPIs":tab==="agents"?"👥 Agent Management":tab==="audit"?"📋 Audit Log":"⚙️ Settings"}
              </div>
              {urgentCbs>0&&tab!=="callbacks"&&<span style={{ background:"#fef2f2", color:"#dc2626", borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:700 }}>⚠️ {urgentCbs} callbacks due</span>}
            </div>
            {/* Action buttons */}
            {isAdmin&&(
              <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                <button onClick={()=>setShowWaAdd(true)} style={{ padding:"6px 12px", borderRadius:7, border:"1.5px solid #16a34a", background:"#f0fdf4", color:"#16a34a", cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>💬 WhatsApp</button>
                <button onClick={()=>setShowImport(true)} style={{ padding:"6px 12px", borderRadius:7, border:"1.5px solid #2563eb", background:"#eff6ff", color:"#2563eb", cursor:"pointer", fontWeight:600, fontSize:12, fontFamily:"inherit" }}>📥 Import</button>
                <button onClick={()=>setShowAdd(true)} style={{ padding:"6px 14px", borderRadius:7, border:"none", background:"#0f2744", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit", display:"flex", alignItems:"center", gap:5 }}>+ Add Lead</button>
              </div>
            )}
          </div>

          {/* ── PAGE CONTENT ── */}
          <div style={{ padding:"16px 24px", flex:1 }}>

        {/* Sync Banner */}
        <SyncBanner lastSync={lastSync} syncing={syncing} newCount={newCount} onManualSync={syncFromSheet}/>

        {/* Role banner */}
        {!isAdmin&&<div style={{ background:"#eff6ff", border:"1px solid #bfdbfe", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13 }}>👤 <span style={{ fontWeight:600, color:"#1e40af" }}>Showing leads assigned to <strong>{agentName}</strong></span></div>}
        {isAdmin&&<div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:10, padding:"10px 16px", marginBottom:16, fontSize:13 }}>👑 <span style={{ fontWeight:600, color:"#92400e" }}>Admin view — ALL leads from all agents ({total} total)</span></div>}

        {/* STATS */}
        <div style={{ display:"flex", gap:10, marginBottom:16, flexWrap:"wrap" }}>
          <Stat icon="👥" label="TOTAL LEADS" value={loading?"…":total} sub={`${filtered.length} shown`} accent="#6366f1"/>
          <Stat icon="✅" label="INTERESTED" value={loading?"…":intr} sub="hot prospects" accent="#10b981"/>
          <Stat icon="🏆" label="CONVERTED" value={loading?"…":conv} sub={`${total?((conv/total)*100).toFixed(0):0}% rate`} accent="#059669"/>
          <Stat icon="🔁" label="FOLLOW-UPS" value={loading?"…":cbs} sub={`${urgentCbs} urgent`} accent="#3b82f6"/>
          <Stat icon="📲" label="DIGITAL LEADS" value={loading?"…":digital} sub="from ads" accent="#6366f1"/>
          <Stat icon="◉" label="OTHERS" value={loading?"…":others} sub="other sources" accent="#64748b"/>
        </div>

        {/* 🎯 Daily Target Tracker */}
        <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:"14px 20px", marginBottom:16, display:"flex", alignItems:"center", gap:16, flexWrap:"wrap" }}>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:6 }}>
              <div style={{ fontWeight:700, fontSize:13, color:"#0f172a" }}>🎯 Today's Target — Conversions</div>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ fontSize:13, fontWeight:800, color: todayConverted>=target?"#059669":"#6366f1" }}>{todayConverted} / {target}</span>
                <button onClick={()=>{setTempTarget(target);setShowTargetEdit(true);}} style={{ padding:"3px 10px", borderRadius:6, border:"1.5px solid #e2e8f0", background:"#f8f9ff", cursor:"pointer", fontSize:11, fontWeight:700, color:"#64748b", fontFamily:"inherit" }}>Edit</button>
              </div>
            </div>
            <div style={{ background:"#f1f5f9", borderRadius:20, height:10, overflow:"hidden" }}>
              <div style={{ height:"100%", width:`${Math.min((todayConverted/target)*100,100)}%`, background: todayConverted>=target?"linear-gradient(90deg,#10b981,#059669)":"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:20, transition:"width .5s ease" }}/>
            </div>
            <div style={{ fontSize:11, color:"#94a3b8", marginTop:4 }}>
              {todayConverted>=target ? "🎉 Target reached today!" : `${target-todayConverted} more conversion${target-todayConverted===1?"":"s"} to hit today's target`}
            </div>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            {[["📥 Today",todayStr(),todayStr()],["📅 This Week",new Date(Date.now()-6*864e5).toISOString().split("T")[0],todayStr()],["📆 This Month",todayStr().slice(0,8)+"01",todayStr()]].map(([lbl,from,to])=>(
              <button key={lbl} onClick={()=>{setDateFrom(from);setDateTo(to);}} style={{ padding:"6px 12px", borderRadius:7, border:`1.5px solid ${dateFrom===from&&dateTo===to?"#6366f1":"#e2e8f0"}`, background:dateFrom===from&&dateTo===to?"#eef2ff":"#fff", color:dateFrom===from&&dateTo===to?"#6366f1":"#64748b", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>{lbl}</button>
            ))}
            {(dateFrom||dateTo)&&<button onClick={()=>{setDateFrom("");setDateTo("");}} style={{ padding:"6px 12px", borderRadius:7, border:"1.5px solid #e2e8f0", background:"#fff", color:"#ef4444", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>✕ Clear</button>}
          </div>
        </div>

        {/* Target edit modal */}
        {showTargetEdit&&(
          <div onMouseDown={e=>{ if(e.target===e.currentTarget) setShowTargetEdit(false); }} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.4)", zIndex:999, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div onMouseDown={e=>e.stopPropagation()} style={{ background:"#fff", borderRadius:16, padding:28, width:300, textAlign:"center", boxShadow:"0 16px 48px rgba(0,0,0,.2)" }}>
              <div style={{ fontWeight:800, fontSize:16, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>🎯 Set Daily Target</div>
              <input type="number" min="1" value={tempTarget} onChange={e=>setTempTarget(Number(e.target.value))} style={{ width:"100%", border:"1.5px solid #e2e8f0", borderRadius:8, padding:"10px", fontSize:18, textAlign:"center", fontFamily:"inherit", outline:"none", marginBottom:16, fontWeight:800 }}/>
              <button onClick={()=>{ localStorage.setItem("lf_target",tempTarget); setTarget(tempTarget); setShowTargetEdit(false); }} style={{ width:"100%", padding:10, borderRadius:9, border:"none", background:"#0f2744", color:"#fff", fontWeight:800, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Save Target</button>
            </div>
          </div>
        )}

        {loading&&<div style={{ textAlign:"center", padding:60 }}><div style={{ width:40, height:40, border:"4px solid #e2e8f0", borderTop:"4px solid #6366f1", borderRadius:"50%", margin:"0 auto 16px", animation:"spin 0.8s linear infinite" }}/><div style={{ color:"#64748b", fontWeight:600 }}>Loading leads…</div></div>}

        {/* LEADS TAB */}
        {!loading&&tab==="leads"&&(
          <>
            <div style={{ display:"flex", gap:8, marginBottom:14, flexWrap:"wrap" }}>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  Search name, phone, EID, campaign…" style={{...inp,flex:1,minWidth:200,cursor:"text"}}/>
              <select value={fDisp} onChange={e=>setFDisp(e.target.value)} style={inp}><option value="All">All Dispositions</option>{DISPOSITIONS.map(d=><option key={d.label}>{d.label}</option>)}</select>
              <select value={fSrc} onChange={e=>setFSrc(e.target.value)} style={inp}><option value="All">All Sources</option>{AD_SOURCES.map(s=><option key={s}>{s}</option>)}</select>
              {isAdmin&&<select value={fAgent} onChange={e=>setFAgent(e.target.value)} style={inp}><option value="All">All Agents</option>{allAgents.map(a=><option key={a}>{a}</option>)}</select>}
              <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} style={{...inp,cursor:"text"}} title="From date"/>
              <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)} style={{...inp,cursor:"text"}} title="To date"/>
              <select value={sortBy} onChange={e=>setSortBy(e.target.value)} style={inp}><option value="dateReceived">Newest First</option><option value="leadName">Name A–Z</option><option value="attempts">Most Attempts</option></select>
              <button onClick={exportToExcel} style={{ padding:"8px 14px", borderRadius:8, border:"1.5px solid #10b981", background:"#ecfdf5", color:"#059669", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", whiteSpace:"nowrap" }}>📤 Export</button>
            </div>

            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", overflow:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#f8f9ff", borderBottom:"1.5px solid #e9ecf3" }}>
                  {["#","Date","Customer Name","Phone / WhatsApp","EID","Source","Disposition","Lead Status","Sales Status","Agent","Attempts","Follow-up","Actions"].map(h=>(
                    <th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:10, fontWeight:700, color:"#1e3a5f", letterSpacing:.6, whiteSpace:"nowrap", background:"#f8fafc", borderBottom:"2px solid #e2e8f0" }}>{h}</th>
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
                          <button onClick={()=>setDispLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#eff6ff", color:"#1d4ed8", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Update</button>
                          {(isAdmin||l.agent===agentName)&&<button onClick={()=>setEditLead(l)} style={{ padding:"4px 8px", borderRadius:6, border:"none", background:"#f1f5f9", color:"#475569", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>Edit</button>}
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
            </div>

            {/* ── Pre-register agent (for sheet matching) ── */}
            <div style={{ background:"#fff", borderRadius:14, border:"1.5px solid #6366f1", padding:22, marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>➕ Pre-register Agent</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Add an agent by name so leads from Google Sheet can be assigned to them before they log in. The name must match <strong>exactly</strong> what's in your sheet's "Assigned Agent" column.</div>
              <PreRegisterAgent onSave={async(name,email)=>{
                // Insert as pre-registered agent (no auth id needed)
                const {error} = await supabase.from("agents").insert({
                  id: crypto.randomUUID(),
                  email: email||`${name.toLowerCase().replace(/\s+/g,"")}@placeholder.com`,
                  full_name: name,
                  avatar_url: "",
                  role: "agent",
                  is_active: true,
                });
                if(error) showToast("Agent already exists or error occurred","error");
                else {
                  const {data:allAgents}=await supabase.from("agents").select("*").eq("is_active",true).order("full_name");
                  setAgents(allAgents||[]);
                  showToast(`✅ Agent "${name}" pre-registered! Leads from sheet will now auto-assign.`);
                }
              }}/> 
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
                        <div style={{ fontSize:10, background:"#eff6ff", color:"#1d4ed8", borderRadius:6, padding:"1px 7px", display:"inline-block", fontWeight:700, marginTop:3 }}>Agent</div>
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
                    {/* Assign leads today + delete */}
                    <div style={{ borderTop:"1px solid #f1f5f9", paddingTop:12 }}>
                      <div style={{ fontSize:11, color:"#64748b", marginBottom:8, fontWeight:600 }}>📋 Unassigned leads today: <strong style={{ color:"#1d4ed8" }}>{leads.filter(l=>!l.agent&&l.dateReceived===todayStr()).length}</strong></div>
                      <div style={{ display:"flex", gap:8 }}>
                        <button onClick={async()=>{
                          const unassigned = leads.filter(l=>(!l.agent||l.agent==="")&&l.dateReceived===todayStr());
                          if(unassigned.length===0){ showToast("No unassigned leads for today","error"); return; }
                          for(const lead of unassigned){
                            await supabase.from("leads").update({agent:a.full_name}).eq("id",lead.id);
                          }
                          setLeads(ls=>ls.map(l=>(!l.agent||l.agent==="")&&l.dateReceived===todayStr()?{...l,agent:a.full_name}:l));
                          showToast(`✅ ${unassigned.length} leads assigned to ${a.full_name}!`);
                        }} style={{ flex:1, padding:"8px", borderRadius:8, border:"none", background:"#0f2744", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>
                          Assign Today's Leads →
                        </button>
                        <button onClick={async()=>{
                          if(!window.confirm(`Remove ${a.full_name} from agents?`)) return;
                          await supabase.from("agents").delete().eq("id",a.id);
                          setAgents(ls=>ls.filter(x=>x.id!==a.id));
                          showToast(`🗑️ ${a.full_name} removed`);
                        }} style={{ padding:"8px 12px", borderRadius:8, border:"none", background:"#fef2f2", color:"#ef4444", cursor:"pointer", fontWeight:700, fontSize:12, fontFamily:"inherit" }}>
                          Remove
                        </button>
                      </div>
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
                  <span style={{ fontWeight:800, color:"#1d4ed8", fontSize:16 }}>{leads.filter(l=>!l.agent||l.agent==="").length}</span>
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

        {/* ── LEADERBOARD TAB ── */}
        {tab==="leaderboard"&&(
          <div style={{ maxWidth:800 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:4, direction:isArabic?"rtl":"ltr" }}>🏆 {isArabic?"لوحة المتصدرين":"Leaderboard"}</div>
            <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>{isArabic?"ترتيب الوكلاء حسب الأداء اليوم":"Agent ranking by performance today"}</div>

            {/* Period selector */}
            {(()=>{
              const periods=[["today","Today","اليوم"],["week","This Week","هذا الأسبوع"],["month","This Month","هذا الشهر"],["all","All Time","الكل"]];
              const getPeriodLeads=(p)=>{
                const now=todayStr();
                const weekAgo=new Date(Date.now()-6*864e5).toISOString().split("T")[0];
                const monthStart=now.slice(0,8)+"01";
                return leads.filter(l=>p==="all"?true:p==="today"?l.dateReceived===now:p==="week"?l.dateReceived>=weekAgo:l.dateReceived>=monthStart);
              };
              const pLeads=getPeriodLeads(lbPeriod);
              const ranked=agents.filter(a=>a.role!=="admin").map(a=>{
                const al=pLeads.filter(l=>l.agent===a.full_name);
                const conv=al.filter(l=>l.disposition==="Converted").length;
                const intr=al.filter(l=>l.disposition==="Interested").length;
                const att=al.reduce((s,l)=>s+l.attemptCount,0);
                const rate=al.length?((conv/al.length)*100).toFixed(0):0;
                return {...a,total:al.length,conv,intr,att,rate:Number(rate)};
              }).sort((a,b)=>b.conv-a.conv||b.intr-a.intr||b.total-a.total);

              return (
                <div>
                  <div style={{ display:"flex", gap:6, marginBottom:20 }}>
                    {periods.map(([id,en,ar])=>(
                      <button key={id} onClick={()=>setLbPeriod(id)} style={{ padding:"7px 16px", borderRadius:8, border:"none", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", background:lbPeriod===id?"#0f172a":"#fff", color:lbPeriod===id?"#fff":"#64748b", boxShadow:lbPeriod===id?"0 2px 8px rgba(0,0,0,.15)":"none" }}>
                        {isArabic?ar:en}
                      </button>
                    ))}
                  </div>
                  {ranked.map((a,i)=>{
                    const medals=["🥇","🥈","🥉"];
                    const medal=medals[i]||`#${i+1}`;
                    const isMe=a.full_name===agentName;
                    return (
                      <div key={a.id} style={{ background:isMe?"#eef2ff":"#fff", border:isMe?"2px solid #6366f1":"1px solid #e9ecf3", borderRadius:14, padding:"16px 20px", marginBottom:10, display:"flex", alignItems:"center", gap:16, transition:"all .2s" }}>
                        <div style={{ fontSize:28, minWidth:40, textAlign:"center" }}>{medal}</div>
                        <div style={{ display:"flex", alignItems:"center", gap:10, flex:1 }}>
                          {a.avatar_url?<img src={a.avatar_url} alt="" style={{ width:40,height:40,borderRadius:"50%",objectFit:"cover" }}/>:<Ava name={a.full_name} size={40}/>}
                          <div>
                            <div style={{ fontWeight:800, fontSize:15, color:"#0f172a" }}>{a.full_name} {isMe&&<span style={{ fontSize:11, color:"#1d4ed8", fontWeight:700 }}>(You)</span>}</div>
                            <div style={{ fontSize:12, color:"#64748b" }}>{a.email}</div>
                          </div>
                        </div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,64px)", gap:8, textAlign:"center" }}>
                          {[["🏆",a.conv,isArabic?"تحويل":"Conv","#059669"],["✅",a.intr,isArabic?"مهتم":"Hot","#10b981"],["📞",a.att,isArabic?"مكالمة":"Calls","#3b82f6"],["📊",`${a.rate}%`,isArabic?"نسبة":"Rate",a.rate>=20?"#059669":"#64748b"]].map(([ico,val,lbl,c])=>(
                            <div key={lbl} style={{ background:"#f8f9ff", borderRadius:10, padding:"8px 4px" }}>
                              <div style={{ fontSize:16 }}>{ico}</div>
                              <div style={{ fontWeight:900, fontSize:16, color:c, fontFamily:"'Sora',sans-serif" }}>{val}</div>
                              <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700 }}>{lbl}</div>
                            </div>
                          ))}
                        </div>
                        {/* Progress bar */}
                        <div style={{ minWidth:100 }}>
                          <div style={{ fontSize:10, color:"#94a3b8", marginBottom:4, fontWeight:700 }}>{isArabic?"التقدم":"PROGRESS"}</div>
                          <div style={{ background:"#f1f5f9", borderRadius:20, height:8, overflow:"hidden" }}>
                            <div style={{ height:"100%", width:`${Math.min(a.rate,100)}%`, background:a.rate>=20?"linear-gradient(90deg,#10b981,#059669)":"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:20 }}/>
                          </div>
                          <div style={{ fontSize:10, color:"#64748b", marginTop:2 }}>{a.total} {isArabic?"عميل":"leads"}</div>
                        </div>
                      </div>
                    );
                  })}
                  {ranked.length===0&&<div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}><div style={{ fontSize:36 }}>🏆</div><div style={{ fontWeight:600, marginTop:8 }}>{isArabic?"لا يوجد بيانات بعد":"No data yet for this period"}</div></div>}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── AGENT KPI TAB (for agents, not admin) ── */}
        {tab==="kpi"&&!isAdmin&&(()=>{
          const myLeads=leads.filter(l=>l.agent===agentName);
          const myToday=myLeads.filter(l=>l.dateReceived===todayStr());
          const myConv=myLeads.filter(l=>l.disposition==="Converted").length;
          const myIntr=myLeads.filter(l=>l.disposition==="Interested").length;
          const myNA=myLeads.filter(l=>l.disposition==="No Answer").length;
          const myCb=myLeads.filter(l=>l.disposition==="Callback").length;
          const myRate=myLeads.length?((myConv/myLeads.length)*100).toFixed(1):0;
          const todayConv=myToday.filter(l=>l.disposition==="Converted").length;
          return (
            <div style={{ maxWidth:900, direction:isArabic?"rtl":"ltr" }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:4 }}>🎯 {isArabic?"لوحة أدائي":"My KPI Dashboard"}</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:20 }}>{agentName}</div>

              {/* KPI cards */}
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:12, marginBottom:24 }}>
                {[
                  ["👥",myLeads.length,isArabic?"إجمالي العملاء":"Total Leads","#6366f1"],
                  ["🏆",myConv,isArabic?"تم التحويل":"Converted","#059669"],
                  ["✅",myIntr,isArabic?"مهتمون":"Interested","#10b981"],
                  ["🔁",myCb,isArabic?"مواعيد":"Callbacks","#3b82f6"],
                  ["📵",myNA,isArabic?"لا رد":"No Answer","#8b5cf6"],
                  ["📊",`${myRate}%`,isArabic?"نسبة التحويل":"Conv Rate","#059669"],
                ].map(([icon,val,label,color])=>(
                  <div key={label} style={{ background:"#fff", borderRadius:14, padding:"18px 16px", border:"1px solid #e9ecf3", textAlign:"center", position:"relative", overflow:"hidden" }}>
                    <div style={{ position:"absolute", top:0, left:0, right:0, height:3, background:color }}/>
                    <div style={{ fontSize:24, marginBottom:6 }}>{icon}</div>
                    <div style={{ fontSize:26, fontWeight:900, color, fontFamily:"'Sora',sans-serif" }}>{val}</div>
                    <div style={{ fontSize:11, color:"#64748b", fontWeight:700 }}>{label}</div>
                  </div>
                ))}
              </div>

              {/* Daily target */}
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22, marginBottom:16 }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:12, fontFamily:"'Sora',sans-serif" }}>🎯 {isArabic?"هدف اليوم":"Today's Target"}</div>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                  <span style={{ fontSize:14, color:"#475569" }}>{todayConv} / {target} {isArabic?"تحويل":"conversions"}</span>
                  <span style={{ fontWeight:800, color:todayConv>=target?"#059669":"#6366f1" }}>{todayConv>=target?"🎉 Done!":Math.round((todayConv/target)*100)+"%"}</span>
                </div>
                <div style={{ background:"#f1f5f9", borderRadius:20, height:14, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:`${Math.min((todayConv/target)*100,100)}%`, background:todayConv>=target?"linear-gradient(90deg,#10b981,#059669)":"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:20, transition:"width .5s" }}/>
                </div>
              </div>

              {/* Disposition breakdown */}
              <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
                <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>{isArabic?"تفاصيل حالات العملاء":"My Lead Breakdown"}</div>
                {DISPOSITIONS.map(d=>{ const n=myLeads.filter(l=>l.disposition===d.label).length; const p=myLeads.length?(n/myLeads.length)*100:0; return n>0?(<div key={d.label} style={{ marginBottom:10 }}><div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}><span style={{ fontSize:13, fontWeight:600, color:"#475569" }}>{d.icon} {d.label}</span><span style={{ fontSize:12, fontWeight:800, color:d.color }}>{n} ({p.toFixed(0)}%)</span></div><div style={{ background:"#f1f5f9", borderRadius:6, height:7, overflow:"hidden" }}><div style={{ height:"100%", width:`${p}%`, background:d.color, borderRadius:6 }}/></div></div>):null; })}
              </div>
            </div>
          );
        })()}

        {/* ── AUDIT LOG TAB ── */}
        {tab==="audit"&&isAdmin&&(
          <div>
            <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:20, direction:isArabic?"rtl":"ltr" }}>📋 {isArabic?"سجل التغييرات":"Audit Log"}</div>
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ background:"#f8f9ff", borderBottom:"1.5px solid #e9ecf3" }}>
                  {[isArabic?"الوقت":"Time", isArabic?"الإجراء":"Action", isArabic?"العميل":"Lead", isArabic?"التفاصيل":"Detail", isArabic?"بواسطة":"By"].map(h=>(
                    <th key={h} style={{ padding:"11px 14px", textAlign:isArabic?"right":"left", fontSize:10, fontWeight:800, color:"#1e3a5f", letterSpacing:.6 }}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {auditLog.map((log,i)=>{
                    const actionColor={ADD:"#10b981",UPDATE:"#3b82f6",DELETE:"#ef4444"};
                    const actionIcon={ADD:"➕",UPDATE:"✏️",DELETE:"🗑️"};
                    return (
                      <tr key={i} style={{ borderBottom:"1px solid #f1f5f9" }}>
                        <td style={{ padding:"10px 14px", fontSize:11, color:"#64748b", whiteSpace:"nowrap" }}>{new Date(log.time).toLocaleString()}</td>
                        <td style={{ padding:"10px 14px" }}><span style={{ background:actionColor[log.action]+"18", color:actionColor[log.action], borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:800 }}>{actionIcon[log.action]} {log.action}</span></td>
                        <td style={{ padding:"10px 14px", fontWeight:700 }}>{log.leadName}</td>
                        <td style={{ padding:"10px 14px", fontSize:12, color:"#475569" }}>{log.detail}</td>
                        <td style={{ padding:"10px 14px" }}><div style={{ display:"flex", alignItems:"center", gap:6 }}><Ava name={log.by||"?"} size={22}/><span style={{ fontSize:12 }}>{log.by}</span></div></td>
                      </tr>
                    );
                  })}
                  {auditLog.length===0&&<tr><td colSpan={5} style={{ padding:44, textAlign:"center", color:"#94a3b8", fontStyle:"italic" }}>No audit entries yet</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PIPELINE TAB ── */}
        {tab==="pipeline"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>🔁 Lead Pipeline</div>
              <div style={{ fontSize:13, color:"#64748b" }}>{filtered.length} leads · drag view</div>
            </div>
            <div style={{ overflowX:"auto", paddingBottom:8 }}>
              <div style={{ display:"flex", gap:12, minWidth:Math.max(900, ACTIVE_DISPS.length*180) }}>
                {ACTIVE_DISPS.map(disp=>{
                  const stageLeads = filtered.filter(l=>l.disposition===disp.label);
                  const stageVal = stageLeads.length;
                  return (
                    <div key={disp.label} style={{ flex:1, minWidth:180 }}>
                      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10, padding:"0 2px" }}>
                        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                          <div style={{ width:8, height:8, borderRadius:"50%", background:disp.color }}/>
                          <span style={{ fontSize:11, fontWeight:800, color:"#475569", letterSpacing:.3 }}>{disp.icon} {disp.label.toUpperCase()}</span>
                        </div>
                        <span style={{ background:disp.bg, color:disp.color, borderRadius:10, padding:"1px 8px", fontSize:11, fontWeight:700 }}>{stageVal}</span>
                      </div>
                      <div style={{ background:"#f1f5f9", borderRadius:12, padding:10, minHeight:120 }}>
                        {stageLeads.slice(0,10).map(l=>(
                          <div key={l.id} onClick={()=>setDetail(l)} style={{ background:"#fff", borderRadius:10, padding:"12px 14px", marginBottom:8, cursor:"pointer", border:"1px solid #e9ecf3", borderLeft:`3px solid ${disp.color}`, boxShadow:"0 1px 4px rgba(0,0,0,.05)", transition:"all .15s" }}
                            onMouseEnter={e=>{e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)";e.currentTarget.style.transform="translateY(-2px)";}}
                            onMouseLeave={e=>{e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,.05)";e.currentTarget.style.transform="none";}}>
                            <div style={{ fontWeight:700, fontSize:13, color:"#0f172a", marginBottom:3 }}>{l.leadName}</div>
                            <div style={{ fontSize:11, color:"#64748b", marginBottom:6 }}>{l.phone}</div>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                              <span style={{ fontSize:10, color:"#94a3b8" }}>{l.dateReceived}</span>
                              <Ava name={l.agent||"?"} size={20}/>
                            </div>
                            {l.callbackDate&&<div style={{ fontSize:10, color:disp.color, fontWeight:700, marginTop:4 }}>📅 {l.callbackDate}</div>}
                          </div>
                        ))}
                        {stageLeads.length>10&&<div style={{ textAlign:"center", fontSize:11, color:"#94a3b8", padding:8 }}>+{stageLeads.length-10} more</div>}
                        {stageLeads.length===0&&<div style={{ textAlign:"center", fontSize:11, color:"#cbd5e1", padding:16 }}>Empty</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ── CAMPAIGN PERFORMANCE TAB ── */}
        {tab==="campaigns"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>📣 Campaign Performance</div>
              <button onClick={()=>{
                // PDF export of campaign report
                const rows = [["Campaign","Ad Set","Total Leads","Interested","Converted","Conv Rate","No Answer","Not Interested"]];
                const camps={};
                leads.forEach(l=>{ const k=l.adCampaign||"Unknown"; if(!camps[k]) camps[k]={total:0,intr:0,conv:0,na:0,ni:0,sets:{}}; camps[k].total++; if(l.disposition==="Interested") camps[k].intr++; if(l.disposition==="Converted") camps[k].conv++; if(l.disposition==="No Answer") camps[k].na++; if(l.disposition==="Not Interested") camps[k].ni++; if(l.adSet){ if(!camps[k].sets[l.adSet]) camps[k].sets[l.adSet]=0; camps[k].sets[l.adSet]++; } });
                Object.entries(camps).forEach(([name,d])=>{ rows.push([name,Object.keys(d.sets).join(", "),d.total,d.intr,d.conv,`${d.total?((d.conv/d.total)*100).toFixed(0):0}%`,d.na,d.ni]); });
                const csv=rows.map(r=>r.map(v=>`"${v}"`).join(",")).join("\n");
                const blob=new Blob([csv],{type:"text/csv"});
                const url=URL.createObjectURL(blob);
                const a=document.createElement("a"); a.href=url; a.download=`campaign_report_${todayStr()}.csv`; a.click();
                URL.revokeObjectURL(url);
                showToast("✅ Campaign report exported!");
              }} style={{ padding:"8px 16px", borderRadius:8, border:"none", background:"#ecfdf5", color:"#059669", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>📤 Export CSV</button>
            </div>

            {(()=>{
              const camps={};
              leads.forEach(l=>{
                const k=l.adCampaign||"(No Campaign)";
                if(!camps[k]) camps[k]={name:k,total:0,intr:0,conv:0,na:0,ni:0,cb:0,sets:{}};
                camps[k].total++;
                if(l.disposition==="Interested")     camps[k].intr++;
                if(l.disposition==="Converted")      camps[k].conv++;
                if(l.disposition==="No Answer")      camps[k].na++;
                if(l.disposition==="Not Interested") camps[k].ni++;
                if(l.disposition==="Callback")       camps[k].cb++;
                if(l.adSet){ if(!camps[k].sets[l.adSet]) camps[k].sets[l.adSet]=0; camps[k].sets[l.adSet]++; }
              });
              const sorted=Object.values(camps).sort((a,b)=>b.conv-a.conv||b.total-a.total);
              const maxTotal=Math.max(...sorted.map(c=>c.total),1);

              return (
                <div>
                  {/* Summary cards */}
                  <div style={{ display:"flex", gap:10, marginBottom:20, flexWrap:"wrap" }}>
                    {[["📣",Object.keys(camps).length,"Campaigns","#6366f1"],["👥",leads.length,"Total Leads","#3b82f6"],["🏆",leads.filter(l=>l.disposition==="Converted").length,"Converted","#059669"],["📊",`${leads.length?((leads.filter(l=>l.disposition==="Converted").length/leads.length)*100).toFixed(1):0}%`,"Overall Rate","#10b981"]].map(([ico,val,lbl,c])=>(
                      <div key={lbl} style={{ background:"#fff", borderRadius:13, padding:"16px 20px", flex:1, minWidth:130, border:"1px solid #e9ecf3", position:"relative", overflow:"hidden" }}>
                        <div style={{ position:"absolute", top:0, left:0, width:3, height:"100%", background:c }}/>
                        <div style={{ fontSize:20, marginBottom:4 }}>{ico}</div>
                        <div style={{ fontSize:24, fontWeight:900, color:c, fontFamily:"'Sora',sans-serif" }}>{val}</div>
                        <div style={{ fontSize:11, color:"#94a3b8", fontWeight:700 }}>{lbl}</div>
                      </div>
                    ))}
                  </div>

                  {/* Campaign cards */}
                  <div style={{ display:"grid", gap:14 }}>
                    {sorted.map((c,i)=>{
                      const rate=c.total?((c.conv/c.total)*100).toFixed(1):0;
                      const hotRate=c.total?(((c.conv+c.intr)/c.total)*100).toFixed(0):0;
                      return (
                        <div key={c.name} style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
                          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
                            <div>
                              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:4 }}>
                                <span style={{ fontWeight:900, fontSize:16 }}>#{i+1}</span>
                                <span style={{ fontWeight:800, fontSize:16, color:"#0f172a" }}>{c.name}</span>
                                {c.conv>0&&<span style={{ background:"#d1fae5", color:"#059669", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:800 }}>🏆 Top Performer</span>}
                              </div>
                              <div style={{ fontSize:12, color:"#64748b" }}>Ad Sets: {Object.keys(c.sets).join(", ")||"—"}</div>
                            </div>
                            <div style={{ textAlign:"right" }}>
                              <div style={{ fontSize:28, fontWeight:900, color:Number(rate)>=20?"#059669":"#6366f1", fontFamily:"'Sora',sans-serif" }}>{rate}%</div>
                              <div style={{ fontSize:11, color:"#94a3b8" }}>Conv Rate</div>
                            </div>
                          </div>

                          {/* Metrics row */}
                          <div style={{ display:"grid", gridTemplateColumns:"repeat(6,1fr)", gap:8, marginBottom:16 }}>
                            {[["Total",c.total,"#6366f1"],["Converted",c.conv,"#059669"],["Interested",c.intr,"#10b981"],["Callback",c.cb,"#3b82f6"],["No Answer",c.na,"#8b5cf6"],["Not Int.",c.ni,"#ef4444"]].map(([lbl,val,color])=>(
                              <div key={lbl} style={{ background:"#f8f9ff", borderRadius:8, padding:"10px 6px", textAlign:"center" }}>
                                <div style={{ fontWeight:900, fontSize:20, color, fontFamily:"'Sora',sans-serif" }}>{val}</div>
                                <div style={{ fontSize:9, color:"#94a3b8", fontWeight:700 }}>{lbl.toUpperCase()}</div>
                              </div>
                            ))}
                          </div>

                          {/* Visual bars */}
                          <div style={{ marginBottom:8 }}>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                              <span style={{ fontSize:12, color:"#475569", fontWeight:600 }}>Lead Volume</span>
                              <span style={{ fontSize:12, color:"#1d4ed8", fontWeight:700 }}>{c.total} leads</span>
                            </div>
                            <div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden" }}>
                              <div style={{ height:"100%", width:`${(c.total/maxTotal)*100}%`, background:"linear-gradient(90deg,#6366f1,#3b82f6)", borderRadius:8 }}/>
                            </div>
                          </div>
                          <div>
                            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:4 }}>
                              <span style={{ fontSize:12, color:"#475569", fontWeight:600 }}>Hot Leads (Conv+Int)</span>
                              <span style={{ fontSize:12, color:"#059669", fontWeight:700 }}>{hotRate}%</span>
                            </div>
                            <div style={{ background:"#f1f5f9", borderRadius:8, height:10, overflow:"hidden", display:"flex" }}>
                              <div style={{ height:"100%", width:`${c.total?((c.conv/c.total)*100):0}%`, background:"#059669" }}/>
                              <div style={{ height:"100%", width:`${c.total?((c.intr/c.total)*100):0}%`, background:"#10b981" }}/>
                            </div>
                            <div style={{ display:"flex", gap:12, marginTop:4, fontSize:10 }}>
                              <span style={{ color:"#059669" }}>■ Converted {c.conv}</span>
                              <span style={{ color:"#10b981" }}>■ Interested {c.intr}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {sorted.length===0&&<div style={{ textAlign:"center", padding:48, color:"#94a3b8" }}><div style={{ fontSize:36, marginBottom:8 }}>📣</div><div style={{ fontWeight:600 }}>No campaign data yet</div></div>}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ── LIVE CALLS TAB ── */}
        {tab==="livecalls"&&(
          <div>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>📞 Live Call Monitor</div>
              <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, color: ngrokUrl?"#10b981":"#ef4444", fontWeight:700 }}>
                  <div style={{ width:8, height:8, borderRadius:"50%", background: ngrokUrl?"#10b981":"#ef4444", animation:"pulse 1.5s infinite" }}/>
                  {ngrokUrl ? "Bridge Connected" : "Bridge URL not set — go to Settings"}
                </div>
                <button onClick={async()=>{
                  if(!ngrokUrl){ showToast("Set Ngrok URL in Settings first","error"); return; }
                  try { const r=await fetch(`${ngrokUrl}/live-calls`); const d=await r.json(); const c=d?.data||d?.calls||d||[]; if(Array.isArray(c)) setLiveCalls(c); showToast("✅ Refreshed"); } catch(e){ showToast("Bridge offline","error"); }
                }} style={{ padding:"7px 14px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit" }}>🔄 Refresh</button>
              </div>
            </div>

            {/* Live call cards */}
            {liveCalls.length > 0 ? (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14, marginBottom:24 }}>
                {liveCalls.map((call,i)=>{
                  const started = call.start_time ? new Date(call.start_time) : null;
                  const secs = started ? Math.floor((Date.now()-started)/1000) : 0;
                  const dur = `${Math.floor(secs/60).toString().padStart(2,"0")}:${(secs%60).toString().padStart(2,"0")}`;
                  const isRinging = call.status==="ringing";
                  return (
                    <div key={i} style={{ background:"#fff", borderRadius:14, border:`2px solid ${isRinging?"#f59e0b":"#10b981"}`, padding:18 }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                          <div style={{ width:10, height:10, borderRadius:"50%", background:isRinging?"#f59e0b":"#10b981", animation:"pulse 1s infinite" }}/>
                          <span style={{ fontWeight:800, fontSize:13, color:isRinging?"#f59e0b":"#10b981" }}>{isRinging?"RINGING":"ON CALL"}</span>
                        </div>
                        {!isRinging&&<span style={{ fontWeight:900, fontSize:18, color:"#0f172a", fontFamily:"'Sora',sans-serif" }}>{dur}</span>}
                      </div>
                      <div style={{ display:"flex", gap:10, alignItems:"center", marginBottom:10 }}>
                        <Ava name={call.caller_name||call.ext||"?"} size={36}/>
                        <div>
                          <div style={{ fontWeight:700, fontSize:14 }}>{call.caller_name||`Ext ${call.ext||"?"}`}</div>
                          <div style={{ fontSize:12, color:"#64748b" }}>Ext: {call.ext||"—"}</div>
                        </div>
                      </div>
                      <div style={{ background:"#f8f9ff", borderRadius:8, padding:"8px 12px", marginBottom:10 }}>
                        <div style={{ fontSize:10, color:"#94a3b8", fontWeight:700 }}>CALLING</div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{call.callee||call.number||"Unknown"}</div>
                      </div>
                      {/* Find matching lead */}
                      {(()=>{
                        const matchLead = leads.find(l=>(l.phone||"").replace(/\D/g,"").slice(-9)===(call.callee||"").replace(/\D/g,"").slice(-9));
                        return matchLead ? (
                          <div style={{ background:"#ecfdf5", border:"1px solid #bbf7d0", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                            <div style={{ fontWeight:700, color:"#059669" }}>✅ Lead Match: {matchLead.leadName}</div>
                            <div style={{ color:"#64748b" }}>{matchLead.disposition}</div>
                          </div>
                        ) : (
                          <div style={{ background:"#fef3c7", border:"1px solid #fde68a", borderRadius:8, padding:"8px 12px", fontSize:12 }}>
                            <div style={{ fontWeight:700, color:"#92400e" }}>⚠️ No lead match found</div>
                            {isAdmin&&<button onClick={()=>{ window.__waPrefill={...EMPTY,phone:call.callee||"",whatsappNumber:call.callee||"",agent:call.caller_name||agentName}; setShowAdd(true); }} style={{ marginTop:6, padding:"4px 10px", borderRadius:6, border:"none", background:"#6366f1", color:"#fff", cursor:"pointer", fontWeight:700, fontSize:11, fontFamily:"inherit" }}>+ Create Lead</button>}
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign:"center", padding:60, color:"#94a3b8" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>📵</div>
                <div style={{ fontWeight:700, fontSize:16, marginBottom:4 }}>No active calls right now</div>
                <div style={{ fontSize:13 }}>When agents on extensions 500-599 are on calls, they'll appear here live</div>
              </div>
            )}

            {/* Recent call logs from Supabase */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:22 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:16, fontFamily:"'Sora',sans-serif" }}>📋 Recent Call History</div>
              <CallHistory leads={leads} supabase={supabase} ngrokUrl={ngrokUrl} isAdmin={isAdmin} agentName={agentName} EMPTY={EMPTY} setShowAdd={setShowAdd} showToast={showToast}/>
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab==="settings"&&isAdmin&&(
          <div style={{ maxWidth:700 }}>
            <div style={{ fontWeight:900, fontSize:20, color:"#0f172a", fontFamily:"'Sora',sans-serif", marginBottom:20 }}>⚙️ Settings</div>

            {/* Admin / Team Leader Management */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>👑 Admin & Team Leaders</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Team leaders have full admin access — they can add/edit/delete leads, assign agents, and see all data. Add their Gmail addresses below.</div>
              <AdminManager superAdmin={SUPER_ADMIN} showToast={showToast}/>
            </div>

            {/* Custom Dispositions */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>🎨 Custom Dispositions</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Add, rename or remove call outcome labels. Changes apply instantly across the whole system.</div>
              <CustomDispositions current={ACTIVE_DISPS} onChange={disps=>{ setCustomDisps(disps); localStorage.setItem("lf_disps",JSON.stringify(disps)); showToast("✅ Dispositions updated!"); }} onReset={()=>{ setCustomDisps(null); localStorage.removeItem("lf_disps"); showToast("✅ Reset to defaults"); }}/>
            </div>

            {/* Auto Lead Rotation */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
                <div style={{ fontWeight:800, fontSize:15, fontFamily:"'Sora',sans-serif" }}>🔄 {isArabic?"التوزيع التلقائي للعملاء":"Auto Lead Rotation"}</div>
                <div onClick={()=>{ const next=!rotationEnabled; setRotationEnabled(next); localStorage.setItem("lf_rotation",next?"1":"0"); showToast(next?"✅ Auto-rotation ON":"⭕ Auto-rotation OFF"); }}
                  style={{ width:44, height:24, borderRadius:12, background:rotationEnabled?"#10b981":"#e2e8f0", cursor:"pointer", position:"relative", transition:"background .2s" }}>
                  <div style={{ width:18, height:18, borderRadius:"50%", background:"#fff", position:"absolute", top:3, left:rotationEnabled?23:3, transition:"left .2s", boxShadow:"0 1px 4px rgba(0,0,0,.2)" }}/>
                </div>
              </div>
              <div style={{ fontSize:13, color:"#64748b" }}>
                {isArabic?"تلقائياً يوزع العملاء غير المعينين على الوكلاء كل 5 دقائق":"Automatically distributes unassigned leads to agents every 5 minutes in round-robin order"}
              </div>
              <div style={{ marginTop:10, fontSize:12, background:rotationEnabled?"#ecfdf5":"#f8fafc", borderRadius:8, padding:"8px 12px", color:rotationEnabled?"#059669":"#94a3b8", fontWeight:600 }}>
                {rotationEnabled?"🟢 Active — checking every 5 minutes":"⭕ Disabled"}
              </div>
            </div>

            {/* Language */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>🌐 {isArabic?"اللغة":"Language"}</div>
              <div style={{ display:"flex", gap:10 }}>
                {[["en","English 🇬🇧"],["ar","العربية 🇦🇪"]].map(([code,label])=>(
                  <button key={code} onClick={()=>{ setIsArabic(code==="ar"); localStorage.setItem("lf_lang",code); }} style={{ padding:"10px 24px", borderRadius:10, border:"none", cursor:"pointer", fontWeight:700, fontSize:14, fontFamily:"inherit", background:(code==="ar"&&isArabic)||(code==="en"&&!isArabic)?"linear-gradient(135deg,#6366f1,#3b82f6)":"#f1f5f9", color:(code==="ar"&&isArabic)||(code==="en"&&!isArabic)?"#fff":"#64748b" }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Yeastar Bridge URL */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>📞 Yeastar Bridge URL (Ngrok)</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Paste your current Ngrok URL here. Update this every time you restart Ngrok.</div>
              <div style={{ display:"flex", gap:10 }}>
                <input
                  value={ngrokUrl}
                  onChange={e=>setNgrokUrl(e.target.value)}
                  placeholder="https://xxxx.ngrok-free.dev"
                  style={{ flex:1, border:"1.5px solid #e2e8f0", borderRadius:8, padding:"10px 14px", fontSize:14, fontFamily:"inherit", outline:"none" }}
                />
                <button onClick={async()=>{
                  localStorage.setItem("lf_ngrok", ngrokUrl);
                  try {
                    const r = await fetch(`${ngrokUrl}/health`);
                    const d = await r.json();
                    showToast(`✅ Connected! ${d.status}`);
                  } catch(e){ showToast("⚠️ Could not reach bridge — check URL","error"); }
                }} style={{ padding:"10px 20px", borderRadius:8, border:"none", background:"#0f2744", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>
                  Save & Test
                </button>
              </div>
              {ngrokUrl && (
                <div style={{ marginTop:12, display:"flex", gap:8, flexWrap:"wrap" }}>
                  <a href={`${ngrokUrl}/health`} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#1d4ed8", fontWeight:700 }}>🔗 Health Check</a>
                  <a href={`${ngrokUrl}/extensions`} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#1d4ed8", fontWeight:700 }}>🔗 Extensions</a>
                  <a href={`${ngrokUrl}/live-calls`} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#1d4ed8", fontWeight:700 }}>🔗 Live Calls</a>
                  <a href={`${ngrokUrl}/cdr`} target="_blank" rel="noreferrer" style={{ fontSize:12, color:"#1d4ed8", fontWeight:700 }}>🔗 CDR</a>
                </div>
              )}
            </div>

            {/* Yeastar Webhook reminder */}
            <div style={{ background:"#fffbeb", border:"1px solid #fde68a", borderRadius:14, padding:22, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:8, fontFamily:"'Sora',sans-serif" }}>⚠️ Remember — Update Yeastar Too!</div>
              <div style={{ fontSize:13, color:"#78350f", marginBottom:10 }}>Every time Ngrok URL changes, you must also update it in your Yeastar P570 panel:</div>
              <div style={{ fontSize:13, color:"#0f172a", fontWeight:600 }}>
                Yeastar Panel → Integrations → API → Webhook Event Push → URL:
              </div>
              <div style={{ background:"#fff", borderRadius:8, padding:"10px 14px", marginTop:8, fontFamily:"monospace", fontSize:13, color:"#1d4ed8", wordBreak:"break-all" }}>
                {ngrokUrl ? `${ngrokUrl}/yeastar-webhook` : "https://YOUR-NGROK-URL/yeastar-webhook"}
              </div>
            </div>

            {/* Extension to Agent mapping */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24, marginBottom:16 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>🔢 Agent Extension Mapping</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:16 }}>Link each agent's extension number so call logs show their name automatically.</div>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead><tr style={{ borderBottom:"1px solid #f1f5f9" }}>
                  {["Agent","Email","Extension"].map(h=><th key={h} style={{ padding:"8px 10px", textAlign:"left", fontSize:11, fontWeight:800, color:"#94a3b8" }}>{h}</th>)}
                </tr></thead>
                <tbody>
                  {agents.filter(a=>a.role!=="admin").map(a=>(
                    <tr key={a.id} style={{ borderBottom:"1px solid #f8f9fc" }}>
                      <td style={{ padding:"10px 10px" }}><div style={{ display:"flex", alignItems:"center", gap:8 }}><Ava name={a.full_name} size={26}/><span style={{ fontWeight:700 }}>{a.full_name}</span></div></td>
                      <td style={{ padding:"10px 10px", color:"#64748b", fontSize:12 }}>{a.email}</td>
                      <td style={{ padding:"10px 10px" }}>
                        <input
                          defaultValue={a.extension||""}
                          placeholder="e.g. 501"
                          onBlur={async e=>{
                            const ext = e.target.value.trim();
                            await supabase.from("agents").update({extension:ext}).eq("id",a.id);
                            setAgents(ls=>ls.map(x=>x.id===a.id?{...x,extension:ext}:x));
                            showToast(`✅ Extension ${ext} assigned to ${a.full_name}`);
                          }}
                          style={{ width:100, border:"1.5px solid #e2e8f0", borderRadius:6, padding:"6px 10px", fontSize:13, fontFamily:"inherit", outline:"none" }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Google Sheet settings */}
            <div style={{ background:"#fff", borderRadius:14, border:"1px solid #e9ecf3", padding:24 }}>
              <div style={{ fontWeight:800, fontSize:15, marginBottom:4, fontFamily:"'Sora',sans-serif" }}>📊 Google Sheet</div>
              <div style={{ fontSize:13, color:"#64748b", marginBottom:10 }}>Currently syncing from:</div>
              <a href={`https://docs.google.com/spreadsheets/d/${SHEET_ID}`} target="_blank" rel="noreferrer"
                style={{ display:"inline-flex", alignItems:"center", gap:6, background:"#e8f5e9", color:"#2e7d32", borderRadius:8, padding:"8px 16px", textDecoration:"none", fontWeight:700, fontSize:13 }}>
                📊 Open Google Sheet
              </a>
            </div>
          </div>
        )}
      </div>

      <Modal show={showImport} onClose={()=>setShowImport(false)} width={660}>
        <ImportCSV onClose={()=>setShowImport(false)} onImport={async rows=>{
          let added=0;
          for(const row of rows){
            const {error}=await supabase.from("leads").insert(toDb({...EMPTY,...row,agent:row.agent||agentName}));
            if(!error) added++;
          }
          setShowImport(false);
          const {data}=await supabase.from("leads").select("*").order("created_at",{ascending:false});
          setLeads((data||[]).map(fromDb));
          showToast(`✅ Imported ${added} leads!`);
          logAudit("IMPORT",`${added} leads`,`Bulk import by ${agentName}`);
        }} EMPTY={EMPTY}/>
      </Modal>

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
            <button onClick={()=>{setDispLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#eff6ff", color:"#1d4ed8", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Update Status</button>
            {(isAdmin||detail?.agent===agentName)&&<button onClick={()=>{setEditLead(detail);setDetail(null);}} style={{ padding:"9px 15px", borderRadius:8, border:"none", background:"#0f172a", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit" }}>Edit Lead</button>}
          </div>
        </div>)}
      </Modal>
      <Modal show={!!delLead} onClose={()=>setDelLead(null)} width={380}>
        {delLead&&(<div style={{ padding:32, textAlign:"center" }}><div style={{ fontSize:42, marginBottom:12 }}>🗑️</div><div style={{ fontWeight:900, fontSize:17, marginBottom:8 }}>Delete this lead?</div><div style={{ color:"#64748b", marginBottom:22, fontSize:14 }}>Permanently remove <strong>{delLead.leadName}</strong>?</div><div style={{ display:"flex", gap:10, justifyContent:"center" }}><button onClick={()=>setDelLead(null)} style={{ padding:"9px 22px", borderRadius:8, border:"1.5px solid #e2e8f0", background:"#fff", cursor:"pointer", fontWeight:700, fontSize:13, fontFamily:"inherit", color:"#64748b" }}>Cancel</button><button onClick={()=>del(delLead.id)} disabled={saving} style={{ padding:"9px 22px", borderRadius:8, border:"none", background:"#ef4444", color:"#fff", cursor:"pointer", fontWeight:800, fontSize:13, fontFamily:"inherit", opacity:saving?0.7:1 }}>{saving?"Deleting…":"Delete"}</button></div></div>)}
      </Modal>
      {toast&&<Toast msg={toast.msg} type={toast.type}/>}
        </div>
        </div>
      </div>
  );
}

// Wrap with error boundary so we can see crashes
const AppWithBoundary = () => <ErrorBoundary><App/></ErrorBoundary>;
export default AppWithBoundary;
