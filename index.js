const json = (value, status=200, extra={}) => new Response(JSON.stringify(value), {status, headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const parse = async req => { try {return await req.json()} catch {return null} };
const clean = (v, n=200) => String(v??'').slice(0,n);
const obj = v => v && typeof v==='object' && !Array.isArray(v) ? v : {};
const arr = v => Array.isArray(v) ? v.slice(0,150) : [];
const isJson = v => typeof v === 'string' ? v : JSON.stringify(v);
const keys = ['actuals','crew_info','passenger_activity','delays','mechanical_issues','crew_signoff'];
const mapReport = r => {const x={...r};for(const k of keys){try{x[k]=JSON.parse(x[k])}catch{x[k]=null}}x.door_override_completed=!!x.door_override_completed;return x};
const corsHeaders = {'x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
async function session(req, env){
  const token=req.headers.get('x-demo-session')||req.headers.get('authorization')?.replace(/^Bearer\s+/i,'')||'';
  if(!token || !env.ADMIN_SESSION_SECRET) return false;
  const [payload,sig]=token.split('.');if(!payload||!sig)return false;
  const mac=await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(payload));
  const expected=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
  if(sig.length!==expected.length || ![...sig].every((c,i)=>c===expected[i]))return false;
  try{const data=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));return data.exp>Date.now() && data.role==='admin'}catch{return false}
}
async function issueToken(env){const payload=btoa(JSON.stringify({role:'admin',exp:Date.now()+8*3600000})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');const mac=await crypto.subtle.sign('HMAC',await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']),new TextEncoder().encode(payload));return payload+'.'+Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('')}
export default {async fetch(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(path.startsWith('/api/')){
  if(!env.DB)return json({error:'Database not configured'},503,corsHeaders);
  if(path==='/api/admin/login' && req.method==='POST'){
   const b=await parse(req);if(!b)return json({error:'Invalid JSON'},400,corsHeaders);
   if(!env.ADMIN_USERNAME||!env.ADMIN_PASSWORD||!env.ADMIN_SESSION_SECRET)return json({error:'Admin login not configured'},503,corsHeaders);
   if(b.username!==env.ADMIN_USERNAME||b.password!==env.ADMIN_PASSWORD)return json({ok:false,error:'Invalid credentials'},401,corsHeaders);
   return json({ok:true,token:await issueToken(env)},200,corsHeaders);
  }
  if(path==='/api/admin/session' && req.method==='GET')return json({ok:await session(req,env)},200,corsHeaders);
  if(path==='/api/admin/reports' && req.method==='GET'){
   if(!await session(req,env))return json({error:'Login required'},401,corsHeaders);
   const limit=Math.min(1000,Math.max(1,Number(url.searchParams.get('limit'))||250));
   const result=await env.DB.prepare("SELECT * FROM trip_reports WHERE report_date >= date('now','-90 days') ORDER BY saved_at DESC LIMIT ?").bind(limit).all();
   return json({reports:result.results.map(mapReport)},200,corsHeaders);
  }
  if(path==='/api/send-demo-report' && req.method==='POST'){
   // Deliberately disabled until authenticated employee access, abuse controls, and email delivery are configured.
   return json({ok:false,error:'Report submissions disabled pending employee authentication and email configuration'},503,corsHeaders);
  }
  return json({error:'Not found'},404,corsHeaders);
 }
 return env.ASSETS.fetch(req);
}};
