const STORAGE_KEY = "meditrack_milestone1";
const SLOT_TIMES = ["9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM"];
const DOCTORS = ["Dr. Priya - General Medicine", "Dr. Mehta - Cardiology", "Dr. Sharma - Orthopedics", "Dr. Rao - Pediatrics"];

const state = loadState();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const elements = {
  patientId: $("#patientId"),
  registrationForm: $("#registrationForm"),
  profileForm: $("#profileForm"),
  appointmentForm: $("#appointmentForm"),
  consultationForm: $("#consultationForm"),
  prescriptionForm: $("#prescriptionForm"),
  profilePatientSelect: $("#profilePatientSelect"),
  appointmentPatientSelect: $("#appointmentPatientSelect"),
  consultationPatientSelect: $("#consultationPatientSelect"),
  prescriptionPatientSelect: $("#prescriptionPatientSelect"),
  doctorSelect: $("#doctorSelect"),
  appointmentDate: $("#appointmentDate"),
  timeSlotSelect: $("#timeSlotSelect"),
  slotBoard: $("#slotBoard"),
  patientSearch: $("#patientSearch"),
  appointmentSearch: $("#appointmentSearch"),
  consultationSearch: $("#consultationSearch"),
  prescriptionSearch: $("#prescriptionSearch"),
  recordSearch: $("#recordSearch"),
  toast: $("#toast")
};

function loadState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    return { patients: [], profiles: [], appointments: [], consultations: [], prescriptions: [], selectedRecordId: null };
  }

  try {
    return { patients: [], profiles: [], appointments: [], consultations: [], prescriptions: [], selectedRecordId: null, ...JSON.parse(saved) };
  } catch {
    return { patients: [], profiles: [], appointments: [], consultations: [], prescriptions: [], selectedRecordId: null };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function nextPatientId() {
  const maxNumber = state.patients.reduce((max, patient) => {
    const number = Number(String(patient.patientId).replace("PAT", ""));
    return Number.isFinite(number) ? Math.max(max, number) : max;
  }, 0);
  return `PAT${String(maxNumber + 1).padStart(3, "0")}`;
}

function patientName(patientId) {
  const patient = state.patients.find((item) => item.patientId === patientId);
  return patient ? patient.fullName : "Unknown Patient";
}

function todayValue() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => elements.toast.classList.remove("show"), 2600);
}

function renderAll() {
  renderStats();
  renderPatientId();
  renderPatientOptions();
  renderPatientTable();
  renderProfileCards();
  renderSlots();
  renderAppointmentTable();
  renderRecentAppointments();
  renderConsultationTable();
  renderPrescriptionTable();
  renderRecordList();
  renderRecordDetail();
}

function renderStats() {
  $("#patientCount").textContent = state.patients.length;
  $("#profileCount").textContent = state.profiles.length;
  $("#appointmentCount").textContent = state.appointments.length;
  $("#consultationCount").textContent = state.consultations.length;
  $("#prescriptionCount").textContent = state.prescriptions.length;
  $("#nextPatientId").textContent = nextPatientId();
}

function renderPatientId() {
  elements.patientId.value = nextPatientId();
}

function renderPatientOptions() {
  const options = state.patients
    .map((patient) => `<option value="${patient.patientId}">${patient.patientId} - ${escapeHtml(patient.fullName)}</option>`)
    .join("");
  const empty = '<option value="">Select patient</option>';
  elements.profilePatientSelect.innerHTML = empty + options;
  elements.appointmentPatientSelect.innerHTML = empty + options;
  elements.consultationPatientSelect.innerHTML = empty + options;
  elements.prescriptionPatientSelect.innerHTML = empty + options;
  $$(".doctor-options").forEach((select) => {
    select.innerHTML = '<option value="">Select doctor</option>' + DOCTORS.map((doctor) => `<option>${doctor}</option>`).join("");
  });
}

