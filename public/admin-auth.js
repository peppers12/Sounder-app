let adminAuthenticated=false;
localStorage.removeItem('sounderAdminDemoSession');
window.SounderDemoAuth={getDemoSession:()=>adminAuthenticated?'cookie-session':''};
window.sounderAdminReady=(async()=>{
 try{const r=await fetch('/api/admin/session');const d=await r.json();adminAuthenticated=r.ok&&d.ok===true}catch{adminAuthenticated=false}
 return adminAuthenticated;
})();
document.addEventListener('DOMContentLoaded',async()=>{
 const form=document.querySelector('#loginForm'),error=document.querySelector('#loginError'),button=document.querySelector('#loginBtn');
 if(await window.sounderAdminReady){document.querySelector('#loginScreen').classList.add('hidden');document.querySelector('#adminApp').classList.remove('hidden')}
 form.addEventListener('submit',async e=>{
  e.preventDefault();button.disabled=true;error.classList.add('hidden');
  try{
   const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:document.querySelector('#username').value,password:document.querySelector('#password').value})});
   const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Unable to sign in');location.reload();
  }catch(e){error.textContent=e.message;error.classList.remove('hidden')}finally{button.disabled=false}
 });
 document.querySelector('#logoutBtn').addEventListener('click',async()=>{await fetch('/api/admin/logout',{method:'POST'});adminAuthenticated=false;location.reload()});
});
