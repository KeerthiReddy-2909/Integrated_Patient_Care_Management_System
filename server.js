/** MediTrack REST backend — Node.js 24+ (no third-party packages required). */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT || 3000);
const SECRET = process.env.JWT_SECRET || 'change-this-mediTrack-secret-before-production';
const db = new DatabaseSync(path.join(__dirname, 'meditrack.db'));
db.exec('PRAGMA foreign_keys = ON');
db.exec(`CREATE TABLE IF NOT EXISTS patients (id TEXT PRIMARY KEY, full_name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL, date_of_birth TEXT, gender TEXT, address TEXT, blood_group TEXT, emergency_contact TEXT, notes TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, patient_id TEXT, full_name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('admin','doctor','patient')), created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients(id));
CREATE TABLE IF NOT EXISTS appointments (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, doctor TEXT NOT NULL, appointment_date TEXT NOT NULL, appointment_time TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Confirmed', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients(id), UNIQUE(doctor, appointment_date, appointment_time));
CREATE TABLE IF NOT EXISTS consultations (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, doctor TEXT NOT NULL, symptoms TEXT NOT NULL, observations TEXT, diagnosis TEXT NOT NULL, treatment TEXT NOT NULL, consultation_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients(id));
CREATE TABLE IF NOT EXISTS prescriptions (id TEXT PRIMARY KEY, patient_id TEXT NOT NULL, doctor TEXT NOT NULL, medicine TEXT NOT NULL, dosage TEXT NOT NULL, duration TEXT NOT NULL, refills INTEGER NOT NULL DEFAULT 0, instructions TEXT NOT NULL, prescription_date TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients(id));
CREATE TABLE IF NOT EXISTS notifications (id TEXT PRIMARY KEY, patient_id TEXT, type TEXT NOT NULL, message TEXT NOT NULL, is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(patient_id) REFERENCES patients(id));
CREATE TABLE IF NOT EXISTS audit_logs (id TEXT PRIMARY KEY, user_id TEXT, actor TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, occurred_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id));
CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_consultations_patient ON consultations(patient_id, consultation_date);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id, prescription_date);`);

