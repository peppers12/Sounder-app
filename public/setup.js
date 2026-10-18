const setupToken=location.hash.slice(1);history.replaceState(null,'',location.pathname);
document.querySelector('#setupForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=document.querySelector('#setupButton'),message=document.querySelector('#setupMessage');button.disabled=true;
 try{
  const r=await fetch('/api/setup',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({token:setupToken,admin:{username:document.querySelector('#adminUsername').value,password:document.querySelector('#adminPassword').value},employee:{username:document.querySelector('#crewUsername').value,password:document.querySelector('#crewPassword').value}})});
  const d=await r.json();if(!r.ok)throw Error(d.error||'Setup failed');
  document.querySelector('#setupForm').replaceChildren();message.textContent='Logins saved. This link is now used. Open /admin for the administrator dashboard or / for crew reporting.';document.querySelector('.login-card').append(message);
 }catch(e){message.textContent=e.message;button.disabled=false}
});