function renderPatientTable() {
  const query = elements.patientSearch.value.trim().toLowerCase();
  const patients = state.patients.filter((patient) => {
    return [patient.patientId, patient.fullName, patient.phone, patient.email]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  $("#patientTable").innerHTML = patients.length
    ? patients.map((patient) => `
      <tr>
        <td>${patient.patientId}</td>
        <td>${escapeHtml(patient.fullName)}</td>
        <td>${patient.age}</td>
        <td>${escapeHtml(patient.gender)}</td>
        <td>${escapeHtml(patient.phone)}</td>
        <td>${escapeHtml(patient.email)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty-row">No patient records found.</td></tr>';
}

function renderProfileCards() {
  const profileCards = $("#profileCards");
  profileCards.innerHTML = state.profiles.length
    ? state.profiles.map((profile) => `
      <article class="profile-card">
        <h2>${profile.patientId} - ${escapeHtml(patientName(profile.patientId))}</h2>
        <dl>
          <dt>Blood Group</dt><dd>${escapeHtml(profile.bloodGroup)}</dd>
          <dt>Allergies</dt><dd>${escapeHtml(profile.allergies || "None")}</dd>
          <dt>Diseases</dt><dd>${escapeHtml(profile.existingDiseases || "None")}</dd>
          <dt>Medicines</dt><dd>${escapeHtml(profile.currentMedications || "None")}</dd>
          <dt>Emergency</dt><dd>${escapeHtml(profile.emergencyContact)}</dd>
        </dl>
      </article>
    `).join("")
    : '<p class="empty-state">No patient profiles have been created yet.</p>';
}

function renderSlots() {
  const doctor = elements.doctorSelect.value;
  const date = elements.appointmentDate.value;
  const bookedSlots = state.appointments
    .filter((appointment) => appointment.doctor === doctor && appointment.date === date)
    .map((appointment) => appointment.time);

  elements.timeSlotSelect.innerHTML = '<option value="">Select time slot</option>' + SLOT_TIMES
    .map((time) => {
      const booked = bookedSlots.includes(time);
      return `<option value="${time}" ${booked ? "disabled" : ""}>${time}${booked ? " - Booked" : ""}</option>`;
    })
    .join("");

  elements.slotBoard.innerHTML = SLOT_TIMES
    .map((time) => {
      const booked = bookedSlots.includes(time);
      const status = booked ? "Booked" : "Available";
      return `<div class="slot-chip ${booked ? "booked" : "available"}">${time}<br>${status}</div>`;
    })
    .join("");
}

function renderAppointmentTable() {
  const query = elements.appointmentSearch.value.trim().toLowerCase();
  const appointments = state.appointments.filter((appointment) => {
    return [
      appointment.patientId,
      patientName(appointment.patientId),
      appointment.doctor,
      appointment.date,
      appointment.time
    ].join(" ").toLowerCase().includes(query);
  });

  $("#appointmentTable").innerHTML = appointmentRows(appointments);
}

function renderRecentAppointments() {
  const appointments = [...state.appointments]
    .sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`))
    .slice(0, 5);
  $("#recentAppointments").innerHTML = appointmentRows(appointments);
}

function appointmentRows(appointments) {
  return appointments.length
    ? appointments.map((appointment) => `
      <tr>
        <td>${appointment.patientId}</td>
        <td>${escapeHtml(patientName(appointment.patientId))}</td>
        <td>${escapeHtml(appointment.doctor)}</td>
        <td>${appointment.date}</td>
        <td>${appointment.time}</td>
        <td>${escapeHtml(appointment.status)}</td>
      </tr>
    `).join("")
    : '<tr><td colspan="6" class="empty-row">No appointments found.</td></tr>';
}

function renderConsultationTable() {
  const query = elements.consultationSearch.value.trim().toLowerCase();
  const records = state.consultations.filter((item) => [patientName(item.patientId), item.doctor, item.symptoms, item.diagnosis, item.treatment].join(" ").toLowerCase().includes(query));
  $("#consultationTable").innerHTML = records.length ? records.map((item) => `
    <tr><td>${item.patientId}<br><small>${escapeHtml(patientName(item.patientId))}</small></td><td>${escapeHtml(item.doctor)}</td><td>${escapeHtml(item.symptoms)}</td><td>${escapeHtml(item.diagnosis)}</td><td>${escapeHtml(item.treatment)}</td><td>${item.date}</td></tr>
  `).join("") : '<tr><td colspan="6" class="empty-row">No consultation records found.</td></tr>';
}

function renderPrescriptionTable() {
  const query = elements.prescriptionSearch.value.trim().toLowerCase();
  const records = state.prescriptions.filter((item) => [patientName(item.patientId), item.doctor, item.medicine, item.dosage, item.duration].join(" ").toLowerCase().includes(query));
  $("#prescriptionTable").innerHTML = records.length ? records.map((item) => `
    <tr><td>${item.patientId}<br><small>${escapeHtml(patientName(item.patientId))}</small></td><td>${escapeHtml(item.doctor)}</td><td>${escapeHtml(item.medicine)}</td><td>${escapeHtml(item.dosage)}</td><td>${escapeHtml(item.duration)}</td><td>${item.date}</td></tr>
  `).join("") : '<tr><td colspan="6" class="empty-row">No prescription records found.</td></tr>';
}

function renderRecordList() {
  const query = elements.recordSearch.value.trim().toLowerCase();
  const records = state.patients.filter((patient) => {
    return [patient.patientId, patient.fullName, patient.phone, patient.email]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });

  $("#recordList").innerHTML = records.length
    ? records.map((patient) => `
      <button class="record-item ${state.selectedRecordId === patient.patientId ? "active" : ""}" data-record-id="${patient.patientId}" type="button">
        <span class="record-name">${patient.patientId} - ${escapeHtml(patient.fullName)}</span>
        <span class="record-meta">${escapeHtml(patient.phone)} | ${escapeHtml(patient.email)}</span>
      </button>
    `).join("")
    : '<p class="empty-state">No matching records.</p>';
}

function renderRecordDetail() {
  const patient = state.patients.find((item) => item.patientId === state.selectedRecordId);
  const detail = $("#recordDetail");

  if (!patient) {
    detail.innerHTML = `
      <h2>Select a patient record</h2>
      <p>Doctors and hospital staff can retrieve registration, profile and appointment information from here.</p>
    `;
    return;
  }

  const profile = state.profiles.find((item) => item.patientId === patient.patientId);
  const appointments = state.appointments.filter((item) => item.patientId === patient.patientId);
  const consultations = state.consultations.filter((item) => item.patientId === patient.patientId);
  const prescriptions = state.prescriptions.filter((item) => item.patientId === patient.patientId);

  detail.innerHTML = `
    <h2>${patient.patientId} - ${escapeHtml(patient.fullName)}</h2>
    <div class="detail-grid">
      <section class="detail-block">
        <h3>Registration Information</h3>
        <dl>
          <dt>Age</dt><dd>${patient.age}</dd>
          <dt>Gender</dt><dd>${escapeHtml(patient.gender)}</dd>
          <dt>Date of Birth</dt><dd>${patient.dob}</dd>
          <dt>Phone</dt><dd>${escapeHtml(patient.phone)}</dd>
          <dt>Email</dt><dd>${escapeHtml(patient.email)}</dd>
          <dt>Address</dt><dd>${escapeHtml(patient.address)}</dd>
        </dl>
      </section>
      <section class="detail-block">
        <h3>Patient Profile</h3>
        ${profile ? `
          <dl>
            <dt>Blood Group</dt><dd>${escapeHtml(profile.bloodGroup)}</dd>
            <dt>Allergies</dt><dd>${escapeHtml(profile.allergies || "None")}</dd>
            <dt>Diseases</dt><dd>${escapeHtml(profile.existingDiseases || "None")}</dd>
            <dt>History</dt><dd>${escapeHtml(profile.medicalHistory || "None")}</dd>
            <dt>Medicines</dt><dd>${escapeHtml(profile.currentMedications || "None")}</dd>
            <dt>Emergency</dt><dd>${escapeHtml(profile.emergencyContact)}</dd>
            <dt>Insurance</dt><dd>${escapeHtml(profile.insuranceDetails || "None")}</dd>
          </dl>
        ` : '<p class="empty-state">Profile has not been created yet.</p>'}
      </section>
      <section class="detail-block full">
        <h3>Appointment History</h3>
        ${appointments.length ? `
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Doctor</th><th>Date</th><th>Time</th><th>Status</th></tr>
              </thead>
              <tbody>
                ${appointments.map((appointment) => `
                  <tr>
                    <td>${escapeHtml(appointment.doctor)}</td>
                    <td>${appointment.date}</td>
                    <td>${appointment.time}</td>
                    <td>${escapeHtml(appointment.status)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        ` : '<p class="empty-state">No appointments booked for this patient.</p>'}
      </section>
      <section class="detail-block full">
        <h3>Consultation History</h3>
        ${consultations.length ? consultations.map((item) => `<p><strong>${item.date} · ${escapeHtml(item.doctor)}</strong><br>Symptoms: ${escapeHtml(item.symptoms)}<br>Diagnosis: ${escapeHtml(item.diagnosis)}<br>Treatment: ${escapeHtml(item.treatment)}</p>`).join("") : '<p class="empty-state">No consultations recorded for this patient.</p>'}
      </section>
      <section class="detail-block full">
        <h3>Prescription History</h3>
        ${prescriptions.length ? `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Doctor</th><th>Medicine</th><th>Dosage</th><th>Duration</th></tr></thead><tbody>${prescriptions.map((item) => `<tr><td>${item.date}</td><td>${escapeHtml(item.doctor)}</td><td>${escapeHtml(item.medicine)}</td><td>${escapeHtml(item.dosage)}</td><td>${escapeHtml(item.duration)}</td></tr>`).join("")}</tbody></table></div>` : '<p class="empty-state">No prescriptions recorded for this patient.</p>'}
      </section>
    </div>
  `;
}

function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function addPatient(event) {
  event.preventDefault();
  const data = formData(elements.registrationForm);
  const patient = {
    patientId: nextPatientId(),
    fullName: data.fullName.trim(),
    age: data.age,
    gender: data.gender,
    dob: data.dob,
    phone: data.phone.trim(),
    email: data.email.trim(),
    address: data.address.trim(),
    registeredAt: new Date().toISOString()
  };

  state.patients.push(patient);
  state.selectedRecordId = patient.patientId;
  saveState();
  elements.registrationForm.reset();
  renderAll();
  showToast(`${patient.patientId} registered successfully.`);
}

function saveProfile(event) {
  event.preventDefault();
  const data = formData(elements.profileForm);
  const profile = {
    patientId: data.patientId,
    bloodGroup: data.bloodGroup,
    allergies: data.allergies.trim(),
    existingDiseases: data.existingDiseases.trim(),
    medicalHistory: data.medicalHistory.trim(),
    currentMedications: data.currentMedications.trim(),
    emergencyContact: data.emergencyContact.trim(),
    insuranceDetails: data.insuranceDetails.trim(),
    updatedAt: new Date().toISOString()
  };

  const existingIndex = state.profiles.findIndex((item) => item.patientId === profile.patientId);
  if (existingIndex >= 0) {
    state.profiles[existingIndex] = profile;
  } else {
    state.profiles.push(profile);
  }

  state.selectedRecordId = profile.patientId;
  saveState();
  elements.profileForm.reset();
  renderAll();
  showToast(`Profile saved for ${profile.patientId}.`);
}

function bookAppointment(event) {
  event.preventDefault();
  const data = formData(elements.appointmentForm);
  const alreadyBooked = state.appointments.some((appointment) => {
    return appointment.doctor === data.doctor && appointment.date === data.date && appointment.time === data.time;
  });

  if (alreadyBooked) {
    showToast("That time slot is already booked.");
    renderSlots();
    return;
  }

  const appointment = {
    id: uniqueAppointmentId(),
    patientId: data.patientId,
    doctor: data.doctor,
    date: data.date,
    time: data.time,
    status: "Confirmed",
    createdAt: new Date().toISOString()
  };

  state.appointments.push(appointment);
  state.selectedRecordId = appointment.patientId;
  saveState();
  elements.appointmentForm.reset();
  elements.appointmentDate.value = todayValue();
  renderAll();
  showToast("Appointment confirmed and slot marked as booked.");
}

function saveConsultation(event) {
  event.preventDefault();
  const data = formData(elements.consultationForm);
  const consultation = {
    id: uniqueAppointmentId(), patientId: data.patientId, doctor: data.doctor,
    symptoms: data.symptoms.trim(), diagnosis: data.diagnosis.trim(), treatment: data.treatment.trim(),
    date: todayValue(), createdAt: new Date().toISOString()
  };
  state.consultations.unshift(consultation);
  state.selectedRecordId = consultation.patientId;
  saveState();
  elements.consultationForm.reset();
  renderAll();
  showToast(`Consultation saved for ${consultation.patientId}.`);
}

function generatePrescription(event) {
  event.preventDefault();
  const data = formData(elements.prescriptionForm);
  const prescription = {
    id: uniqueAppointmentId(), patientId: data.patientId, doctor: data.doctor,
    medicine: data.medicine.trim(), dosage: data.dosage.trim(), duration: data.duration.trim(),
    date: todayValue(), createdAt: new Date().toISOString()
  };
  state.prescriptions.unshift(prescription);
  state.selectedRecordId = prescription.patientId;
  saveState();
  elements.prescriptionForm.reset();
  renderAll();
  showToast(`Prescription generated for ${prescription.patientId}.`);
}

function uniqueAppointmentId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }

  return `APT${Date.now()}`;
}

function loadDemoData() {
  state.patients = [
    {
      patientId: "PAT001",
      fullName: "Rahul Sharma",
      age: "22",
      gender: "Male",
      dob: "2004-02-14",
      phone: "9876543210",
      email: "rahul@example.com",
      address: "12 Lake Road, Pune",
      registeredAt: new Date().toISOString()
    },
    {
      patientId: "PAT002",
      fullName: "Priya Nair",
      age: "25",
      gender: "Female",
      dob: "2001-07-21",
      phone: "9876543211",
      email: "priya@example.com",
      address: "48 Green Street, Mumbai",
      registeredAt: new Date().toISOString()
    }
  ];
  state.profiles = [
    {
      patientId: "PAT001",
      bloodGroup: "O+",
      allergies: "None",
      existingDiseases: "None",
      medicalHistory: "No major previous medical history.",
      currentMedications: "None",
      emergencyContact: "Asha Sharma - 9876500000",
      insuranceDetails: "Basic Health Plan",
      updatedAt: new Date().toISOString()
    }
  ];
  state.appointments = [
    {
      id: "APT001",
      patientId: "PAT001",
      doctor: "Dr. Priya - General Medicine",
      date: todayValue(),
      time: "10:00 AM",
      status: "Confirmed",
      createdAt: new Date().toISOString()
    }
  ];
  state.consultations = [
    { id: "CON001", patientId: "PAT001", doctor: "Dr. Priya - General Medicine", symptoms: "Fever and sore throat", diagnosis: "Viral upper respiratory infection", treatment: "Rest, fluids and follow-up if symptoms persist.", date: todayValue(), createdAt: new Date().toISOString() }
  ];
  state.prescriptions = [
    { id: "PRE001", patientId: "PAT001", doctor: "Dr. Priya - General Medicine", medicine: "Paracetamol", dosage: "500 mg every 6 hours as needed", duration: "3 days", date: todayValue(), createdAt: new Date().toISOString() }
  ];
  state.selectedRecordId = "PAT001";
  saveState();
  renderAll();
  showToast("Demo records loaded.");
}

function clearData() {
  if (!window.confirm("Clear all MediTrack data stored in this browser?")) {
    return;
  }

  state.patients = [];
  state.profiles = [];
  state.appointments = [];
  state.consultations = [];
  state.prescriptions = [];
  state.selectedRecordId = null;
  saveState();
  renderAll();
  showToast("All MediTrack data cleared.");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function bindEvents() {
  $$(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      $$(".tab-btn").forEach((item) => item.classList.remove("active"));
      $$(".tab-panel").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      $(`#${button.dataset.tab}`).classList.add("active");
    });
  });

  elements.registrationForm.addEventListener("submit", addPatient);
  elements.profileForm.addEventListener("submit", saveProfile);
  elements.appointmentForm.addEventListener("submit", bookAppointment);
  elements.consultationForm.addEventListener("submit", saveConsultation);
  elements.prescriptionForm.addEventListener("submit", generatePrescription);
  elements.patientSearch.addEventListener("input", renderPatientTable);
  elements.appointmentSearch.addEventListener("input", renderAppointmentTable);
  elements.consultationSearch.addEventListener("input", renderConsultationTable);
  elements.prescriptionSearch.addEventListener("input", renderPrescriptionTable);
  elements.recordSearch.addEventListener("input", () => {
    renderRecordList();
    renderRecordDetail();
  });
  elements.doctorSelect.addEventListener("change", renderSlots);
  elements.appointmentDate.addEventListener("change", renderSlots);
  $("#loadDemoBtn").addEventListener("click", loadDemoData);
  $("#clearDataBtn").addEventListener("click", clearData);

  $("#recordList").addEventListener("click", (event) => {
    const item = event.target.closest("[data-record-id]");
    if (!item) return;
    state.selectedRecordId = item.dataset.recordId;
    saveState();
    renderRecordList();
    renderRecordDetail();
  });
}

elements.appointmentDate.min = todayValue();
elements.appointmentDate.value = todayValue();
bindEvents();
renderAll();
