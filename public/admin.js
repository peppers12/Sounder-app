const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
let reports=[];
let activeTab="today";
const SESSION_STORAGE_KEY="sounderAdminDemoSession";
function sessionToken(){return window.SounderDemoAuth?.getDemoSession()||""}
function showLogin(){document.querySelector("#loginScreen").classList.remove("hidden");document.querySelector("#adminApp").classList.add("hidden")}
function showAdmin(){document.querySelector("#loginScreen").classList.add("hidden");document.querySelector("#adminApp").classList.remove("hidden")}

function mins(t){
  if(!t||t==="--")return null;
  const [h,m]=String(t).split(":").map(Number);
  if(Number.isNaN(h)||Number.isNaN(m))return null;
  return h*60+m;
}
function delayOf(stop){
  const s=mins(stop.scheduled),a=mins(stop.actual);
  if(s==null||a==null)return null;
  let d=a-s;if(d<-720)d+=1440;if(d>720)d-=1440;return d;
}
function maxDelay(r){
  const ds=(r.actuals||[]).map(delayOf).filter(x=>x!=null);
  return ds.length?Math.max(...ds):0;
}
function fmtDate(v){
  if(!v)return "—";
  const d=new Date(String(v).slice(0,10)+"T12:00:00");
  return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});
}
function fmtTimeStamp(v){
  if(!v)return "—";
  return new Date(v).toLocaleString(undefined,{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});
}
function todayKey(){
  const d=new Date(), y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return y+"-"+m+"-"+day;
}
function normalizeDate(v){return String(v||"").slice(0,10)}
function filtered(base){
  const line=$("#lineFilter").value, ass=$("#assignmentFilter").value, date=$("#dateFilter").value;
  return base.filter(r=>(!line||r.line_label===line)&&(!ass||r.assignment===ass)&&(!date||normalizeDate(r.report_date)===date));
}
function refreshAssignments(){
  const current=$("#assignmentFilter").value;
  const vals=[...new Set(reports.map(r=>r.assignment))].sort();
  $("#assignmentFilter").innerHTML='<option value="">All Assignments</option>'+vals.map(v=>'<option>'+escapeHtml(v)+'</option>').join("");
  if(vals.includes(current))$("#assignmentFilter").value=current;
}
function renderStats(){
  const todays=reports.filter(r=>normalizeDate(r.report_date)===todayKey());
  const passenger=todays.reduce((n,r)=>n+(Number(r.passengers)||0),0);
  const delayed=todays.filter(r=>maxDelay(r)>=6).length;
  const assignments=new Set(todays.map(r=>r.line_label+"|"+r.assignment)).size;
  $("#stats").innerHTML=[
    ["Trains Saved Today",todays.length,"crew reports received"],
    ["Passengers Today",passenger.toLocaleString(),"reported riders"],
    ["6+ Min Delays",delayed,delayed?"requires review":"none reported"],
    ["Assignments Active",assignments,"North & South combined"]
  ].map(x=>'<div class="stat"><span>'+x[0]+'</span><strong>'+x[1]+'</strong><small>'+x[2]+'</small></div>').join("");
}
function card(raw,isHistory=false){
  const r=displayReport(raw);
  const d=maxDelay(r), late=d>=6;
  return '<div class="report-card" data-id="'+r.id+'">'+
    '<div><span class="status-badge"><span class="dot '+(isHistory?"old":late?"delay":"")+'"></span>'+(isHistory?"Archived":late?"Delayed":"Saved")+'</span></div>'+
    '<div class="train-main"><strong>Train '+r.train+'</strong><span>'+r.line_label+' · Assignment '+r.assignment+'</span></div>'+
    '<div class="metric"><span>Passengers</span><strong>'+Number(r.passengers||0).toLocaleString()+'</strong></div>'+
    '<div class="metric hide-mobile"><span>Bikes / ADA</span><strong>'+Number(r.bikes||0)+' / '+Number(r.ada||0)+'</strong></div>'+
    '<div class="metric optional"><span>Delay</span><strong class="delay-text '+(late?"late":"")+'">'+(d>0?"+"+d+" min":d<0?d+" min":"On time")+'</strong></div>'+
    '<div class="metric optional"><span>'+(isHistory?"Date":"Saved")+'</span><strong>'+(isHistory?fmtDate(r.report_date):fmtTimeStamp(r.saved_at))+'</strong></div>'+
  '</div>';
}
function wireCards(){
  $$(".report-card").forEach(el=>el.addEventListener("click",()=>openDetail(el.dataset.id)));
}
function renderToday(){
  let list=filtered(reports.filter(r=>normalizeDate(r.report_date)===todayKey()));
  $("#reportList").innerHTML=list.length?list.map(r=>card(r,false)).join(""):'<div class="empty">No demo train reports saved today yet. Save a train in the Crew View and refresh this page.</div>';
  wireCards();
}
function renderHistory(){
  let list=filtered(reports.filter(r=>normalizeDate(r.report_date)!==todayKey()));
  $("#historyList").innerHTML=list.length?list.map(r=>card(r,true)).join(""):'<div class="empty">No previous-day demo reports match these filters.</div>';
  wireCards();
}
function renderReports(){
  const list=filtered(reports);
  const pax=list.reduce((n,r)=>n+(Number(r.passengers)||0),0);
  const bikes=list.reduce((n,r)=>n+(Number(r.bikes)||0),0);
  const ada=list.reduce((n,r)=>n+(Number(r.ada)||0),0);
  const delayed=list.filter(r=>maxDelay(r)>=6).length;
  const avg=list.length?Math.round(pax/list.length):0;
  $("#summaryGrid").innerHTML=[
    ["Passenger Total",pax.toLocaleString()],
    ["Average / Train",avg.toLocaleString()],
    ["6+ Min Delays",delayed],
    ["Bikes",bikes],
    ["ADA",ada],
    ["Reports",list.length]
  ].map(x=>'<div class="summary-card"><span>'+x[0]+'</span><strong>'+x[1]+'</strong></div>').join("");
  const top=[...list].sort((a,b)=>b.passengers-a.passengers).slice(0,10);
  const max=Math.max(...top.map(r=>Number(r.passengers)||0),1);
  $("#bars").innerHTML=top.length?top.map(r=>'<div class="bar-row"><strong>'+escapeHtml(r.train)+'</strong><div class="bar-track"><div class="bar" style="width:'+((Number(r.passengers)||0)/max*100)+'%"></div></div><span>'+Number(r.passengers||0)+'</span></div>').join(""):'<div class="empty">No report data available.</div>';
}
function render(){
  renderStats();renderToday();renderHistory();renderReports();
}
function openDetail(id){
  const raw=reports.find(x=>String(x.id)===String(id));if(!raw)return;
  const r=displayReport(raw);
  window.dispatchEvent(new CustomEvent("sounder-report-reviewed",{detail:{id:String(id)}}));
  const d=maxDelay(r);
  const crew=r.crew_info||{}, sign=r.crew_signoff||{};
  const rows=(r.actuals||[]).map(s=>{
    const x=delayOf(s), late=x>=6;
    return '<tr class="'+(late?"late-row":"")+'"><td>'+s.station+'</td><td>'+s.scheduled+'</td><td>'+(s.actual||"—")+'</td><td>'+(x==null?"—":x>0?"+"+x:x)+'</td></tr>';
  }).join("");
  const paxRows=(r.passenger_activity||[]).map(s=>'<tr><td>'+s.station+'</td><td>'+Number(s.on||0)+'</td><td>'+Number(s.off||0)+'</td></tr>').join("");
  const delayRows=(r.delays||[]).map(x=>'<tr><td>'+x.station+'</td><td>+'+Number(x.minutes||0)+'</td><td>'+(x.reason||"—")+'</td></tr>').join("");
  const mech=(r.mechanical_issues||[]).map(x=>'<div class="detail-cell"><span>Mechanical '+(x.carEngine||"")+'</span><strong>'+(x.description||"—")+'</strong></div>').join("");
  $("#drawerBody").innerHTML='<div class="detail-head"><div class="eyebrow dark">'+r.line_label.toUpperCase()+'</div><h2>Train '+r.train+'</h2><div>'+r.direction+'</div></div>'+
    '<div class="detail-grid">'+
      '<div class="detail-cell"><span>Assignment</span><strong>'+r.assignment+'</strong></div>'+
      '<div class="detail-cell"><span>Report Date</span><strong>'+fmtDate(r.report_date)+'</strong></div>'+
      '<div class="detail-cell"><span>Conductor</span><strong>'+(crew.conductor||"—")+'</strong></div>'+
      '<div class="detail-cell"><span>Engineer</span><strong>'+(crew.engineer||"—")+'</strong></div>'+
      ['reliefConductor','reliefEngineer','studentConductor','studentEngineer'].filter(k=>crew[k]).map(k=>'<div class="detail-cell"><span>'+k.replace(/([A-Z])/g,' $1')+'</span><strong>'+crew[k]+'</strong></div>').join('')+
      '<div class="detail-cell"><span>On / Off Duty</span><strong>'+(crew.onDuty||"—")+' / '+(crew.offDuty||"—")+'</strong></div>'+
      '<div class="detail-cell"><span>Consist</span><strong>'+(r.consist_info||"—")+'</strong></div>'+
      '<div class="detail-cell"><span>Passengers</span><strong>'+r.passengers+'</strong></div>'+
      '<div class="detail-cell"><span>Max Delay</span><strong class="'+(d>=6?"delay-text late":"delay-text")+'">'+(d>=6?"+"+d+" min":"No recordable delay")+'</strong></div>'+
      '<div class="detail-cell"><span>Bikes</span><strong>'+r.bikes+'</strong></div>'+
      '<div class="detail-cell"><span>ADA</span><strong>'+r.ada+'</strong></div>'+
      '<div class="detail-cell"><span>Door Override Test</span><strong>'+(r.door_override_completed?"Completed":"Not marked")+(r.door_override_initials?" · "+r.door_override_initials:"")+'</strong></div>'+
      '<div class="detail-cell"><span>Crew Signoff</span><strong>'+([sign.engineer,sign.conductor,sign.reliefEngineer,sign.reliefConductor].filter(Boolean).join(" / ")||"—")+'</strong></div>'+
      mech+
    '</div>'+
    '<h3>Station Times</h3><table class="station-table"><thead><tr><th>Station</th><th>Scheduled</th><th>Actual</th><th>Delay</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    (paxRows?'<h3>Passenger Activity</h3><table class="station-table"><thead><tr><th>Station</th><th>On</th><th>Off</th></tr></thead><tbody>'+paxRows+'</tbody></table>':"")+
    (delayRows?'<h3>Recordable Delays (6+ min)</h3><table class="station-table"><thead><tr><th>Station</th><th>Minutes</th><th>Reason</th></tr></thead><tbody>'+delayRows+'</tbody></table>':"")+
    (r.customer_service_issues?'<h3>Customer Service Issues</h3><p>'+r.customer_service_issues+'</p>':"")+
    '<p style="font-size:11px;color:#798b9d;margin-top:18px">Demo record saved '+fmtTimeStamp(r.saved_at)+'. Records shown here are limited to the rolling 90-day window.</p>';
  $("#drawer").classList.remove("hidden");
}
async function load(){
  $("#refreshBtn").textContent="Loading…";
  try{
    if(!await window.sounderAdminReady)return;
    const loaded=[];let cursor=null;
    do {
      const res=await fetch('/api/admin/reports?limit=500'+(cursor?'&before='+encodeURIComponent(cursor):''));
      if(res.status===401){showLogin();throw Error('Session expired')}
      if(!res.ok)throw Error('Unable to retrieve reports');
      const data=await res.json();loaded.push(...data.reports);cursor=data.nextCursor;
    }while(cursor);
    reports=loaded.sort((a,b)=>String(b.saved_at).localeCompare(String(a.saved_at)));
    refreshAssignments();render();
  }catch(e){
    $("#reportList").innerHTML='<div class="empty">Unable to load demo reports.</div>';
  }finally{$("#refreshBtn").textContent="Refresh"}
}
$$(".tab").forEach(btn=>btn.addEventListener("click",()=>{
  activeTab=btn.dataset.tab;
  $$(".tab").forEach(x=>x.classList.toggle("active",x===btn));
  ["today","history","reports"].forEach(t=>$("#"+t+"View").classList.toggle("hidden",t!==activeTab));
}));
["lineFilter","assignmentFilter","dateFilter"].forEach(id=>$("#"+id).addEventListener("change",render));
$("#refreshBtn").addEventListener("click",load);
$("#drawerClose").addEventListener("click",()=>$("#drawer").classList.add("hidden"));
$("#drawer").addEventListener("click",e=>{if(e.target.id==="drawer")$("#drawer").classList.add("hidden")});
load();
function escapeHtml(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function displayReport(v){if(typeof v==='string')return escapeHtml(v);if(Array.isArray(v))return v.map(displayReport);if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,displayReport(x)]));return v}
