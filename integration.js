/* Connects the MediTrack interface to the Node/SQLite API. */
let apiToken = sessionStorage.getItem('meditrack_token') || '';
let apiOnline = false;
const api = async (url, options = {}) => {
  const response = await fetch(`/api${url}`, { ...options, headers: { 'Content-Type': 'application/json', ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}), ...(options.headers || {}) } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const formObject = (form) => Object.fromEntries(new FormData(form).entries());
const apiRole = { admin: 'Administrator', doctor: 'Doctor', patient: 'Patient' };

function injectLogin() {
  const controls = document.querySelector('.top-actions');
  const button = document.createElement('button');
  button.className = 'btn primary'; button.id = 'apiLogin'; button.textContent = apiToken ? 'Connected' : 'Backend login';
  controls.prepend(button);
  document.head.insertAdjacentHTML('beforeend', '<style>.login-modal{position:fixed;inset:0;background:#102e3b99;display:grid;place-items:center;z-index:20}.login-box{width:min(390px,calc(100% - 30px));background:#fff;border-radius:14px;padding:27px;box-shadow:0 20px 60px #0004}.login-box h2{margin:0 0 7px}.login-box p{font-size:13px;color:#718096}.login-error{min-height:18px;color:#be3333;font-size:12px;margin-top:10px}.backend-state{font-size:11px;color:#078173;font-weight:700;margin-left:6px}</style>');
  button.onclick = () => showLogin();
}
function showLogin() {
  document.body.insertAdjacentHTML('beforeend', `<div class="login-modal" id="loginModal"><form class="login-box" id="loginForm"><h2>Connect to MediTrack</h2><p>Sign in to use the secure SQLite backend.</p><label>Email<input name="email" type="email" value="admin@meditrack.local" required></label><label>Password<input name="password" type="password" value="Meditrack@123" required></label><div class="login-error" id="loginError"></div><button class="btn primary" type="submit">Sign in securely</button><button class="btn ghost" type="button" id="closeLogin">Cancel</button></form></div>`);
  $('#closeLogin').onclick = () => $('#loginModal').remove();
  $('#loginForm').onsubmit = async (event) => { event.preventDefault(); try { const data = await api('/auth/login', { method: 'POST', body: JSON.stringify(formObject(event.target)) }); apiToken = data.token; sessionStorage.setItem('meditrack_token', apiToken); role = data.user.role; $('#role').value = role; $('#roleLabel').textContent = apiRole[role]; $('#sr').textContent = apiRole[role]; $('#apiLogin').textContent = 'Connected'; $('#loginModal').remove(); await syncFromApi(); toast('Backend connected. Data is now stored securely in SQLite.'); } catch (error) { $('#loginError').textContent = error.message; } };
}
async function syncFromApi() {
  if (!apiToken) return;
  try {
    const [patients, appointments, consultations, prescriptions, notifications] = await Promise.all([api('/patients'), api('/appointments'), api('/consultations'), api('/prescriptions'), api('/notifications')]);
    s.patients = patients.map(x => ({ id:x.id, name:x.full_name, phone:x.phone, email:x.email, dob:x.date_of_birth, gender:x.gender, address:x.address, blood:x.blood_group, emergency:x.emergency_contact, notes:x.notes }));
    s.appointments = appointments.map(x => ({ id:x.id, patient:x.patient_id, doctor:x.doctor, date:x.appointment_date, time:x.appointment_time, status:x.status }));
    s.consultations = consultations.map(x => ({ id:x.id, patient:x.patient_id, doctor:x.doctor, symptoms:x.symptoms, observations:x.observations, diagnosis:x.diagnosis, treatment:x.treatment, date:x.consultation_date }));
    s.prescriptions = prescriptions.map(x => ({ id:x.id, patient:x.patient_id, doctor:x.doctor, medicine:x.medicine, dosage:x.dosage, duration:x.duration, refills:x.refills, instructions:x.instructions, date:x.prescription_date }));
    s.notifications = notifications.map(x => ({ id:x.id, type:x.type, message:x.message, time:x.created_at, read:!!x.is_read }));
    if (role === 'admin') { try { const logs = await api('/audit-logs'); s.audit = logs.map(x => ({ actor:x.actor, action:x.action, resource:x.resource, time:x.occurred_at })); } catch {} }
    apiOnline = true; render();
  } catch (error) { apiOnline = false; console.warn('Backend sync unavailable', error); }
}
function secureSubmit(selector, requiredRoles, endpoint, map) {
  const form = $(selector); form.onsubmit = async (event) => {
    event.preventDefault();
    if (!apiToken) return showLogin();
    try { await api(endpoint, { method:'POST', body:JSON.stringify(map(formObject(form))) }); form.reset(); if (selector === '#af') $('#date').value = today(); await syncFromApi(); toast('Saved to the MediTrack database.'); }
    catch (error) { toast(error.message); }
  };
}
async function wireBackend() {
  try { await api('/health', { headers: {} }); apiOnline = true; } catch { return; }
  secureSubmit('#pf', ['admin'], '/patients', x => ({ fullName:x.name, phone:x.phone, dob:x.dob, gender:x.gender, email:x.email, address:x.address, bloodGroup:x.blood, emergencyContact:x.emergency, notes:x.notes }));
  secureSubmit('#af', ['admin','doctor'], '/appointments', x => ({ patientId:x.patient, doctor:x.doctor, date:x.date, time:x.time }));
  secureSubmit('#cf', ['admin','doctor'], '/consultations', x => ({ patientId:x.patient, doctor:x.doctor, symptoms:x.symptoms, observations:x.observations, diagnosis:x.diagnosis, treatment:x.treatment }));
  secureSubmit('#rf', ['admin','doctor'], '/prescriptions', x => ({ patientId:x.patient, doctor:x.doctor, medicine:x.medicine, dosage:x.dosage, duration:x.duration, refills:x.refills, instructions:x.instructions }));
  $('#at').onclick = async (event) => { const complete = event.target.closest('[data-complete]'); if (!complete) return; if (!apiToken) return showLogin(); try { await api(`/appointments/${complete.dataset.complete}/complete`, { method:'PUT' }); await syncFromApi(); toast('Appointment marked complete in the database.'); } catch (error) { toast(error.message); } };
  $('#demo').onclick = () => { toast('Use the forms while connected to add records to SQLite.'); };
  if (apiToken) await syncFromApi();
}
injectLogin(); wireBackend();
