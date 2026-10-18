import {randomBytes} from 'node:crypto';
import {writeFile,readFile} from 'node:fs/promises';
import {passwordHash,digest} from '../src/index.js';
const pepper=randomBytes(32).toString('hex'),setupToken=randomBytes(32).toString('hex');
const accounts=[];
for(const role of ['admin','employee']){const password=randomBytes(24).toString('base64url'),salt=randomBytes(32).toString('hex');accounts.push({role,username:role==='admin'?'admin':'crew',password,salt,hash:await passwordHash(password,salt,pepper)})}
await writeFile('../sounder-private.json',JSON.stringify({pepper,setupToken,setupHash:await digest(setupToken),accounts}),{mode:0o600});
console.log('Private test credentials generated outside the repository.');
