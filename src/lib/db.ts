import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";

const dataDir = path.join(process.cwd(), "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, "prumo.db"));
db.exec("PRAGMA foreign_keys = ON");
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL REFERENCES patients(id),
    date TEXT NOT NULL, time TEXT NOT NULL, type TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','ABSENT','CANCELLED')),
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS appointment_date_idx ON appointments(date, time);
`);

const names = ["Carla Mendes", "Rafael Lima", "Juliana Costa", "Bruno Almeida", "Fernanda Oliveira", "Lucas Ferreira", "Camila Souza", "Gabriel Rodrigues", "Beatriz Alves", "Thiago Martins"];
const types = ["Reabilitação ortopédica", "Fisioterapia esportiva", "Pilates terapêutico", "Reabilitação neurológica", "Fisioterapia ortopédica"];

function seedIfEmpty() {
  if (Number((db.prepare("SELECT COUNT(*) AS total FROM patients").get() as { total: number }).total) > 0) return;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const insertPatient = db.prepare("INSERT INTO patients(name,contact,active,created_at,updated_at) VALUES(?,?,1,?,?)");
  const insertAppt = db.prepare("INSERT INTO appointments(patient_id,date,time,type,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)");
  db.exec("BEGIN");
  try {
    for (const name of names) insertPatient.run(name, "(19) 99999-0000", today, today);
    const base = [["08:00",0,"COMPLETED"],["09:00",1,"COMPLETED"],["10:00",2,"COMPLETED"],["11:00",3,"COMPLETED"],["14:00",4,"IN_PROGRESS"],["15:00",5,"SCHEDULED"],["16:00",6,"SCHEDULED"],["17:00",7,"SCHEDULED"],["18:00",8,"SCHEDULED"]] as const;
    for (let offset = -6; offset <= 0; offset++) {
      const d = new Date(`${today}T12:00:00-03:00`); d.setDate(d.getDate() + offset);
      const date = d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
      const rows: readonly (readonly [string, number, string])[] = offset === 0 ? base : Array.from({length:4}, (_,i) => [`${String(8+i).padStart(2,"0")}:00`, (i+Math.abs(offset))%10, i===1 && offset%2!==0 ? "ABSENT" : "COMPLETED"] as [string,number,string]);
      for (const [time, person, status] of rows) insertAppt.run(person+1,date,time,types[person%types.length],"",status,today,today);
    }
    insertAppt.run(10,today,"19:00",types[0],"","SCHEDULED",today,today);
    db.exec("COMMIT");
  } catch (error) { db.exec("ROLLBACK"); throw error; }
}
seedIfEmpty();

export default db;
