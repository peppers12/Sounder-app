const DATA = {
  north: {
    label: "Sounder North",
    assignments: {
      "6501": ["1701","1700"],
      "6502": ["1703","1702"],
      "6503": ["1705","1704"],
      "6504": ["1707","1706"]
    },
    trains: {
      "1701": { direction:"Everett → Seattle", stops:[["Everett","06:15"],["Mukilteo","06:26"],["Edmonds","06:41"],["Seattle","07:14"]] },
      "1703": { direction:"Everett → Seattle", stops:[["Everett","06:45"],["Mukilteo","06:56"],["Edmonds","07:11"],["Seattle","07:44"]] },
      "1705": { direction:"Everett → Seattle", stops:[["Everett","07:15"],["Mukilteo","07:26"],["Edmonds","07:41"],["Seattle","08:14"]] },
      "1707": { direction:"Everett → Seattle", stops:[["Everett","07:45"],["Mukilteo","07:56"],["Edmonds","08:11"],["Seattle","08:44"]] },
      "1700": { direction:"Seattle → Everett", stops:[["Seattle","15:45"],["Edmonds","16:12"],["Mukilteo","16:27"],["Everett","16:44"]] },
      "1702": { direction:"Seattle → Everett", stops:[["Seattle","16:30"],["Edmonds","16:57"],["Mukilteo","17:12"],["Everett","17:29"]] },
      "1704": { direction:"Seattle → Everett", stops:[["Seattle","17:15"],["Edmonds","17:42"],["Mukilteo","17:57"],["Everett","18:14"]] },
      "1706": { direction:"Seattle → Everett", stops:[["Seattle","17:45"],["Edmonds","18:12"],["Mukilteo","18:27"],["Everett","18:44"]] }
    }
  },
  south: {
    label: "Sounder South",
    assignments: {
      "6501": ["1500","1501","1514","1515"],
      "6502": ["1502","1503","1516","1517"],
      "6503": ["1504","1507","1520","1521"],
      "6504": ["1506","1509","1522","1523"],
      "6505": ["1508","1519"],
      "6506": ["1510","1505","1518","1511"],
      "6507": ["1512","1513","1524","1525"]
    },
    trains: {}
  }
};

const northboundStations=["Lakewood","South Tacoma","Tacoma Dome","Puyallup","Sumner","Auburn","Kent","Tukwila","Seattle"];
const southboundStations=[...northboundStations].reverse();
const nb = {
 "1500":["04:36","04:41","04:50","05:03","05:08","05:18","05:25","05:32","05:52"],
 "1502":["05:01","05:06","05:15","05:28","05:33","05:43","05:50","05:57","06:17"],
 "1504":["05:26","05:31","05:40","05:53","05:58","06:08","06:15","06:22","06:42"],
 "1506":["05:46","05:51","06:00","06:13","06:18","06:28","06:35","06:42","07:02"],
 "1508":["06:06","06:11","06:20","06:33","06:38","06:48","06:55","07:02","07:22"],
 "1510":["06:26","06:31","06:40","06:53","06:58","07:08","07:15","07:22","07:42"],
 "1512":["06:46","06:51","07:00","07:13","07:18","07:28","07:35","07:42","08:02"],
 "1514":["--","--","07:20","07:33","07:38","07:48","07:55","08:02","08:22"],
 "1516":["--","--","07:50","08:03","08:08","08:18","08:25","08:32","08:52"],
 "1518":["10:11","10:16","10:25","10:38","10:43","10:53","11:00","11:07","11:27"],
 "1520":["15:52","15:57","16:06","16:19","16:24","16:34","16:41","16:48","17:08"],
 "1522":["--","--","16:30","16:43","16:48","16:58","17:05","17:12","17:32"],
 "1524":["--","--","17:15","17:28","17:33","17:43","17:50","17:57","18:17"]
};
const sb = {
 "1501":["06:05","06:18","06:25","06:32","06:42","06:47","07:07","--","--"],
 "1503":["06:35","06:48","06:55","07:02","07:12","07:17","07:37","--","--"],
 "1505":["07:55","08:08","08:15","08:22","08:32","08:37","08:50","08:59","09:11"],
 "1507":["14:25","14:38","14:45","14:52","15:02","15:07","15:20","15:29","15:41"],
 "1509":["15:15","15:28","15:35","15:42","15:52","15:57","16:17","--","--"],
 "1511":["15:35","15:48","15:55","16:02","16:12","16:17","16:30","16:39","16:51"],
 "1513":["15:55","16:08","16:15","16:22","16:32","16:37","16:57","--","--"],
 "1515":["16:15","16:28","16:35","16:42","16:52","16:57","17:10","17:19","17:31"],
 "1517":["16:35","16:48","16:55","17:02","17:12","17:17","17:30","17:39","17:51"],
 "1519":["16:55","17:08","17:15","17:22","17:32","17:37","17:50","17:59","18:11"],
 "1521":["17:20","17:33","17:40","17:47","17:57","18:02","18:15","18:24","18:36"],
 "1523":["17:45","17:58","18:05","18:12","18:22","18:27","18:40","18:49","19:01"],
 "1525":["18:30","18:43","18:50","18:57","19:07","19:12","19:25","19:34","19:46"]
};
Object.entries(nb).forEach(([train,times])=>{
  DATA.south.trains[train]={direction:"Lakewood → Seattle",stops:northboundStations.map((s,i)=>[s,times[i]])};
});
Object.entries(sb).forEach(([train,times])=>{
  DATA.south.trains[train]={direction:"Seattle → Lakewood",stops:southboundStations.map((s,i)=>[s,times[i]])};
});

