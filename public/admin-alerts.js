(()=>{
const KNOWN_KEY="sounderAdminKnownReports";
const UNREAD_KEY="sounderAdminUnreadReports";
let known=new Set(JSON.parse(localStorage.getItem(KNOWN_KEY)||"[]"));
let unread=new Set(JSON.parse(localStorage.getItem(UNREAD_KEY)||"[]"));
let initialized=localStorage.getItem(KNOWN_KEY)!==null;
let polling=false;

function session(){return window.SounderDemoAuth?.getDemoSession?.()||""}
function saveSets(){
  localStorage.setItem(KNOWN_KEY,JSON.stringify([...known].slice(-1000)));
  localStorage.setItem(UNREAD_KEY,JSON.stringify([...unread].slice(-200)));
}
async function setBadge(){
  const n=unread.size;
  const el=document.querySelector("#newReportBadge");
  if(el){el.textContent=String(n);el.classList.toggle("hidden",n===0)}
  try{
    if("setAppBadge" in navigator){
      if(n) await navigator.setAppBadge(n); else if("clearAppBadge" in navigator) await navigator.clearAppBadge();
    }
  }catch{}
}
function toast(report){
  const el=document.querySelector("#adminToast"); if(!el)return;
  el.innerHTML="<strong>New Train Report</strong><span>Train "+escapeHtml(report.train)+" · Assignment "+escapeHtml(report.assignment)+" · "+Number(report.passengers||0)+" passengers</span>";
  el.classList.remove("hidden");
  clearTimeout(window.__sounderToastTimer);
  window.__sounderToastTimer=setTimeout(()=>el.classList.add("hidden"),7000);
}
async function notify(report){
  if(!("Notification" in window)||Notification.permission!=="granted")return;
  try{
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification("New Sounder Train Report",{
      body:"Train "+escapeHtml(report.train)+" · Assignment "+escapeHtml(report.assignment)+" · "+Number(report.passengers||0)+" passengers",
      tag:"sounder-report-"+report.id,
      data:{url:"/admin.html"}
    });
  }catch{}
}
async function check(){
  if(polling||!session()||document.querySelector("#adminApp")?.classList.contains("hidden"))return;
  polling=true;
  try{
    const res=await fetch((window.__HATCHABLE__?.api||"/api")+"/admin/reports?limit=500",{headers:{"x-demo-session":session()}});
    if(!res.ok)return;
    const data=await res.json();
    const list=Array.isArray(data.reports)?data.reports:[];
    if(!initialized){
      list.forEach(r=>known.add(String(r.id)));
      initialized=true; saveSets(); await setBadge(); return;
    }
    const fresh=list.filter(r=>!known.has(String(r.id)));
    if(fresh.length){
      fresh.forEach(r=>{known.add(String(r.id));unread.add(String(r.id))});
      saveSets(); await setBadge();
      toast(fresh[0]); await notify(fresh[0]);
      document.querySelector("#refreshBtn")?.click();
    }
  }finally{polling=false}
}
window.addEventListener("sounder-report-reviewed",e=>{
  unread.delete(String(e.detail?.id||""));saveSets();setBadge();
});
document.addEventListener("click",e=>{
  const card=e.target.closest?.(".report-card");
  if(card?.dataset?.id){unread.delete(String(card.dataset.id));saveSets();setBadge();}
});
document.addEventListener("DOMContentLoaded",async()=>{
  if("serviceWorker" in navigator){try{await navigator.serviceWorker.register("/admin-sw.js")}catch{}}
  document.querySelector("#enableAlertsBtn")?.addEventListener("click",async()=>{
    if(!("Notification" in window))return;
    const p=await Notification.requestPermission();
    document.querySelector("#enableAlertsBtn").textContent=p==="granted"?"Alerts On":"Alerts Blocked";
  });
  if("Notification" in window&&Notification.permission==="granted"){
    const b=document.querySelector("#enableAlertsBtn"); if(b)b.textContent="Alerts On";
  }
  await setBadge();
  setInterval(check,10000);
  setTimeout(check,1800);
});
})();