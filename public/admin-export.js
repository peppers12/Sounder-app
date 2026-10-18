(()=>{
function safe(v){return (v==null||v===""?"-":String(v)).replace(/→/g," to ").replace(/[–—]/g,"-")}
function getJsPdf(){
  const ctor=window.jspdf?.jsPDF;
  if(!ctor) throw new Error("PDF library is still loading. Try again in a moment.");
  return ctor;
}
const PDF_COLORS={navy:[39,54,107],ink:[32,43,60],muted:[102,115,131],line:[214,221,230],pale:[242,245,249]};
function text(doc,value,x,y,size=9,bold=false,color=PDF_COLORS.ink){
  doc.setFont('ReportSans',bold?'bold':'normal');doc.setFontSize(size);doc.setTextColor(...color);doc.text(Array.isArray(value)?value.map(safe):safe(value),x,y);
}
function line(doc,y){doc.setDrawColor(...PDF_COLORS.line);doc.setLineWidth(.6);doc.line(42,y,570,y)}
function addHeader(doc,r){
  const logos=window.sounderPdfBranding;
  if(!logos)throw new Error('Report logos are still loading. Refresh and try again.');
  doc.addImage(logos.soundTransit,'PNG',42,34,126,62,undefined,'FAST');
  doc.addImage(logos.bnsf,'PNG',430,50,140,23,undefined,'FAST');
  doc.setDrawColor(...PDF_COLORS.navy);doc.setLineWidth(1.6);doc.line(42,110,570,110);
  text(doc,'SOUNDER CREW REPORT',42,137,21,true,PDF_COLORS.navy);
  text(doc,'TRAIN OPERATIONS / TRIP SUMMARY',42,155,8,true,PDF_COLORS.muted);
  doc.setFillColor(...PDF_COLORS.pale);doc.roundedRect(42,170,528,27,3,3,'F');
  text(doc,safe(r.line_label).toUpperCase(),52,187,9,true,PDF_COLORS.navy);
  text(doc,'TRAIN '+safe(r.train),207,187,9,true);
  text(doc,'ASSIGNMENT '+safe(r.assignment),328,187,9,true);
  doc.setFont('ReportSans','normal');doc.setFontSize(9);doc.text(safe(r.report_date).slice(0,10),560,187,{align:'right'});
}
function addFooters(doc){
  const total=doc.getNumberOfPages();
  for(let page=1;page<=total;page++){
    doc.setPage(page);line(doc,739);
    text(doc,'Independent crew reporting application',42,759,7,false,PDF_COLORS.muted);
    doc.setFontSize(7);doc.text('Page '+page+' of '+total,570,759,{align:'right'});
  }
  doc.setProperties({title:'Sounder Crew Report',author:'Sounder Crew Report',subject:'Train operations / trip summary'});
}
function createPdf(){
  const Ctor=getJsPdf(),doc=new Ctor({unit:"pt",format:"letter"});
  for(const style of ["normal","bold"]){const file="ReportSans-"+style+".ttf";doc.addFileToVFS(file,window.sounderPdfFonts[style]);doc.addFont(file,"ReportSans",style);}
  doc.setFont("ReportSans","normal");return doc;
}
function addReport(doc,r){
  const crew=r.crew_info||{},sign=r.crew_signoff||{},firstPage=doc.getCurrentPageInfo().pageNumber;
  let y=215;
  function room(height){if(y+height>718){doc.addPage();y=215}}
  function section(number,title){room(64);text(doc,number,42,y,8,true,PDF_COLORS.navy);text(doc,title.toUpperCase(),63,y,9,true,PDF_COLORS.navy);line(doc,y+7);y+=23}
  function fields(items,width){
    // Let wrapping crew names grow vertically rather than overlap the next row.
    doc.setFont("ReportSans","normal");doc.setFontSize(9.5);
    const chunks=items.map(([label,value])=>({label,value:doc.splitTextToSize(safe(value),width-15)}));
    const height=Math.max(...chunks.map(v=>v.value.length))*12+24;room(height);
    chunks.forEach((v,i)=>{text(doc,v.label.toUpperCase(),42+i*width,y,6.7,true,PDF_COLORS.muted);text(doc,v.value,42+i*width,y+14,9.5)});
    y+=height;
  }
  function table(head,body,widths){
    doc.autoTable({startY:y,head:head?[head]:undefined,body,theme:'plain',margin:{left:42,right:42,top:215,bottom:74},
      styles:{font:'ReportSans',fontSize:8,textColor:PDF_COLORS.ink,cellPadding:{top:5,right:9,bottom:5,left:9},overflow:'linebreak',minCellHeight:20},
      headStyles:{fillColor:PDF_COLORS.navy,textColor:[255,255,255],fontStyle:'bold',minCellHeight:23},
      alternateRowStyles:{fillColor:PDF_COLORS.pale},
      columnStyles:Object.fromEntries(widths.map((w,i)=>[i,{cellWidth:w,...(head&&i>0&&head[i]!=='Reason'?{halign:'center'}:{})}])),
      rowPageBreak:'avoid'});
    y=doc.lastAutoTable.finalY+13;
  }
  section('01','Crew & duty information');
  doc.setFontSize(9.5);
  fields([['Conductor',crew.conductor],['Engineer',crew.engineer],['Direction',r.direction]],176);
  fields([['On duty',crew.onDuty],['Off duty',crew.offDuty],['Report date',safe(r.report_date).slice(0,10)]],176);
  const additionalCrew=[['reliefConductor','Relief conductor'],['reliefEngineer','Relief engineer'],['studentConductor','Student conductor'],['studentEngineer','Student engineer']].filter(([key])=>crew[key]);
  if(additionalCrew.length)table(null,additionalCrew.map(([key,label])=>[label,safe(crew[key])]),[132,396]);
  section('02','Operating summary');
  fields([['Passengers',Number(r.passengers||0)],['Bicycles',Number(r.bikes||0)],['ADA passengers',Number(r.ada||0)],['Maximum delay',maxDelay(r)>0?'+'+maxDelay(r)+' min':'None']],132);
  section('03','Station times & passenger activity');
  const activity=r.passenger_activity||[],used=new Set();
  const station=(r.actuals||[]).map(s=>{
    const index=activity.findIndex((p,i)=>!used.has(i)&&p.station===s.station),p=index<0?null:activity[index];if(p)used.add(index);
    const delay=delayOf(s);
    return [safe(s.station),safe(s.scheduled),safe(s.actual),delay==null?'-':(delay>0?'+':'')+delay+' min',p?Number(p.on||0):'-',p?Number(p.off||0):'-'];
  });
  if(station.length)table(['Station','Scheduled','Actual','Delay','On','Off'],station,[168,79,79,70,66,66]);
  // Preserve activity even for stations without a timing entry.
  const unmatched=activity.filter((p,i)=>!used.has(i));
  if(unmatched.length)table(['Station','On','Off'],unmatched.map(p=>[safe(p.station),Number(p.on||0),Number(p.off||0)]),[264,132,132]);
  section('04','Recordable delays (6+ minutes)');
  if((r.delays||[]).length)table(['Station','Minutes','Reason'],r.delays.map(d=>[safe(d.station),'+'+Number(d.minutes||0),safe(d.reason)]),[132,65,331]);
  else {text(doc,'None reported.',42,y,9);y+=25;}
  section('05','Equipment & service notes');
  const notes=[['Consist',safe(r.consist_info)],['Door override',r.door_override_completed?'Completed / '+safe(r.door_override_initials):'Not marked'],['Customer service',safe(r.customer_service_issues)]];
  const mechanical=r.mechanical_issues||[];
  if(mechanical.length)mechanical.forEach(m=>notes.push(['Mechanical / '+safe(m.carEngine),safe(m.description)]));else notes.push(['Mechanical','None reported.']);
  const signoffs=[['Conductor',sign.conductor],['Engineer',sign.engineer],['Relief conductor',sign.reliefConductor],['Relief engineer',sign.reliefEngineer]].filter(([,value])=>value);
  notes.push(['Crew signoff',signoffs.length?signoffs.map(([label,value])=>label+': '+safe(value)).join(' / '):'Not marked']);
  table(null,notes,[132,396]);
  const lastPage=doc.getCurrentPageInfo().pageNumber;
  for(let page=firstPage;page<=lastPage;page++){doc.setPage(page);addHeader(doc,r)}
  doc.setPage(lastPage);
}
function selectedReports(){
  let list=filtered(reports);
  if(activeTab==="today")list=list.filter(r=>normalizeDate(r.report_date)===todayKey());
  if(activeTab==="history")list=list.filter(r=>normalizeDate(r.report_date)!==todayKey());
  return list;
}
function makeSingle(r){
  const doc=createPdf();
  addReport(doc,r);addFooters(doc);
  return {doc,name:"Sounder_"+safe(r.line_label).replace(/\s+/g,"_")+"_"+safe(r.assignment)+"_Train_"+safe(r.train)+"_"+safe(r.report_date).slice(0,10)+".pdf"};
}
function makeCombined(list){
  const doc=createPdf();
  list.forEach((r,i)=>{if(i)doc.addPage();addReport(doc,r)});
  addFooters(doc);
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
window.addEventListener("sounder-report-reviewed",e=>setTimeout(()=>addDrawerActions(e.detail.id),0));
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