const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={line:"north",assignment:"6501",train:"1701",completed:{}};
const DUTY_TIMES={
  north:{
    "6501":{on:"05:15",off:"17:34"},
    "6502":{on:"05:45",off:"18:02"},
    "6503":{on:"06:15",off:"18:44"},
    "6504":{on:"06:45",off:"19:10"}
  },
  south:{
    "6501":{on:"03:36",off:"18:01"},
    "6502":{on:"04:01",off:"18:21"},
    "6503":{on:"04:26",off:"19:06"},
    "6504":{on:"04:46",off:"19:31"},
    "6505":{on:"05:06",off:"18:41"},
    "6506":{on:"05:26",off:"17:21"},
    "6507":{on:"05:46",off:"20:16"}
  }
};
function applyDutyTimes(){
  const duty=DUTY_TIMES[state.line]?.[state.assignment];
  if(!duty)return;
  $("#onDuty").value=duty.on;
  $("#offDuty").value=duty.off;
}

function currentLine(){return DATA[state.line]}
function currentTrain(){return currentLine().trains[state.train]}
function assignmentRuns(){return currentLine().assignments[state.assignment]||[]}

function populateAssignments(){
  const sel=$("#assignmentSelect");
  sel.innerHTML=Object.keys(currentLine().assignments).map(a=>`<option value="${a}">${a}</option>`).join("");
  if(!currentLine().assignments[state.assignment]) state.assignment=Object.keys(currentLine().assignments)[0];
  sel.value=state.assignment;
}
function populateTrains(){
  const runs=assignmentRuns();
  if(!runs.includes(state.train)) state.train=runs[0];
  $("#trainSelect").innerHTML=runs.map(t=>`<option value="${t}">${t}</option>`).join("");
  $("#trainSelect").value=state.train;
}
function minutes(t){
  if(!t||t==="--") return null;
  const [h,m]=t.split(":").map(Number); return h*60+m;
}
function diffMinutes(actual,scheduled){
  const a=minutes(actual),s=minutes(scheduled);
  if(a==null||s==null)return null;
  let d=a-s;
  if(d < -720) d+=1440;
  if(d > 720) d-=1440;
  return d;
}
function renderStations(){
  const tr=currentTrain();
  $("#trainHeading").textContent=`Train ${state.train}`;
  $("#routeSummary").innerHTML=`<strong>${currentLine().label} · Assignment ${state.assignment}</strong><br>${state.train} — ${tr.direction}`;
  let html=`<div class="station-row station-head"><div>Station</div><div>Scheduled</div><div>Actual</div><div>Status</div></div>`;
  tr.stops.forEach(([name,scheduled],i)=>{
    const unavailable=scheduled==="--";
    html+=`<div class="station-row" data-index="${i}">
      <div class="station-name">${name}</div>
      <div class="scheduled">${scheduled}</div>
      <div class="actual-wrap">${unavailable?'<span class="muted">No stop</span>':`<input class="actual-time" type="time" value="${scheduled}" aria-label="${name} actual time">`}</div>
      <div class="status">${unavailable?'—':'On Time'}</div>
    </div>`;
  });
  $("#stationList").innerHTML=html;
  $$(".actual-time").forEach(el=>el.addEventListener("input",renderDelaysAndStatuses));
  renderPassengerActivity();
  renderDelaysAndStatuses();
}
function renderPassengerActivity(){
  const tr=currentTrain();
  $("#passengerActivity").innerHTML='<div class="passenger-row head"><div>Station</div><div>On</div><div>Off</div></div>'+
    tr.stops.map(([name,scheduled],i)=>{
      const disabled=scheduled==="--";
      return '<div class="passenger-row" data-passenger-index="'+i+'"><div><strong>'+name+'</strong></div><div>'+(disabled?'—':'<input class="pass-on" inputmode="numeric" value="0" aria-label="'+name+' passengers on">')+'</div><div>'+(disabled?'—':'<input class="pass-off" inputmode="numeric" value="0" aria-label="'+name+' passengers off">')+'</div></div>';
    }).join("");
}
function renderDelaysAndStatuses(){
  const tr=currentTrain();
  const delays=[];
  $$(".station-row[data-index]").forEach(row=>{
    const i=Number(row.dataset.index), scheduled=tr.stops[i][1];
    if(scheduled==="--") return;
    const actual=row.querySelector(".actual-time").value;
    const d=diffMinutes(actual,scheduled);
    const status=row.querySelector(".status");
    if(d===0){status.textContent="On Time";status.classList.remove("late")}
    else if(d>0){status.textContent=`+${d}`;status.classList.toggle("late",d>=6)}
    else {status.textContent=`${d}`;status.classList.remove("late")}
    if(d>=6) delays.push({station:tr.stops[i][0],scheduled,actual,d});
  });
  $("#delayList").innerHTML=delays.map(x=>`<div class="delay-item" data-station="${x.station}" data-minutes="${x.d}" data-scheduled="${x.scheduled}" data-actual="${x.actual}">
    <div><strong>${x.station}</strong><span class="muted">Scheduled ${x.scheduled}</span></div>
    <div><strong>+${x.d} min</strong><span class="muted">Actual ${x.actual}</span></div>
    <select aria-label="Delay reason for ${x.station}"><option value="">Select delay reason…</option><option>Signal</option><option>Passenger loading</option><option>Mechanical</option><option>Train traffic</option><option>Weather</option><option>Other</option></select>
  </div>`).join("");
}
function renderProgress(){
  const runs=assignmentRuns();
  const done=runs.filter(t=>{const r=state.completed[`${state.line}:${state.assignment}:${t}`];return r?.receiptId&&r.crewInfo?.reportDate===value("reportDate")});
  const pct=Math.round((done.length/runs.length)*100);
  $("#progressTitle").textContent=`Assignment ${state.assignment}`;
  $("#progressText").textContent=`${done.length} of ${runs.length} trains completed`;
  $("#progressPill").textContent=`${pct}%`;
  $("#progressBar").style.width=`${pct}%`;
  $("#completedTrips").innerHTML=done.map(t=>{
    const x=state.completed[`${state.line}:${state.assignment}:${t}`];
    return `<div class="completed-trip"><span>✓ Train ${t}</span><strong>${Number(x.passengers)||0} passengers</strong></div>`;
  }).join("");
  $("#submitBtn").disabled=done.length!==runs.length;
}
function resetCounters(){
  ["bikes","ada","passengers"].forEach(id=>$("#"+id).value="0");
}
function value(id){return $("#"+id)?.value?.trim?.()||""}
function collectPassengerActivity(){
  return $$(".passenger-row[data-passenger-index]").map(row=>({
    station:row.querySelector("strong")?.textContent||"",
    on:Number(row.querySelector(".pass-on")?.value)||0,
    off:Number(row.querySelector(".pass-off")?.value)||0
  }));
}
function collectDelays(){
  return $$(".delay-item").map(row=>({
    station:row.dataset.station||"",
    minutes:Number(row.dataset.minutes)||0,
    scheduled:row.dataset.scheduled||"",
    actual:row.dataset.actual||"",
    reason:row.querySelector("select")?.value||""
  }));
}
function collectMechanical(){
  return $$(".mechanical-item").map(row=>({
    carEngine:row.querySelector(".mech-car")?.value?.trim()||"",
    description:row.querySelector(".mech-desc")?.value?.trim()||""
  })).filter(x=>x.carEngine||x.description);
}
function collectCrewInfo(){
  return {
    reportDate:value("reportDate"),
    onDuty:value("onDuty"),
    offDuty:value("offDuty"),
    conductor:value("conductor"),
    engineer:value("engineer"),
    reliefConductor:value("reliefConductor"),
    reliefEngineer:value("reliefEngineer"),
    studentConductor:value("studentConductor"),
    studentEngineer:value("studentEngineer")
  };
}
function resizeMechanicalDescription(field){
  field.style.height="auto";
  const style=getComputedStyle(field);
  const border=(parseFloat(style.borderTopWidth)||0)+(parseFloat(style.borderBottomWidth)||0);
  field.style.height=Math.ceil(field.scrollHeight+border)+"px";
}
window.addEventListener("resize",()=>{
  $$(".mech-desc").forEach(resizeMechanicalDescription);
});
function addMechanicalRow(){
  const row=document.createElement("div");
  row.className="mechanical-item";
  row.innerHTML='<input class="mech-car" placeholder="Car/Eng #"><textarea class="mech-desc" rows="3" aria-label="Description of mechanical issue" placeholder="Description of mechanical issue"></textarea><button type="button" class="remove-mech" aria-label="Remove mechanical issue">×</button>';
  const description=row.querySelector(".mech-desc");
  description.addEventListener("input",()=>resizeMechanicalDescription(description));
  row.querySelector(".remove-mech").addEventListener("click",()=>row.remove());
  $("#mechanicalIssues").appendChild(row);
  resizeMechanicalDescription(description);
}
function resetTrainExtras(){
  $("#customerServiceIssues").value="";
  $("#mechanicalIssues").innerHTML="";
  $("#doorOverrideCompleted").checked=false;
  $("#doorOverrideInitials").value="";
  ["engineerSignoff","conductorSignoff","reliefEngineerSignoff","reliefConductorSignoff"].forEach(id=>$("#"+id).value="");
}
function localDateValue(){const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function clearDailyFields(){
  ["onDuty","offDuty","conductor","engineer","reliefConductor","reliefEngineer","studentConductor","studentEngineer","consistInfo"].forEach(id=>$("#"+id).value="");
  $("#reportDate").value=localDateValue();
  resetTrainExtras();
}
function changeLine(line){
  state.line=line; state.assignment=Object.keys(DATA[line].assignments)[0];state.train=DATA[line].assignments[state.assignment][0];
  $$("#linePicker button").forEach(b=>b.classList.toggle("active",b.dataset.line===line));
  populateAssignments();populateTrains();applyDutyTimes();resetCounters();renderStations();renderProgress();
}
async function saveTrain(){
  if(submitting)return;
  submitting=true;
  try{
  const tr=currentTrain();
  const actuals=$$(".station-row[data-index]").map((row,i)=>({
    station:tr.stops[i][0],scheduled:tr.stops[i][1],
    actual:row.querySelector(".actual-time")?.value||null
  }));
  const record={
    train:state.train,direction:tr.direction,actuals,
    bikes:Number($("#bikes").value)||0,ada:Number($("#ada").value)||0,
    passengers:Number($("#passengers").value)||0,
    crewInfo:collectCrewInfo(),
    passengerActivity:collectPassengerActivity(),
    delays:collectDelays(),
    customerServiceIssues:value("customerServiceIssues"),
    mechanicalIssues:collectMechanical(),
    consistInfo:value("consistInfo"),
    doorOverrideCompleted:$("#doorOverrideCompleted").checked,
    doorOverrideInitials:value("doorOverrideInitials"),
    crewSignoff:{
      engineer:value("engineerSignoff"),
      conductor:value("conductorSignoff"),
      reliefEngineer:value("reliefEngineerSignoff"),
      reliefConductor:value("reliefConductorSignoff")
    },
    savedAt:new Date().toISOString()
  };
  const key=`${state.line}:${state.assignment}:${state.train}`;
  const submissionId=crypto.randomUUID();
  const payload={lineLabel:currentLine().label,assignment:state.assignment,...record,submissionId};
  const pending=readPending();pending[submissionId]={key,payload};
  try{localStorage.setItem('sounderPendingReports',JSON.stringify(pending))}catch{showModal('<h3>Device storage is full</h3><p>The report was not submitted. Free some space and try again.</p>');return}
  let result;
  try{result=await submitPending(submissionId)}catch(e){showModal('<h3>Report not received</h3><p>'+escapeText(e.message)+'</p><p>Your report remains on this device. Use “Retry unsent reports” before clearing browser data.</p>');renderPending();return}
  record.receiptId=result.id;
  state.completed[key]=record;
  localStorage.setItem("sounderDemoCompleted",JSON.stringify(state.completed));
  renderProgress();renderPending();
  const runs=assignmentRuns(), idx=runs.indexOf(state.train);
  const next=runs.find((t,i)=>i>idx&&!state.completed[`${state.line}:${state.assignment}:${t}`]) ||
             runs.find(t=>!state.completed[`${state.line}:${state.assignment}:${t}`]);
  showModal(`<div class="success-mark">✅</div><h3>Train ${state.train} received</h3><p><strong>Saved to the reporting database ✓</strong><br><span class="muted">Automatic email delivery is not configured. Administrators can retrieve and export this report.</span></p>
  <div class="review-grid"><div class="review-cell"><span>Bikes</span><strong>${record.bikes}</strong></div><div class="review-cell"><span>ADA</span><strong>${record.ada}</strong></div><div class="review-cell"><span>Passengers</span><strong>${record.passengers}</strong></div><div class="review-cell"><span>Stops</span><strong>${actuals.filter(x=>x.actual).length}</strong></div></div>
  ${next?`<p><strong>Next train:</strong> ${next}</p><button class="primary-btn" id="openNext">Open Train ${next}</button>`:"<p><strong>All trains in this assignment are saved.</strong></p>"}`);
  if(next) setTimeout(()=>$("#openNext")?.addEventListener("click",()=>{state.train=next;$("#trainSelect").value=next;resetCounters();resetTrainExtras();renderStations();closeModal()}),0);
  }finally{submitting=false}
}

function showModal(html){$("#modalContent").innerHTML=html;$("#modal").classList.remove("hidden")}
function closeModal(){$("#modal").classList.add("hidden")}

$("#linePicker").addEventListener("click",e=>{const b=e.target.closest("button[data-line]");if(b)changeLine(b.dataset.line)});
$("#assignmentSelect").addEventListener("change",e=>{state.assignment=e.target.value;state.train=assignmentRuns()[0];populateTrains();applyDutyTimes();resetCounters();renderStations();renderProgress()});
$("#trainSelect").addEventListener("change",e=>{state.train=e.target.value;resetCounters();resetTrainExtras();renderStations()});
$("#resetTimes").addEventListener("click",renderStations);
$("#addMechanical").addEventListener("click",addMechanicalRow);
$$(".counter-control button").forEach(b=>b.addEventListener("click",()=>{
 const input=$("#"+b.dataset.counter),next=Math.max(0,(Number(input.value)||0)+Number(b.dataset.delta));input.value=next;
}));
$("#saveTrainBtn").addEventListener("click",saveTrain);
$("#submitBtn").addEventListener("click",async()=>{
 if(submitting)return;
 submitting=true;
 try{
 const records=assignmentRuns().map(t=>state.completed[`${state.line}:${state.assignment}:${t}`]).filter(Boolean);
 const total=records.reduce((n,r)=>n+r.passengers,0);
 const submittedLine=currentLine().label;
 const submittedAssignment=state.assignment;
 const response=await fetch('/api/employee/daily-report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({lineLabel:submittedLine,assignment:submittedAssignment,reportDate:value('reportDate'),reportIds:records.map(r=>r.receiptId)})});
 const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Daily report could not be confirmed');

 for(const train of assignmentRuns())delete state.completed[`${state.line}:${state.assignment}:${train}`];
 localStorage.setItem('sounderDemoCompleted',JSON.stringify(state.completed));
 state.line="north";
 state.assignment="6501";
 state.train="1701";
 $$("#linePicker button").forEach(b=>b.classList.toggle("active",b.dataset.line==="north"));
 populateAssignments();
 populateTrains();
 resetCounters();
 clearDailyFields();
 applyDutyTimes();
 renderStations();
 renderProgress();

 showModal(`<div class="success-mark">📨</div><h3>Daily report received</h3><p>The completed report for <strong>${submittedLine} · Assignment ${submittedAssignment}</strong> has been closed out.</p><div class="review-grid"><div class="review-cell"><span>Trains</span><strong>${records.length}</strong></div><div class="review-cell"><span>Passengers</span><strong>${total}</strong></div></div><p><strong>Form cleared ✓</strong><br><span class="muted">The app is ready for the next crew member.</span></p><p class="fineprint">Every train report and this daily closeout are saved in the database. Automatic email delivery is not configured.</p>`);
 }catch(e){showModal('<h3>Daily report not closed</h3><p>'+escapeText(e.message)+'</p><p>Your saved train reports remain available. Try again.</p>')}finally{submitting=false}
});
$("#reportDate").addEventListener("change",renderProgress);
$("#helpBtn").addEventListener("click",()=>showModal(`<h3>How reporting works</h3><p><strong>1.</strong> Select Sounder North or South.</p><p><strong>2.</strong> Choose the crew assignment. Only trains belonging to that assignment appear.</p><p><strong>3.</strong> Choose a train. Scheduled station times populate automatically.</p><p><strong>4.</strong> Tap Actual to use the phone/iPad time picker. Only delays of 6 minutes or more prompt for a reason. Delays of 5:59 or less are not recordable.</p><p><strong>5.</strong> Enter Bikes, ADA and Total Passengers, then Save Train.</p><p><strong>6.</strong> When all trains are complete, Submit Daily Report becomes available.</p><p class="fineprint">Independent application — not an official Sound Transit or BNSF reporting system. Saved reports are stored in this app’s database; automatic email delivery is not configured.</p>`));
$("#modalClose").addEventListener("click",closeModal);
$("#modal").addEventListener("click",e=>{if(e.target.id==="modal")closeModal()});
try{state.completed=JSON.parse(localStorage.getItem("sounderDemoCompleted")||"{}")}catch{}
$("#reportDate").value=localDateValue();
populateAssignments();populateTrains();applyDutyTimes();renderStations();renderProgress();
let submitting=false;
function escapeText(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function readPending(){try{return JSON.parse(localStorage.getItem('sounderPendingReports')||'{}')}catch{return {}}}
async function submitPending(id){
 const entry=readPending()[id];if(!entry)throw Error('Pending report unavailable');
 const r=await fetch('/api/send-demo-report',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(entry.payload)});
 const d=await r.json();if(!r.ok||!d.ok)throw Error(d.error||'Unable to reach the reporting service');
 const pending=readPending();delete pending[id];localStorage.setItem('sounderPendingReports',JSON.stringify(pending));return d;
}
function renderPending(){const n=Object.keys(readPending()).length;const el=document.querySelector('#retryPending');if(el){el.hidden=!n;el.textContent='Retry unsent reports ('+n+')'}}
const retryButton=document.createElement('button');retryButton.id='retryPending';retryButton.className='primary-btn';retryButton.type='button';document.querySelector('main').prepend(retryButton);renderPending();
retryButton.addEventListener('click',async()=>{
 if(submitting)return;submitting=true;retryButton.disabled=true;
 let received=0;
 try{for(const [id,entry] of Object.entries(readPending())){const result=await submitPending(id);state.completed[entry.key]={...entry.payload,receiptId:result.id};localStorage.setItem('sounderDemoCompleted',JSON.stringify(state.completed));received++}showModal('<h3>Reports received</h3><p>'+received+' report(s) saved to the database.</p>')}
 catch(e){showModal('<h3>Retry paused</h3><p>'+received+' report(s) received. '+escapeText(e.message)+'</p><p>Remaining reports are still saved on this device.</p>')}
 finally{submitting=false;retryButton.disabled=false;renderPending();renderProgress()}
});
const logoutButton=document.createElement('button');logoutButton.type='button';logoutButton.textContent='Sign Out';logoutButton.className='primary-btn';document.querySelector('main').append(logoutButton);logoutButton.addEventListener('click',async()=>{await fetch('/api/employee/logout',{method:'POST'});location.assign('/login.html')});
