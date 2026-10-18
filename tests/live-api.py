import json,urllib.request,urllib.error,http.cookiejar,uuid,os,sys
from pathlib import Path
base=sys.argv[1] if len(sys.argv)>1 else 'https://sounder-staging.personalpeptidetracker.workers.dev'
private=json.loads(Path('../sounder-private.json').read_text())
checks=0
import subprocess,tempfile
cookie_dir=tempfile.TemporaryDirectory()
def call(path,role='anonymous',body=None,origin=None):
 cookie_path=cookie_dir.name+'/'+role+'.cookies'
 header_path=cookie_dir.name+'/'+role+'.headers'
 cmd=['curl','-sS','--max-time','30','-b',cookie_path,'-c',cookie_path,'-D',header_path,'-H','Content-Type: application/json','-H','Origin: '+(origin or base),'-w','\n%{http_code}',base+path]
 if body is not None:cmd+=['--data-binary','@-']
 result=subprocess.run(cmd,input=json.dumps(body) if body is not None else None,capture_output=True,text=True,check=True)
 content,status=result.stdout.rsplit('\n',1)
 headers={}
 for line in Path(header_path).read_text().splitlines():
  if ': ' in line:
   k,v=line.split(': ',1);headers[k.title()]=v
 try:data=json.loads(content)
 except:raise RuntimeError('Unexpected response '+status+': '+content[:150])
 return int(status),data,headers
def check(value,label):
 global checks
 assert value,label
 checks+=1
check(call('/api/health')[0]==200,'health')
check(call('/api/admin/reports')[0]==401,'anonymous denied')
for a in private['accounts']:
 status,data,headers=call('/api/'+a['role']+'/login',a['role'],{'username':a['username'],'password':a['password']})
 check(status==200 and data.get('ok'),a['role']+' login')
 check('HttpOnly' in headers.get('Set-Cookie',''),'secure cookie')
check(call('/api/admin/reports','employee')[0]==401,'role isolation')
reports=[]
for train,direction,stops in [('1701','Everett → Seattle',[['Everett','06:15'],['Mukilteo','06:26'],['Edmonds','06:41'],['Seattle','07:14']]),('1700','Seattle → Everett',[['Seattle','15:45'],['Edmonds','16:12'],['Mukilteo','16:27'],['Everett','16:44']])]:
 payload={'submissionId':str(uuid.uuid4()),'lineLabel':'Sounder North','assignment':'6501','train':train,'direction':direction,'actuals':[{'station':s,'scheduled':t,'actual':t} for s,t in stops],'bikes':2,'ada':1,'passengers':45,'crewInfo':{'reportDate':'2026-10-18','conductor':'MIGRATION TEST ONLY','engineer':'Synthetic Test','studentConductor':'Test Student','onDuty':'05:15','offDuty':'17:34'},'passengerActivity':[{'station':stops[0][0],'on':45,'off':0}],'mechanicalIssues':[{'carEngine':'TEST','description':'Synthetic migration test; no operational record'}],'customerServiceIssues':'<img src=x onerror=alert(1)>','doorOverrideCompleted':True,'doorOverrideInitials':'TEST','crewSignoff':{'conductor':'TEST','engineer':'TEST'}}
 status,data,_=call('/api/send-demo-report','employee',payload)
 check(status==201 and data.get('ok'),'report persisted')
 reports.append(data['id'])
 status,retry,_=call('/api/send-demo-report','employee',payload)
 check(status==200 and retry['id']==data['id'],'idempotent receipt')
 status,_,_=call('/api/send-demo-report','employee',payload,origin='https://untrusted.example')
 check(status==403,'cross origin denied')
status,daily,_=call('/api/employee/daily-report','employee',{'lineLabel':'Sounder North','assignment':'6501','reportDate':'2026-10-18','reportIds':reports})
check(status==200 and daily.get('ok'),'daily closeout persisted')
status,data,_=call('/api/admin/reports','admin')
check(status==200 and all(any(r['id']==i for r in data['reports']) for i in reports),'administrator retrieves saved reports')
check(all(r['status']=='submitted' for r in data['reports'] if r['id'] in reports),'closeout status persisted')
Path('../sounder-live-report-ids.json').write_text(json.dumps({'ids':reports,'dailyId':daily['id']}))
Path('../sounder-live-synthetic-reports.json').write_text(json.dumps(data['reports']))
for role in ['employee','admin']:
 check(call('/api/'+role+'/logout',role,{})[0]==200,'logout '+role)
 check(not call('/api/'+role+'/session',role)[1]['ok'],'session revoked '+role)
print(f'{checks} live API checks passed at {base}. Synthetic IDs saved privately for cleanup.')
