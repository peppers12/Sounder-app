import {JSDOM} from 'jsdom';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const dom=new JSDOM(await readFile('public/admin.html','utf8'),{url:'https://sounder.test/admin',runScripts:'outside-only'}),w=dom.window,c=dom.getInternalVMContext();
w.sounderAdminReady=Promise.resolve(false);
vm.runInContext(await readFile('public/admin.js','utf8'),c);
let checks=0;function eq(code,expected){assert.deepEqual(JSON.parse(JSON.stringify(vm.runInContext(code,c))),expected);checks++}
eq("chicagoDate(new Date('2026-10-26T04:59:00Z'))",'2026-10-25');
eq("chicagoDate(new Date('2026-10-26T05:00:00Z'))",'2026-10-26');
eq("snapshotBounds('week','2026-11-01')",{start:'2026-10-26',end:'2026-11-01'});
eq("snapshotBounds('month','2028-02-15')",{start:'2028-02-01',end:'2028-02-29'});
eq("snapshotBounds('today','2026-10-26')",{start:'2026-10-26',end:'2026-10-26'});
const row=(id,date,train,pax)=>({id,report_date:date,line_label:'Sounder South',assignment:'6501',train,passengers:pax,bikes:2,ada:1,saved_at:id,actuals:[{scheduled:'06:00',actual:'06:06'}]});
w.fixtures=[row('1','2026-10-26','1517',10),row('2','2026-10-27','1517',20),row('3','2026-11-01','1517',30),row('4','2026-11-02','1517',999),row('5','2026-10-27','1518',40),row('6','2026-10-27','1517',25)];
vm.runInContext('reports=window.fixtures',c);
eq("snapshotReports('2026-10-26','2026-11-01').length",4);
for(const [id,v] of [['snapshotPeriod','custom'],['snapshotStart','2026-10-26'],['snapshotEnd','2026-11-01']])w.document.getElementById(id).value=v;
vm.runInContext('renderReports()',c);
eq("$$('#summaryGrid strong').map(e=>e.textContent)",['105','26','4','8','4','4']);
eq("$$('#bars .bar-row strong').map(e=>e.textContent)",['1517','1518']);
eq("$$('#bars .bar-row span').map(e=>e.textContent)",['65','40']);
eq("$('#snapshotRange').textContent",'Oct 26, 2026 – Nov 1, 2026');
w.document.getElementById('snapshotEnd').value='2026-10-25';vm.runInContext('renderReports()',c);
eq("$$('#summaryGrid strong').map(e=>e.textContent)",['0','0','0','0','0','0']);
eq("$('#bars').textContent",'No reports for this period');
w.document.getElementById('snapshotPeriod').value='week';vm.runInContext('renderReports()',c);eq("$('#snapshotCustom').hidden",true);
w.document.getElementById('snapshotPeriod').value='month';vm.runInContext('renderReports()',c);eq("$('#snapshotRange').textContent.includes('Oct 1, 2026')",true);
if(process.argv[2]){
 w.existing=JSON.parse(await readFile(process.argv[2],'utf8'));vm.runInContext('reports=window.existing',c);
 for(const period of ['today','week','month','custom']){
  w.document.getElementById('snapshotPeriod').value=period;
  w.document.getElementById('snapshotStart').value='2026-10-01';w.document.getElementById('snapshotEnd').value='2026-10-26';
  const bounds=vm.runInContext('snapshotBounds($("#snapshotPeriod").value)',c);
  const selected=w.existing.filter(r=>r.report_date>=bounds.start&&r.report_date<=bounds.end);
  const unique=[...new Map(selected.sort((a,b)=>String(a.updated_at||a.saved_at).localeCompare(String(b.updated_at||b.saved_at))).map(r=>[JSON.stringify([r.report_date,r.line_label,r.train]),r])).values()];
  const total=key=>unique.reduce((sum,r)=>sum+(Number(r[key])||0),0);
  vm.runInContext('renderReports()',c);
  eq('Number($("#summaryGrid strong").textContent.replaceAll(",",""))',total('passengers'));
  eq('$("#summaryGrid").lastElementChild.querySelector("strong").textContent',String(unique.length));
  eq('$$("#bars .bar-row").length',new Set(unique.map(r=>String(r.train))).size);
 }
}
await new Promise(r=>setTimeout(r,10));dom.window.close();console.log(checks+' snapshot date, aggregation and duplicate checks passed.');
