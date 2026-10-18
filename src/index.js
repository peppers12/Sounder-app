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

async function employeeToken(env) {
 const payload=btoa(JSON.stringify({role:'employee',exp:Date.now()+8*3600000})).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
 return payload+'.'+Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
}
async function employeeSession(req,env){
 if(!env.ADMIN_SESSION_SECRET)return false;
 const cookie=req.headers.get('cookie')||'';
 const token=cookie.match(/(?:^|;\s*)sounder_employee=([^;]+)/)?.[1]||'';
 const [payload,sig]=token.split('.');if(!payload||!sig||!/^[0-9a-f]{64}$/.test(sig))return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.ADMIN_SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
 const expected=Array.from(new Uint8Array(mac),b=>b.toString(16).padStart(2,'0')).join('');
 let diff=0;for(let i=0;i<64;i++)diff|=sig.charCodeAt(i)^expected.charCodeAt(i);
 if(diff)return false;
 try{const data=JSON.parse(atob(payload.replace(/-/g,'+').replace(/_/g,'/')));return data.role==='employee'&&data.exp>Date.now()}catch{return false}
}
function sameOrigin(req){const o=req.headers.get('origin');return !o||o===new URL(req.url).origin}

export default {async fetch(req,env){
 const url=new URL(req.url),path=url.pathname;
 if((path==='/'||path==='/index.html') && !await employeeSession(req,env))return Response.redirect(new URL('/login.html',url),302);
 if(path==='/admin' || path==='/admin/') return env.ASSETS.fetch(new Request(new URL('/admin.html',url),req));
 if(path.startsWith('/api/')){
  if(!env.DB)return json({error:'Database not configured'},503,corsHeaders);
  if(path==='/api/employee/login' && req.method==='POST'){
   if(!sameOrigin(req))return json({error:'Invalid origin'},403);
   if(!env.EMPLOYEE_USERNAME||!env.EMPLOYEE_PASSWORD||!env.ADMIN_SESSION_SECRET)return json({error:'Employee login not configured'},503);
   const b=await parse(req);
   if(!b||b.username!==env.EMPLOYEE_USERNAME||b.password!==env.EMPLOYEE_PASSWORD)return json({error:'Invalid credentials'},401);
   return json({ok:true},200,{'set-cookie':'sounder_employee='+await employeeToken(env)+'; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800'});
  }
  if(path==='/api/employee/session' && req.method==='GET')return json({ok:await employeeSession(req,env)});
  if(path==='/api/employee/logout' && req.method==='POST')return json({ok:true},200,{'set-cookie':'sounder_employee=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0'});

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
   const result=await env.DB.prepare("SELECT * FROM demo_trip_reports WHERE report_date >= date('now','-90 days') ORDER BY saved_at DESC LIMIT ?").bind(limit).all();
   return json({reports:result.results.map(mapReport)},200,corsHeaders);
  }
  if(path==='/api/send-demo-report' && req.method==='POST'){
   if(!sameOrigin(req)||!await employeeSession(req,env))return json({error:'Employee login required'},401);
   // Keep submissions disabled until abuse controls, deployment tests and email delivery are approved.
   return json({ok:false,error:'Submissions not yet enabled during migration testing'},503,corsHeaders);
  }
  return json({error:'Not found'},404,corsHeaders);
 }
 return env.ASSETS.fetch(req);
}};
