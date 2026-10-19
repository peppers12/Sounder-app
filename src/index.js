import { DATA } from './schedule.js';
const encoder = new TextEncoder();
const json = (v, status=200, extra={}) => new Response(JSON.stringify(v), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...extra}});
const hex = b => Array.from(new Uint8Array(b), x=>x.toString(16).padStart(2,'0')).join('');
const unhex = s => Uint8Array.from(s.match(/../g)||[], x=>parseInt(x,16));
export const digest = async s => hex(await crypto.subtle.digest('SHA-256',encoder.encode(s)));
export async function passwordHash(password,salt,pepper){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password+pepper),'PBKDF2',false,['deriveBits']);
 return hex(await crypto.subtle.deriveBits({name:'PBKDF2',salt:unhex(salt),iterations:100000,hash:'SHA-256'},key,256));
}
const random = () => hex(crypto.getRandomValues(new Uint8Array(32)));
async function equal(a,b){
 // Verify MACs through Web Crypto rather than JavaScript string comparison.
 const key=await crypto.subtle.importKey('raw',encoder.encode('sounder-constant-time-compare'),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
 const mac=await crypto.subtle.sign('HMAC',key,encoder.encode(a));
 return crypto.subtle.verify('HMAC',key,mac,encoder.encode(b));
}
const cookieName=role=>'__Host-sounder_'+role;
const cookie=(role,token,age=28800)=>`${cookieName(role)}=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${age}`;
function tokenFor(req,role){return (req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName(role)+'='))?.split('=')[1]||''}
async function session(req,env,role){
 const token=tokenFor(req,role);if(!/^[a-f0-9]{64}$/.test(token))return false;
 if(role==='viewer')return !!await env.DB.prepare("SELECT s.token_hash FROM sounder_sessions s JOIN sounder_viewer_accounts a ON a.username='adminview' AND a.version=s.account_version WHERE s.token_hash=? AND s.role='viewer' AND s.expires>?").bind(await digest(token),Date.now()).first();
 return !!await env.DB.prepare('SELECT s.token_hash FROM sounder_sessions s JOIN sounder_accounts a ON a.role=s.role AND a.version=s.account_version WHERE s.token_hash=? AND s.role=? AND s.expires>?').bind(await digest(token),role,Date.now()).first();
}
async function rate(env,key,max,seconds){
 const now=Date.now();
 const r=await env.DB.prepare('INSERT INTO sounder_limits(key,count,expires) VALUES(?,1,?) ON CONFLICT(key) DO UPDATE SET count=CASE WHEN expires<? THEN 1 ELSE count+1 END, expires=CASE WHEN expires<? THEN excluded.expires ELSE expires END RETURNING count').bind(key,now+seconds*1000,now,now).first();
 return r.count<=max;
}
async function readBody(req){
 if(!req.headers.get('content-type')?.startsWith('application/json'))throw new ClientError('JSON required',415);
 const reader=req.body?.getReader();if(!reader)throw new ClientError('Body required',400);
 let size=0;const chunks=[];
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();throw new ClientError('Report too large',413)}chunks.push(value)}
 const bytes=new Uint8Array(size);let p=0;for(const c of chunks){bytes.set(c,p);p+=c.length}
 try {const b=JSON.parse(new TextDecoder().decode(bytes));if(!b||typeof b!=='object'||Array.isArray(b))throw Error();return b} catch {throw new ClientError('Invalid JSON',400)}
}
class ClientError extends Error{constructor(message,status=400){super(message);this.status=status}}
const text=(v,n=200)=>{if(v==null)return '';if(typeof v!=='string'||v.length>n||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(v))throw new ClientError('Invalid text field');return v};
const number=v=>{const n=Number(v??0);if(!Number.isInteger(n)||n<0||n>100000)throw new ClientError('Invalid passenger count');return n};
const time=v=>{if(v==null||v==='')return null;if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(v))throw new ClientError('Invalid time');return v};
const list=(v,max=30)=>{if(v==null)return [];if(!Array.isArray(v)||v.length>max)throw new ClientError('Invalid report list');return v};
const object=v=>{if(v==null)return {};if(typeof v!=='object'||Array.isArray(v))throw new ClientError('Invalid report object');return v};
export function validateReport(b){
 const line=Object.values(DATA).find(x=>x.label===b.lineLabel);
 const train=line?.trains[b.train];
 if(!train||!line.assignments[b.assignment]?.includes(b.train)||b.direction!==train.direction)throw new ClientError('Invalid line, assignment or train');
 const crew=object(b.crewInfo), sign=object(b.crewSignoff);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(crew.reportDate)||Number.isNaN(Date.parse(crew.reportDate+'T00:00:00Z'))||new Date(crew.reportDate+'T00:00:00Z').toISOString().slice(0,10)!==crew.reportDate)throw new ClientError('Report date required');
 const crewInfo={reportDate:crew.reportDate};
 for(const k of ['conductor','engineer','reliefConductor','reliefEngineer','studentConductor','studentEngineer'])crewInfo[k]=text(crew[k]);
 for(const k of ['onDuty','offDuty'])crewInfo[k]=time(crew[k]);
 const crewSignoff={};for(const k of ['engineer','conductor','reliefEngineer','reliefConductor'])crewSignoff[k]=text(sign[k]);
 const stops=list(b.actuals);if(stops.length!==train.stops.length)throw new ClientError('Station list does not match train');
 const actuals=stops.map((s,i)=>{if(s.station!==train.stops[i][0]||s.scheduled!==train.stops[i][1])throw new ClientError('Station schedule does not match train');return {station:s.station,scheduled:s.scheduled,actual:time(s.actual)}});
 const station=s=>{if(!train.stops.some(x=>x[0]===s))throw new ClientError('Invalid station');return s};
 return {lineLabel:line.label,assignment:b.assignment,train:b.train,direction:train.direction,actuals,bikes:number(b.bikes),ada:number(b.ada),passengers:number(b.passengers),crewInfo,
 passengerActivity:list(b.passengerActivity).map(s=>({station:station(s.station),on:number(s.on),off:number(s.off)})),
 delays:list(b.delays).map(s=>({station:station(s.station),minutes:number(s.minutes),reason:text(s.reason,2000),scheduled:s.scheduled==='--'?'--':time(s.scheduled),actual:time(s.actual)})),
 customerServiceIssues:text(b.customerServiceIssues,8000),mechanicalIssues:list(b.mechanicalIssues).map(m=>({carEngine:text(m.carEngine),description:text(m.description,4000)})),consistInfo:text(b.consistInfo,2000),doorOverrideCompleted:b.doorOverrideCompleted===true,doorOverrideInitials:text(b.doorOverrideInitials,100),crewSignoff};
}
function mapReport(r){for(const k of ['actuals','crew_info','passenger_activity','delays','mechanical_issues','crew_signoff']){try{r[k]=JSON.parse(r[k])}catch{r[k]=k.endsWith('info')||k.endsWith('signoff')?{}:[]}}r.door_override_completed=!!r.door_override_completed;return r}
async function handle(req,env){
 const url=new URL(req.url),path=url.pathname;
 if(req.method!=='GET'&&req.method!=='HEAD'){
  if(req.headers.get('origin')!==url.origin||req.headers.get('sec-fetch-site')==='cross-site')return json({error:'Invalid origin'},403);
 }
 if(path==='/api/health'){
  await env.DB.prepare('SELECT 1 FROM sounder_accounts LIMIT 1').first();
  return json({ok:true,service:'sounder',version:'2026-10-migration',email:env.EMAIL_ENABLED==='true'?'enabled':'disabled'});
 }
 const login=path.match(/^\/api\/(employee|admin)\/(login|session|logout)$/);
 if(login){
  const [,role,action]=login;
  if(action==='session'&&req.method==='GET'){
   const access=await session(req,env,role)?role:role==='admin'&&await session(req,env,'viewer')?'viewer':null;
   return json({ok:!!access,role:access,canEdit:access==='admin'});
  }
  if(req.method!=='POST')return json({error:'Method not allowed'},405);
  if(action==='logout'){
   await env.DB.prepare('DELETE FROM sounder_sessions WHERE token_hash=?').bind(await digest(tokenFor(req,role))).run();
   const response=json({ok:true},200,{'set-cookie':cookie(role,'',0)});
   if(role==='admin'){
    await env.DB.prepare('DELETE FROM sounder_sessions WHERE token_hash=?').bind(await digest(tokenFor(req,'viewer'))).run();
    response.headers.append('set-cookie',cookie('viewer','',0));
   }
   return response;
  }
  const ip=req.headers.get('cf-connecting-ip')||'local';
  if(!await rate(env,'login:'+role+':'+ip,10,900))return json({error:'Too many attempts. Try in 15 minutes.'},429,{'retry-after':'900'});
  if(!env.AUTH_PEPPER)return json({error:'Login not configured'},503);
  const b=await readBody(req),username=text(b.username,100),password=text(b.password,256);
  let a=await env.DB.prepare('SELECT * FROM sounder_accounts WHERE role=?').bind(role).first(),access=role;
  if(role==='admin'&&username!==a?.username){
   a=await env.DB.prepare('SELECT * FROM sounder_viewer_accounts WHERE username=?').bind(username).first();access='viewer';
  }
  const hash=await passwordHash(password,a?.salt||'00'.repeat(32),access==='viewer'?'':env.AUTH_PEPPER);
  if(!a||!await equal(hash,a.password_hash)||username!==a.username)return json({error:'Invalid credentials'},401);
  if(role==='admin')for(const oldRole of ['admin','viewer'])await env.DB.prepare('DELETE FROM sounder_sessions WHERE token_hash=?').bind(await digest(tokenFor(req,oldRole))).run();
  const token=random();await env.DB.prepare('INSERT INTO sounder_sessions(token_hash,role,account_version,expires) VALUES(?,?,?,?)').bind(await digest(token),access,a.version,Date.now()+28800000).run();
  const response=json({ok:true,role:access,canEdit:access==='admin'},200,{'set-cookie':cookie(access,token)});
  if(role==='admin')response.headers.append('set-cookie',cookie(access==='admin'?'viewer':'admin','',0));
  return response;
 }
 if(path==='/api/setup'&&req.method==='POST'){
  if(!await rate(env,'setup:'+(req.headers.get('cf-connecting-ip')||'local'),10,900))return json({error:'Too many attempts'},429);
  const b=await readBody(req),hash=await digest(text(b.token,100));
  const entry=await env.DB.prepare('SELECT * FROM sounder_setup WHERE token_hash=? AND used=0 AND expires>?').bind(hash,Date.now()).first();
  if(!entry||!env.AUTH_PEPPER)return json({error:'Setup link invalid or expired'},403);
  if(b.admin?.password===b.employee?.password)throw new ClientError('Use different passwords for administrator and crew accounts');
  const accounts=[];
  for(const role of ['admin','employee']){
   const a=object(b[role]),username=text(a.username,100).trim(),password=text(a.password,256);
   if(!/^[a-zA-Z0-9._@-]{3,100}$/.test(username)||password.length<16)throw new ClientError('Use a username of 3+ characters and a password of 16+ characters');
   const salt=random();accounts.push({role,username,salt,hash:await passwordHash(password,salt,env.AUTH_PEPPER)});
  }
  // Claim exactly once before updating credentials; concurrent requests cannot both win.
  const claim=await env.DB.prepare('UPDATE sounder_setup SET used=1 WHERE token_hash=? AND used=0 AND expires>? RETURNING token_hash').bind(hash,Date.now()).first();
  if(!claim)return json({error:'Setup link already used'},409);
  try{
   await env.DB.batch([...accounts.map(a=>env.DB.prepare('INSERT INTO sounder_accounts(role,username,salt,password_hash) VALUES(?,?,?,?) ON CONFLICT(role) DO UPDATE SET username=excluded.username,salt=excluded.salt,password_hash=excluded.password_hash,version=version+1').bind(a.role,a.username,a.salt,a.hash)),env.DB.prepare('DELETE FROM sounder_sessions')]);
  }catch(e){await env.DB.prepare('UPDATE sounder_setup SET used=0 WHERE token_hash=?').bind(hash).run();throw e}
  return json({ok:true});
 }
 if(path==='/api/admin/reports'&&req.method==='GET'){
  if(!await session(req,env,'admin')&&!await session(req,env,'viewer'))return json({error:'Administrator login required'},401);
  const limit=Math.min(500,Math.max(1,parseInt(url.searchParams.get('limit'))||250));
  const before=url.searchParams.get('before')||'9999';
  const r=await env.DB.prepare("SELECT * FROM demo_trip_reports WHERE report_date>=date('now','-90 days') AND id<? ORDER BY id DESC LIMIT ?").bind(before,limit+1).all();
  const more=r.results.length>limit,rows=r.results.slice(0,limit);
  return json({reports:rows.map(mapReport),nextCursor:more?rows.at(-1).id:null});
 }
 const editPath=path.match(/^\/api\/admin\/reports\/([^/]+)$/);
 if(editPath&&req.method==='PATCH'){
  if(await session(req,env,'viewer')&&!await session(req,env,'admin'))return json({error:'View-only accounts cannot edit reports'},403);
  if(!await session(req,env,'admin'))return json({error:'Administrator login required'},401);
  if(!await rate(env,'admin-edit:'+await digest(tokenFor(req,'admin')),60,3600))return json({error:'Edit rate limit reached'},429);
  const id=decodeURIComponent(editPath[1]),b=await readBody(req);
  if(!Number.isInteger(b.revision)||b.revision<0)throw new ClientError('Report version required');
  const reason=text(b.reason,500).trim();if(!reason)throw new ClientError('Enter a reason for the correction');
  const previous=await env.DB.prepare('SELECT * FROM demo_trip_reports WHERE id=?').bind(id).first();
  if(!previous)return json({error:'Report not found'},404);
  if(previous.revision!==b.revision)return json({error:'This report changed. Close the editor and refresh before editing again.'},409);
  const r=validateReport(object(b.report));
  if(r.lineLabel!==previous.line_label||r.assignment!==previous.assignment||r.train!==previous.train||r.direction!==previous.direction||r.crewInfo.reportDate!==previous.report_date)throw new ClientError('Keep the original line, assignment, train and report date');
  const administrator=await env.DB.prepare("SELECT username FROM sounder_accounts WHERE role='admin'").first();
  const editId=crypto.randomUUID(),editedAt=new Date().toISOString();
  const values=[JSON.stringify(r.actuals),r.bikes,r.ada,r.passengers,JSON.stringify(r.crewInfo),JSON.stringify(r.passengerActivity),JSON.stringify(r.delays),r.customerServiceIssues,JSON.stringify(r.mechanicalIssues),r.consistInfo,Number(r.doorOverrideCompleted),r.doorOverrideInitials,JSON.stringify(r.crewSignoff),editedAt,id,b.revision];
  const result=await env.DB.batch([
   env.DB.prepare('INSERT INTO sounder_report_edits(id,report_id,revision,administrator,reason,before_json,after_json,edited_at) SELECT ?,?,?,?,?,?,?,? WHERE EXISTS(SELECT 1 FROM demo_trip_reports WHERE id=? AND revision=?)').bind(editId,id,b.revision+1,administrator.username,reason,JSON.stringify(previous),JSON.stringify(r),editedAt,id,b.revision),
   env.DB.prepare('UPDATE demo_trip_reports SET actuals=?,bikes=?,ada=?,passengers=?,crew_info=?,passenger_activity=?,delays=?,customer_service_issues=?,mechanical_issues=?,consist_info=?,door_override_completed=?,door_override_initials=?,crew_signoff=?,updated_at=?,revision=revision+1 WHERE id=? AND revision=?').bind(...values),
   env.DB.prepare('UPDATE sounder_daily_reports SET passengers=(SELECT COALESCE(SUM(t.passengers),0) FROM json_each(sounder_daily_reports.report_ids) j JOIN demo_trip_reports t ON t.id=j.value) WHERE EXISTS(SELECT 1 FROM json_each(sounder_daily_reports.report_ids) WHERE value=?) AND EXISTS(SELECT 1 FROM sounder_report_edits WHERE id=?)').bind(id,editId)
  ]);
  if(result[1].meta.changes!==1)return json({error:'This report changed. Close the editor and refresh before editing again.'},409);
  const saved=await env.DB.prepare('SELECT * FROM demo_trip_reports WHERE id=?').bind(id).first();
  return json({ok:true,report:mapReport(saved)});
 }
 if(path==='/api/employee/daily-report'&&req.method==='POST'){
  if(!await session(req,env,'employee'))return json({error:'Employee login required'},401);
  if(env.SUBMISSIONS_ENABLED!=='true')return json({error:'Submissions disabled'},503);
  const b=await readBody(req),ids=list(b.reportIds,10).map(x=>text(x,100));
  const line=Object.values(DATA).find(x=>x.label===b.lineLabel),trains=line?.assignments[b.assignment];
  if(!trains||ids.length!==trains.length||new Set(ids).size!==ids.length)throw new ClientError('Save every train before submitting the daily report');
  const rows=await env.DB.prepare(`SELECT id,train,line_label,assignment,report_date,passengers FROM demo_trip_reports WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids).all();
  if(rows.results.length!==trains.length||new Set(rows.results.map(r=>r.train)).size!==trains.length||rows.results.some(r=>r.line_label!==b.lineLabel||r.assignment!==b.assignment||r.report_date!==b.reportDate||!trains.includes(r.train)))throw new ClientError('Daily report must contain all assignment trains for the same date');
  const id=await digest(ids.slice().sort().join('|'));
  await env.DB.batch([
   env.DB.prepare('INSERT OR IGNORE INTO sounder_daily_reports(id,line_label,assignment,report_date,report_ids,passengers) VALUES(?,?,?,?,?,?)').bind(id,b.lineLabel,b.assignment,b.reportDate,JSON.stringify(ids),rows.results.reduce((n,r)=>n+r.passengers,0)),
   env.DB.prepare(`UPDATE demo_trip_reports SET status='submitted' WHERE id IN (${ids.map(()=>'?').join(',')})`).bind(...ids)
  ]);
  return json({ok:true,id});
 }
 if(path==='/api/send-demo-report'&&req.method==='POST'){
  if(!await session(req,env,'employee'))return json({error:'Employee login required'},401);
  if(env.SUBMISSIONS_ENABLED!=='true')return json({error:'Submissions disabled'},503);
  const b=await readBody(req),r=validateReport(b),id=text(b.submissionId,100);
  if(!/^[a-f0-9-]{36}$/.test(id))throw new ClientError('Submission identifier required');
  const hash=await digest(JSON.stringify(r));
  const existing=await env.DB.prepare('SELECT * FROM sounder_receipts WHERE id=?').bind(id).first();
  if(existing){if(existing.body_hash!==hash)return json({error:'Submission identifier already used'},409);return json({ok:true,id:existing.report_id,duplicate:true,email:'disabled'})}
  if(!await rate(env,'submit:'+await digest(tokenFor(req,'employee')),120,3600))return json({error:'Submission rate limit reached'},429);
  const reportId=new Date().toISOString()+'_'+crypto.randomUUID();
  const values=[reportId,r.lineLabel,r.assignment,r.train,r.direction,JSON.stringify(r.actuals),r.bikes,r.ada,r.passengers,'saved',r.crewInfo.reportDate,new Date().toISOString(),JSON.stringify(r.crewInfo),JSON.stringify(r.passengerActivity),JSON.stringify(r.delays),r.customerServiceIssues,JSON.stringify(r.mechanicalIssues),r.consistInfo,Number(r.doorOverrideCompleted),r.doorOverrideInitials,JSON.stringify(r.crewSignoff)];
  const columns='id,line_label,assignment,train,direction,actuals,bikes,ada,passengers,status,report_date,saved_at,crew_info,passenger_activity,delays,customer_service_issues,mechanical_issues,consist_info,door_override_completed,door_override_initials,crew_signoff';
  try{await env.DB.batch([
   env.DB.prepare('INSERT INTO sounder_receipts(id,body_hash,report_id) VALUES(?,?,?)').bind(id,hash,reportId),
   env.DB.prepare(`INSERT INTO demo_trip_reports(${columns}) VALUES(${values.map(()=>'?').join(',')})`).bind(...values),
   env.DB.prepare("INSERT INTO sounder_email_outbox(report_id,state) VALUES(?,'disabled')").bind(reportId)
  ])}catch(e){const retry=await env.DB.prepare('SELECT * FROM sounder_receipts WHERE id=?').bind(id).first();if(retry?.body_hash===hash)return json({ok:true,id:retry.report_id,duplicate:true,email:'disabled'});throw e}
  return json({ok:true,id:reportId,email:'disabled'},201);
 }
 if(path.startsWith('/api/'))return json({error:'Not found'},404);
 if(!['GET','HEAD'].includes(req.method))return json({error:'Method not allowed'},405);
 if((path==='/'||path==='/index.html')&&!await session(req,env,'employee'))return Response.redirect(new URL('/login.html',url),302);
 const assetPath=path==='/admin'||path==='/admin/'?'/admin.html':path==='/'?'/index.html':path;
 return env.ASSETS.fetch(new Request(new URL(assetPath,url),req));
}
export default {async fetch(req,env){
 let response;
 try{response=await handle(req,env)}catch(e){if(e instanceof ClientError)response=json({error:e.message},e.status);else {console.error(JSON.stringify({event:'request_failed',path:new URL(req.url).pathname,error:e?.name||'Error'}));response=json({error:'Service temporarily unavailable. Retry safely using the same report.'},503)}}
 const headers=new Headers(response.headers);
 for(const [key,value] of Object.entries({'x-content-type-options':'nosniff','referrer-policy':'no-referrer','x-frame-options':'DENY','strict-transport-security':'max-age=31536000','permissions-policy':'camera=(), microphone=(), geolocation=()','content-security-policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'"}))headers.set(key,value);
 if((headers.get('content-type')||'').includes('text/html'))headers.set('cache-control','no-store');
 return new Response(req.method==='HEAD'?null:response.body,{status:response.status,headers});
}};
