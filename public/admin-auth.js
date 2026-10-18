const DEMO_SESSION_KEY="sounderAdminDemoSession";

function getDemoSession(){ return localStorage.getItem(DEMO_SESSION_KEY)||""; }
function setDemoSession(v){ localStorage.setItem(DEMO_SESSION_KEY,v); }
function clearDemoSession(){ localStorage.removeItem(DEMO_SESSION_KEY); }

async function demoAdminLogin(username,password){
  const res=await fetch((window.__HATCHABLE__?.api||"/api")+"/admin/login",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({username,password})
  });
  const data=await res.json();
  if(!res.ok||!data.token) throw new Error("Invalid demo login");
  setDemoSession(data.token);
  return true;
}

window.SounderDemoAuth={getDemoSession,setDemoSession,clearDemoSession,demoAdminLogin};

const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init={}){
  const url=typeof input==="string"?input:(input&&input.url)||"";
  if(url.includes("/admin/reports")){
    const headers=new Headers(init.headers||{});
    const token=getDemoSession();
    if(token) headers.set("x-demo-session",token);
    init={...init,headers};
  }
  return nativeFetch(input,init);
};

document.addEventListener("DOMContentLoaded",()=>{
  const loginScreen=document.querySelector("#loginScreen");
  const adminApp=document.querySelector("#adminApp");
  const form=document.querySelector("#loginForm");
  const error=document.querySelector("#loginError");
  const button=document.querySelector("#loginBtn");
  const logout=document.querySelector("#logoutBtn");

  function showLocked(){
    loginScreen?.classList.remove("hidden");
    adminApp?.classList.add("hidden");
  }
  function showDashboard(){
    loginScreen?.classList.add("hidden");
    adminApp?.classList.remove("hidden");
  }

  if(getDemoSession()) showDashboard(); else showLocked();

  form?.addEventListener("submit",async e=>{
    e.preventDefault();
    error?.classList.add("hidden");
    if(button){button.disabled=true;button.textContent="Signing In…";}
    try{
      await demoAdminLogin(
        document.querySelector("#username").value,
        document.querySelector("#password").value
      );
      location.reload();
    }catch(err){
      error?.classList.remove("hidden");
    }finally{
      if(button){button.disabled=false;button.textContent="Sign In";}
    }
  });

  logout?.addEventListener("click",()=>{
    clearDemoSession();
    location.reload();
  });
});