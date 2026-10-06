import db from "./db.ts";

export const statuses = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ABSENT", "CANCELLED"] as const;
export type AppointmentStatus = (typeof statuses)[number];
export type AppointmentInput = { patientId: number; date: string; time: string; type: string; notes?: string; status?: AppointmentStatus };
export type PatientInput = { name: string; contact?: string; active?: boolean };

export function listPatients() {
  return db.prepare("SELECT id,name,contact,active FROM patients ORDER BY name").all().map((row) => ({ ...row, active: Boolean((row as {active:number}).active) }));
}
export function getPatient(id: number) {
  const row = db.prepare("SELECT id,name,contact,active FROM patients WHERE id=?").get(id) as { id:number; name:string; contact:string; active:number } | undefined;
  return row ? {...row,active:Boolean(row.active)} : null;
}
export function savePatient(input: PatientInput, id?: number) {
  const name=input.name?.trim(); if(!name) throw new Error("Informe o nome do paciente.");
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
  if(id) db.prepare("UPDATE patients SET name=?,contact=?,active=?,updated_at=? WHERE id=?").run(name,input.contact?.trim()??"",input.active===false?0:1,today,id);
  else id=Number(db.prepare("INSERT INTO patients(name,contact,active,created_at,updated_at) VALUES(?,?,?,?,?)").run(name,input.contact?.trim()??"",input.active===false?0:1,today,today).lastInsertRowid);
  return getPatient(id);
}
export function deletePatient(id:number) {
  const used=Number((db.prepare("SELECT COUNT(*) total FROM appointments WHERE patient_id=?").get(id) as {total:number}).total);
  if(used) throw new Error("Este paciente tem atendimentos no histórico e não pode ser removido. Desative o cadastro.");
  return db.prepare("DELETE FROM patients WHERE id=?").run(id).changes>0;
}
export function listAppointments(filters: {date?:string; from?:string; to?:string; patientId?:number; status?:string}={}) {
  let sql="SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE 1=1"; const args:(string|number)[]=[];
  if(filters.date){sql+=" AND a.date=?";args.push(filters.date)}
  if(filters.from){sql+=" AND a.date>=?";args.push(filters.from)}
  if(filters.to){sql+=" AND a.date<=?";args.push(filters.to)}
  if(filters.patientId){sql+=" AND a.patient_id=?";args.push(filters.patientId)}
  if(filters.status){sql+=" AND a.status=?";args.push(filters.status)}
  return db.prepare(sql+" ORDER BY a.date,a.time").all(...args).map(mapAppointment);
}
export function getAppointment(id:number) {
  const row=db.prepare("SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=?").get(id);
  return row?mapAppointment(row):null;
}
function mapAppointment(row:unknown) { const a=row as Record<string,unknown>; return {id:a.id,patientId:a.patient_id,patientName:a.patient_name,date:a.date,time:a.time,type:a.type,notes:a.notes,status:a.status}; }
export function saveAppointment(input:AppointmentInput,id?:number) {
  const {patientId,date,time,type}=input;
  if(!patientId||!date||!time||!type?.trim()) throw new Error("Preencha paciente, data, horário e tipo de atendimento.");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(`${date}T12:00:00`))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error("Confira a data e o horário informados.");
  const status=input.status??"SCHEDULED"; if(!statuses.includes(status)) throw new Error("Status inválido.");
  const patient=db.prepare("SELECT id FROM patients WHERE id=? AND active=1").get(patientId); if(!patient) throw new Error("Selecione um paciente ativo.");
  const today=new Date().toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});
  if(id){db.prepare("UPDATE appointments SET patient_id=?,date=?,time=?,type=?,notes=?,status=?,updated_at=? WHERE id=?").run(patientId,date,time,type.trim(),input.notes?.trim()??"",status,today,id);if(!getAppointment(id))return null}
  else id=Number(db.prepare("INSERT INTO appointments(patient_id,date,time,type,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)").run(patientId,date,time,type.trim(),input.notes?.trim()??"",status,today,today).lastInsertRowid);
  return getAppointment(id);
}
export function deleteAppointment(id:number) { return db.prepare("DELETE FROM appointments WHERE id=?").run(id).changes>0; }
export function dashboardData(today:string) {
  const appointments=listAppointments({date:today});
  const counts=Object.fromEntries(statuses.map(s=>[s,appointments.filter((a)=>a.status===s).length])) as Record<AppointmentStatus,number>;
  const weekly=Array.from({length:7},(_,i)=>{const d=new Date(`${today}T12:00:00-03:00`);d.setDate(d.getDate()-6+i);const date=d.toLocaleDateString("en-CA",{timeZone:"America/Sao_Paulo"});const rows=listAppointments({date});return {day:new Intl.DateTimeFormat("pt-BR",{weekday:"short",timeZone:"America/Sao_Paulo"}).format(d).replace(".",""),completed:rows.filter((a)=>a.status==="COMPLETED").length,absent:rows.filter((a)=>a.status==="ABSENT").length}});
  return {date:today,appointments,counts,todayCount:appointments.length,upcoming:appointments.filter((a)=>a.status==="SCHEDULED"||a.status==="IN_PROGRESS"),weekly};
}
