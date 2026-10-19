window.SounderAdminEditor={open(raw,onSaved){
 if(window.SounderAdminAccess?.canEdit!==true)return;
 const body=document.querySelector('#drawerBody'),form=document.createElement('form');form.className='report-editor';
 const draft=JSON.parse(JSON.stringify(raw)),crew=draft.crew_info||{},sign=draft.crew_signoff||{};
 const title=document.createElement('h2');title.textContent='Edit Train '+raw.train;form.append(title);
 const identity=document.createElement('p');identity.textContent=[raw.line_label,'Assignment '+raw.assignment,raw.report_date].join(' · ');form.append(identity);
 const info=document.createElement('p');info.className='edit-note';info.textContent='Correct the report below. The original train, assignment and date stay the same. Every saved correction keeps a change record.';form.append(info);
 const fields={};
 function heading(label){const h=document.createElement('h3');h.textContent=label;form.append(h)}
 function field(parent,label,value,type='text'){
  const wrap=document.createElement('label');wrap.className='edit-field';const span=document.createElement('span');span.textContent=label;wrap.append(span);
  const input=document.createElement(type==='textarea'?'textarea':'input');if(type!=='textarea')input.type=type;input.value=value??'';
  if(type==='number'){input.min='0';input.max='100000';input.step='1';input.required=true;input.inputMode='numeric'}
  if(type==='textarea')input.rows=3;else if(type==='text')input.maxLength=200;
  wrap.append(input);parent.append(wrap);return input;
 }
 heading('Crew and duty');
 for(const [key,label] of [['conductor','Conductor'],['engineer','Engineer'],['reliefConductor','Relief Conductor'],['reliefEngineer','Relief Engineer'],['studentConductor','Student Conductor'],['studentEngineer','Student Engineer']])fields[key]=field(form,label,crew[key]);
 fields.onDuty=field(form,'On Duty',crew.onDuty,'time');fields.offDuty=field(form,'Off Duty',crew.offDuty,'time');
 heading('Trip totals');for(const [key,label] of [['passengers','Total Passengers'],['bikes','Bikes'],['ada','ADA']])fields[key]=field(form,label,draft[key]??0,'number');
 heading('Station times and delay reasons');
 const stops=(draft.actuals||[]).map(s=>({source:s,actual:field(form,s.station+' actual time (scheduled '+s.scheduled+')',s.actual,'time'),reason:field(form,s.station+' delay reason',(draft.delays||[]).find(x=>x.station===s.station)?.reason||'','textarea')}));
 heading('Passenger activity');
 const activity=(draft.actuals||[]).map(s=>{const v=(draft.passenger_activity||[]).find(x=>x.station===s.station)||{};return {station:s.station,on:field(form,s.station+' passengers on',v.on??0,'number'),off:field(form,s.station+' passengers off',v.off??0,'number')}});
 heading('Issues and consist');fields.consist=field(form,'Engine / Consist Information',draft.consist_info,'textarea');fields.customer=field(form,'Customer Service Issues / Announcements',draft.customer_service_issues,'textarea');
 const mechanical=document.createElement('div');form.append(mechanical);const mechanicalRows=[];
 function mechanicalRow(value={}){const row=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent='Mechanical Issue';row.append(legend);const car=field(row,'Car / Engine',value.carEngine),description=field(row,'Description',value.description,'textarea');const remove=document.createElement('button');remove.type='button';remove.textContent='Remove Issue';remove.addEventListener('click',()=>{row.remove();mechanicalRows.splice(mechanicalRows.indexOf(entry),1)});row.append(remove);mechanical.append(row);const entry={row,car,description};mechanicalRows.push(entry)}
 for(const issue of draft.mechanical_issues||[])mechanicalRow(issue);
 const add=document.createElement('button');add.type='button';add.textContent='Add Mechanical Issue';add.addEventListener('click',()=>{if(mechanicalRows.length<30)mechanicalRow()});form.append(add);
 heading('Safety and signoff');
 const overrideLabel=document.createElement('label');overrideLabel.className='edit-checkbox';const override=document.createElement('input');override.type='checkbox';override.checked=draft.door_override_completed===true;overrideLabel.append(override,document.createTextNode('Door Override System Test Completed'));form.append(overrideLabel);
 fields.initials=field(form,'Door Override Initials',draft.door_override_initials);
 const signs={};for(const [key,label] of [['conductor','Conductor Signoff'],['engineer','Engineer Signoff'],['reliefConductor','Relief Conductor Signoff'],['reliefEngineer','Relief Engineer Signoff']])signs[key]=field(form,label,sign[key]);
 heading('Reason for correction');const reason=field(form,'Correction reason','','textarea');reason.required=true;reason.maxLength=500;
 const error=document.createElement('p');error.className='edit-error';error.setAttribute('role','alert');form.append(error);
 const controls=document.createElement('div');controls.className='edit-actions';const save=document.createElement('button');save.type='submit';save.textContent='Save Changes';const cancel=document.createElement('button');cancel.type='button';cancel.textContent='Cancel';cancel.addEventListener('click',()=>window.openDetail(raw.id));controls.append(save,cancel);form.append(controls);
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(save.disabled)return;error.textContent='';save.disabled=true;save.textContent='Saving…';
  try{
   const report={lineLabel:raw.line_label,assignment:raw.assignment,train:raw.train,direction:raw.direction,crewInfo:{reportDate:raw.report_date},crewSignoff:{},actuals:[],delays:[],passengerActivity:activity.map(x=>({station:x.station,on:Number(x.on.value),off:Number(x.off.value)})),mechanicalIssues:mechanicalRows.map(x=>({carEngine:x.car.value,description:x.description.value})),consistInfo:fields.consist.value,customerServiceIssues:fields.customer.value,doorOverrideCompleted:override.checked,doorOverrideInitials:fields.initials.value};
   for(const key of ['conductor','engineer','reliefConductor','reliefEngineer','studentConductor','studentEngineer','onDuty','offDuty'])report.crewInfo[key]=fields[key].value;
   for(const key of ['passengers','bikes','ada'])report[key]=Number(fields[key].value);
   for(const [key,input] of Object.entries(signs))report.crewSignoff[key]=input.value;
   for(const s of stops){const actual=s.actual.value||null;report.actuals.push({...s.source,actual});if(actual&&s.source.scheduled!=='--'){const minutes=v=>{const [h,m]=v.split(':').map(Number);return h*60+m};let delay=minutes(actual)-minutes(s.source.scheduled);if(delay<-720)delay+=1440;if(delay>720)delay-=1440;if(delay>=6){if(!s.reason.value.trim())throw Error('Enter a delay reason for '+s.source.station);report.delays.push({station:s.source.station,scheduled:s.source.scheduled,actual,minutes:delay,reason:s.reason.value})}}}
   const response=await fetch('/api/admin/reports/'+encodeURIComponent(raw.id),{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({revision:raw.revision??0,reason:reason.value,report})});
   const result=await response.json();if(!response.ok)throw Error(result.error||'Unable to save changes');onSaved(result.report);
  }catch(e){error.textContent=e.message||'Unable to save changes. Your edits are still here.'}finally{save.disabled=false;save.textContent='Save Changes'}
 });
 body.replaceChildren(form);document.querySelector('#drawer').classList.remove('hidden');
}};
