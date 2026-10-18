(()=>{
function safe(v){return (v==null||v===""?"-":String(v)).replace(/→/g," to ").replace(/[–—]/g,"-")}
function getJsPdf(){
  const ctor=window.jspdf?.jsPDF;
  if(!ctor) throw new Error("PDF library is still loading. Try again in a moment.");
  return ctor;
}
function addTitle(doc,title,subtitle){
  doc.setFont("helvetica","bold");doc.setFontSize(18);doc.text(title,14,17);
  doc.setFont("helvetica","normal");doc.setFontSize(9);doc.setTextColor(90);
  doc.text(subtitle||"",14,23);doc.setTextColor(0);
}
function addReport(doc,r,startY=30){
  const crew=r.crew_info||{}, sign=r.crew_signoff||{};
  addTitle(doc,"Sounder Crew Report","INDEPENDENT APP · "+safe(r.line_label)+" · Assignment "+safe(r.assignment)+" · Train "+safe(r.train));
  doc.autoTable({
    startY,
    theme:"grid",
    head:[["Report Date","Direction","Conductor","Engineer","On Duty","Off Duty"]],
    body:[[safe(r.report_date).slice(0,10),safe(r.direction),safe(crew.conductor),safe(crew.engineer),safe(crew.onDuty),safe(crew.offDuty)]],
    styles:{fontSize:8,cellPadding:2}
  });
  let y=doc.lastAutoTable.finalY+5;
  doc.autoTable({
    startY:y,theme:"grid",
    head:[["Passengers","Bikes","ADA","Max Delay","Consist","Door Override"]],
    body:[[Number(r.passengers||0),Number(r.bikes||0),Number(r.ada||0),(maxDelay(r)>=6?("+"+maxDelay(r)+" min"):"None"),safe(r.consist_info),r.door_override_completed?("Completed "+safe(r.door_override_initials)):"Not marked"]],
    styles:{fontSize:8,cellPadding:2}
  });
  y=doc.lastAutoTable.finalY+6;
  const station=(r.actuals||[]).map(s=>[safe(s.station),safe(s.scheduled),safe(s.actual),delayOf(s)==null?"—":(delayOf(s)>0?"+"+delayOf(s):delayOf(s))]);
  if(station.length){
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Station Times",14,y);y+=3;
    doc.autoTable({startY:y,head:[["Station","Scheduled","Actual","Delay"]],body:station,theme:"grid",styles:{fontSize:8,cellPadding:2}});
    y=doc.lastAutoTable.finalY+6;
  }
  const pax=(r.passenger_activity||[]).filter(x=>Number(x.on)||Number(x.off)).map(x=>[safe(x.station),Number(x.on||0),Number(x.off||0)]);
  if(pax.length){
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Passenger Activity",14,y);y+=3;
    doc.autoTable({startY:y,head:[["Station","On","Off"]],body:pax,theme:"grid",styles:{fontSize:8,cellPadding:2}});
    y=doc.lastAutoTable.finalY+6;
  }
  const delays=(r.delays||[]).map(x=>[safe(x.station),"+"+Number(x.minutes||0),safe(x.reason)]);
  if(delays.length){
    doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("Recordable Delays (6+ Minutes)",14,y);y+=3;
    doc.autoTable({startY:y,head:[["Station","Minutes","Reason"]],body:delays,theme:"grid",styles:{fontSize:8,cellPadding:2}});
    y=doc.lastAutoTable.finalY+6;
  }
  const notes=[];
  for(const [key,label] of [['reliefConductor','Relief Conductor'],['reliefEngineer','Relief Engineer'],['studentConductor','Student Conductor'],['studentEngineer','Student Engineer']])if(crew[key])notes.push([label,safe(crew[key])]);
  if(r.customer_service_issues)notes.push(["Customer Service / Announcements",r.customer_service_issues]);
  (r.mechanical_issues||[]).forEach(m=>notes.push(["Mechanical "+safe(m.carEngine),safe(m.description)]));
  notes.push(["Crew Signoff",[sign.engineer,sign.conductor,sign.reliefEngineer,sign.reliefConductor].filter(Boolean).join(" / ")||"—"]);
  if(notes.length){
    doc.autoTable({startY:y,head:[["Additional Log","Details"]],body:notes,theme:"grid",styles:{fontSize:8,cellPadding:2}});
  }
}
function selectedReports(){
  let list=filtered(reports);
  if(activeTab==="today")list=list.filter(r=>normalizeDate(r.report_date)===todayKey());
  if(activeTab==="history")list=list.filter(r=>normalizeDate(r.report_date)!==todayKey());
  return list;
}
function makeSingle(r){
  const jsPDF=getJsPdf(),doc=new jsPDF({unit:"mm",format:"letter"});
  addReport(doc,r,30);
  return {doc,name:"Sounder_"+safe(r.line_label).replace(/\s+/g,"_")+"_"+safe(r.assignment)+"_Train_"+safe(r.train)+"_"+safe(r.report_date).slice(0,10)+".pdf"};
}
function makeCombined(list){
  const jsPDF=getJsPdf(),doc=new jsPDF({unit:"mm",format:"letter"});
  list.forEach((r,i)=>{if(i)doc.addPage();addReport(doc,r,30)});
  const date=document.querySelector("#dateFilter")?.value||"Filtered";
  return {doc,name:"Sounder_Admin_Reports_"+date+".pdf"};
}
async function sharePdf(doc,name){
  const blob=doc.output("blob");
  const file=new File([blob],name,{type:"application/pdf"});
  if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){
    await navigator.share({title:"Sounder Crew Report",text:"Sounder crew report PDF",files:[file]});
  }else{
    doc.save(name);
    alert("PDF downloaded. Attach the downloaded PDF in Mail or Outlook.");
  }
}
function addDrawerActions(id){
  const body=document.querySelector("#drawerBody");if(!body||body.querySelector(".pdf-actions"))return;
  const wrap=document.createElement("div");wrap.className="pdf-actions";
  wrap.innerHTML='<button class="download" type="button">Export PDF</button><button class="share" type="button">Email / Share PDF</button>';
  wrap.querySelector(".download").addEventListener("click",()=>{
    const r=reports.find(x=>String(x.id)===String(id));if(!r)return;
    const out=makeSingle(r);out.doc.save(out.name);
  });
  wrap.querySelector(".share").addEventListener("click",async()=>{
    const r=reports.find(x=>String(x.id)===String(id));if(!r)return;
    try{const out=makeSingle(r);await sharePdf(out.doc,out.name)}catch(e){alert(e.message||"Unable to create PDF")}
  });
  body.prepend(wrap);
}
document.addEventListener("click",e=>{
  const card=e.target.closest?.(".report-card");
  if(card?.dataset?.id)setTimeout(()=>addDrawerActions(card.dataset.id),50);
});
document.addEventListener("DOMContentLoaded",()=>{
  document.querySelector("#exportFilteredPdf")?.addEventListener("click",()=>{
    const list=selectedReports();if(!list.length)return alert("No reports match the current filters.");
    try{const out=makeCombined(list);out.doc.save(out.name)}catch(e){alert(e.message||"Unable to create PDF")}
  });
  document.querySelector("#shareFilteredPdf")?.addEventListener("click",async()=>{
    const list=selectedReports();if(!list.length)return alert("No reports match the current filters.");
    try{const out=makeCombined(list);await sharePdf(out.doc,out.name)}catch(e){if(e?.name!=="AbortError")alert(e.message||"Unable to create PDF")}
  });
});
})();