const uid = (prefix) => `${prefix}_${crypto.randomUUID()}`;
const hash = (password) => crypto.scryptSync(password, 'meditrack', 64).toString('hex');
const sign = (payload) => { const h=b64({alg:'HS256',typ:'JWT'}), p=b64({...payload,iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+28800}); const sig=crypto.createHmac('sha256',SECRET).update(`${h}.${p}`).digest('base64url'); return `${h}.${p}.${sig}`; };
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString('base64url');
function verify(token) { try { const [h,p,s]=token.split('.'); const wanted=crypto.createHmac('sha256',SECRET).update(`${h}.${p}`).digest('base64url'); if(!crypto.timingSafeEqual(Buffer.from(s),Buffer.from(wanted))) return null; const data=JSON.parse(Buffer.from(p,'base64url')); return data.exp > Date.now()/1000 ? data : null; } catch { return null; } }
function seed() { if (!db.prepare('SELECT id FROM users LIMIT 1').get()) { db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').run('USR_ADMIN',null,'MediTrack Administrator','admin@meditrack.local',hash('Meditrack@123'),'admin'); db.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,CURRENT_TIMESTAMP)').run('USR_DOCTOR',null,'Dr. Priya','doctor@meditrack.local',hash('Meditrack@123'),'doctor'); } }
seed();
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization'});res.end(JSON.stringify(data));}
function audit(user,action,resource){db.prepare('INSERT INTO audit_logs VALUES (?,?,?,?,?,CURRENT_TIMESTAMP)').run(uid('AUD'),user?.sub||null,user?.name||'System',action,resource);}
function auth(req,res,roles){const token=(req.headers.authorization||'').replace(/^Bearer\s+/,''); const user=verify(token); if(!user){send(res,401,{error:'Authentication required'});return null;} if(roles&&!roles.includes(user.role)){audit(user,'Denied access',req.url);send(res,403,{error:'You do not have permission for this action'});return null;} return user;}
function body(req){return new Promise((resolve,reject)=>{let raw='';req.on('data',x=>raw+=x);req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{})}catch{reject(new Error('Invalid JSON'))}});});}
function rows(sql,...args){return db.prepare(sql).all(...args)}
function staticFile(req,res){let file=req.url==='/'?'/index.html':decodeURIComponent(req.url.split('?')[0]);if(file.includes('..')) return send(res,400,{error:'Invalid path'});file=path.join(__dirname,file);if(!fs.existsSync(file)||fs.statSync(file).isDirectory())return send(res,404,{error:'Not found'});const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.md':'text/markdown'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});fs.createReadStream(file).pipe(res);}
const server=http.createServer(async(req,res)=>{if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'GET,POST,PUT,DELETE,OPTIONS'});return res.end();} const url=new URL(req.url,`http://${req.headers.host}`), p=url.pathname;
 try {
  if(!p.startsWith('/api/')) return staticFile(req,res);
  if(p==='/api/health'&&req.method==='GET') return send(res,200,{status:'ok',database:'sqlite',time:new Date().toISOString()});
  if(p==='/api/auth/login'&&req.method==='POST'){let x=await body(req),u=db.prepare('SELECT * FROM users WHERE email=?').get(String(x.email||'').toLowerCase());if(!u||u.password_hash!==hash(String(x.password||''))){audit(null,'Failed login',String(x.email||'unknown'));return send(res,401,{error:'Invalid email or password'});}let token=sign({sub:u.id,name:u.full_name,role:u.role,patientId:u.patient_id});audit({sub:u.id,name:u.full_name},'Logged in','Authentication');return send(res,200,{token,user:{id:u.id,name:u.full_name,role:u.role}});}
  if(p==='/api/auth/me'&&req.method==='GET'){let u=auth(req,res);if(u)send(res,200,{user:u});return;}
  if(p==='/api/patients'&&req.method==='GET'){let u=auth(req,res);if(!u)return;let data=u.role==='patient'?rows('SELECT * FROM patients WHERE id=?',u.patientId):rows('SELECT * FROM patients ORDER BY created_at DESC');audit(u,'Viewed patient records','patients');return send(res,200,data);}
  if(p==='/api/patients'&&req.method==='POST'){let u=auth(req,res,['admin']);if(!u)return;let x=await body(req),pid=`PAT${String((db.prepare('SELECT count(*) as n FROM patients').get().n)+1).padStart(3,'0')}`;db.prepare('INSERT INTO patients(id,full_name,phone,email,date_of_birth,gender,address,blood_group,emergency_contact,notes) VALUES(?,?,?,?,?,?,?,?,?,?)').run(pid,x.fullName,x.phone,x.email,x.dob,x.gender,x.address,x.bloodGroup||'Not recorded',x.emergencyContact||'',x.notes||'');audit(u,'Registered patient',pid);return send(res,201,{id:pid});}
  if(p==='/api/appointments'&&req.method==='GET'){let u=auth(req,res);if(!u)return;let sql='SELECT a.*,p.full_name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id',args=[];if(u.role==='patient'){sql+=' WHERE a.patient_id=?';args.push(u.patientId)}sql+=' ORDER BY appointment_date DESC, appointment_time DESC';audit(u,'Viewed appointments','appointments');return send(res,200,rows(sql,...args));}
  if(p==='/api/appointments'&&req.method==='POST'){let u=auth(req,res,['admin','doctor']);if(!u)return;let x=await body(req),existing=db.prepare('SELECT id FROM appointments WHERE doctor=? AND appointment_date=? AND appointment_time=?').get(x.doctor,x.date,x.time);if(existing)return send(res,409,{error:'Doctor time slot already booked'});let aid=uid('APT');db.prepare('INSERT INTO appointments(id,patient_id,doctor,appointment_date,appointment_time) VALUES(?,?,?,?,?)').run(aid,x.patientId,x.doctor,x.date,x.time);db.prepare('INSERT INTO notifications(id,patient_id,type,message) VALUES(?,?,?,?)').run(uid('NOT'),x.patientId,'appointment',`Appointment confirmed with ${x.doctor} on ${x.date} at ${x.time}.`);audit(u,'Booked appointment',aid);return send(res,201,{id:aid,status:'Confirmed'});}
  if(/^\/api\/appointments\/[^/]+\/complete$/.test(p)&&req.method==='PUT'){let u=auth(req,res,['admin','doctor']);if(!u)return;let aid=p.split('/')[3];db.prepare("UPDATE appointments SET status='Completed' WHERE id=?").run(aid);audit(u,'Completed appointment',aid);return send(res,200,{ok:true});}
  if(p==='/api/consultations'&&req.method==='GET'){let u=auth(req,res);if(!u)return;let sql='SELECT c.*,p.full_name patient_name FROM consultations c JOIN patients p ON p.id=c.patient_id',args=[];if(u.role==='patient'){sql+=' WHERE c.patient_id=?';args.push(u.patientId)}return send(res,200,rows(sql+' ORDER BY consultation_date DESC',...args));}
  if(p==='/api/consultations'&&req.method==='POST'){let u=auth(req,res,['doctor','admin']);if(!u)return;let x=await body(req),cid=uid('CON');db.prepare('INSERT INTO consultations(id,patient_id,doctor,symptoms,observations,diagnosis,treatment,consultation_date) VALUES(?,?,?,?,?,?,?,date(\'now\'))').run(cid,x.patientId,x.doctor,x.symptoms,x.observations||'',x.diagnosis,x.treatment);audit(u,'Saved consultation',cid);return send(res,201,{id:cid});}
  if(p==='/api/prescriptions'&&req.method==='GET'){let u=auth(req,res);if(!u)return;let sql='SELECT r.*,p.full_name patient_name FROM prescriptions r JOIN patients p ON p.id=r.patient_id',args=[];if(u.role==='patient'){sql+=' WHERE r.patient_id=?';args.push(u.patientId)}return send(res,200,rows(sql+' ORDER BY prescription_date DESC',...args));}
  if(p==='/api/prescriptions'&&req.method==='POST'){let u=auth(req,res,['doctor','admin']);if(!u)return;let x=await body(req),rid=uid('PRE');db.prepare('INSERT INTO prescriptions(id,patient_id,doctor,medicine,dosage,duration,refills,instructions,prescription_date) VALUES(?,?,?,?,?,?,?,?,date(\'now\'))').run(rid,x.patientId,x.doctor,x.medicine,x.dosage,x.duration,Number(x.refills||0),x.instructions);db.prepare('INSERT INTO notifications(id,patient_id,type,message) VALUES(?,?,?,?)').run(uid('NOT'),x.patientId,'prescription',`Your prescription for ${x.medicine} is ready.`);audit(u,'Generated prescription',rid);return send(res,201,{id:rid});}
  if(p==='/api/notifications'&&req.method==='GET'){let u=auth(req,res);if(!u)return;return send(res,200,u.role==='patient'?rows('SELECT * FROM notifications WHERE patient_id=? ORDER BY created_at DESC',u.patientId):rows('SELECT * FROM notifications ORDER BY created_at DESC'));}
  if(p==='/api/audit-logs'&&req.method==='GET'){let u=auth(req,res,['admin']);if(u)send(res,200,rows('SELECT * FROM audit_logs ORDER BY occurred_at DESC LIMIT 200'));return;}
  if(p==='/api/analytics'&&req.method==='GET'){let u=auth(req,res,['admin']);if(!u)return;return send(res,200,{patients:db.prepare('SELECT count(*) n FROM patients').get().n,appointments:rows('SELECT status,count(*) count FROM appointments GROUP BY status'),doctorWorkload:rows('SELECT doctor,count(*) count FROM appointments GROUP BY doctor'),consultations:db.prepare('SELECT count(*) n FROM consultations').get().n,prescriptions:db.prepare('SELECT count(*) n FROM prescriptions').get().n});}
  send(res,404,{error:'API route not found'});
 }catch(err){console.error(err);send(res,400,{error:err.message||'Request failed'});}
});
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. MediTrack may already be running at http://localhost:${PORT}.`);
    console.error(`To start another instance, run: $env:PORT=${PORT + 1}; node server.js`);
  } else {
    console.error('Server error:', error.message);
  }
  process.exitCode = 1;
});
server.listen(PORT,()=>console.log(`MediTrack backend running at http://localhost:${PORT}`));
