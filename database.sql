CREATE TABLE patients (
  patient_id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  phone_number TEXT NOT NULL,
  email_address TEXT NOT NULL,
  residential_address TEXT NOT NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE patient_profiles (
  patient_id TEXT PRIMARY KEY,
  blood_group TEXT NOT NULL,
  allergies TEXT,
  existing_diseases TEXT,
  previous_medical_history TEXT,
  current_medications TEXT,
  emergency_contact TEXT NOT NULL,
  insurance_details TEXT,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE appointments (
  appointment_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Confirmed',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
  UNIQUE (doctor, appointment_date, appointment_time)
);

INSERT INTO patients (
  patient_id,
  full_name,
  age,
  gender,
  date_of_birth,
  phone_number,
  email_address,
  residential_address
) VALUES
('PAT001', 'Rahul Sharma', 22, 'Male', '2004-02-14', '9876543210', 'rahul@example.com', '12 Lake Road, Pune'),
('PAT002', 'Priya Nair', 25, 'Female', '2001-07-21', '9876543211', 'priya@example.com', '48 Green Street, Mumbai');

INSERT INTO patient_profiles (
  patient_id,
  blood_group,
  allergies,
  existing_diseases,
  previous_medical_history,
  current_medications,
  emergency_contact,
  insurance_details
) VALUES
('PAT001', 'O+', 'None', 'None', 'No major previous medical history.', 'None', 'Asha Sharma - 9876500000', 'Basic Health Plan');

INSERT INTO appointments (
  appointment_id,
  patient_id,
  doctor,
  appointment_date,
  appointment_time,
  status
) VALUES
('APT001', 'PAT001', 'Dr. Priya - General Medicine', DATE('now'), '10:00 AM', 'Confirmed');

CREATE TABLE consultations (
  consultation_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor TEXT NOT NULL,
  symptoms TEXT NOT NULL,
  diagnosis TEXT NOT NULL,
  treatment TEXT NOT NULL,
  consultation_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE prescriptions (
  prescription_id TEXT PRIMARY KEY,
  patient_id TEXT NOT NULL,
  doctor TEXT NOT NULL,
  medicine TEXT NOT NULL,
  dosage TEXT NOT NULL,
  duration TEXT NOT NULL,
  prescription_date DATE NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

-- Milestone 3: identity, notifications and accountable access.
CREATE TABLE users (
  user_id TEXT PRIMARY KEY,
  patient_id TEXT,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'doctor', 'patient')),
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE notifications (
  notification_id TEXT PRIMARY KEY,
  user_id TEXT,
  patient_id TEXT,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('appointment', 'prescription', 'follow_up', 'missed_appointment')),
  message TEXT NOT NULL,
  delivery_channel TEXT NOT NULL DEFAULT 'in_app',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id),
  FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE audit_logs (
  audit_id TEXT PRIMARY KEY,
  user_id TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address TEXT,
  occurred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id)
);

-- Frequently-used clinical and scheduling lookups.
CREATE INDEX idx_appointments_patient_date ON appointments(patient_id, appointment_date);
CREATE INDEX idx_consultations_patient_date ON consultations(patient_id, consultation_date);
CREATE INDEX idx_prescriptions_patient_date ON prescriptions(patient_id, prescription_date);
CREATE INDEX idx_notifications_patient_read ON notifications(patient_id, is_read);
CREATE INDEX idx_audit_logs_occurred_at ON audit_logs(occurred_at);
