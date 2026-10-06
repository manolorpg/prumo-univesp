import test from "node:test";
import assert from "node:assert/strict";
import { deleteAppointment, deletePatient, dashboardData, getAppointment, getPatient, listAppointments, saveAppointment, savePatient } from "../src/lib/appointments.ts";

test("pacientes, agendamentos, status e indicadores persistem no mesmo SQLite", () => {
  const token = `${Date.now()}`;
  let patientId;
  const appointmentIds = [];
  try {
    const patient = savePatient({ name: `Teste PRUMO ${token}`, contact: "(19) 98888-0000" });
    assert.ok(patient); patientId = patient.id;
    assert.equal(getPatient(patientId)?.name, `Teste PRUMO ${token}`);

    const date = new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
    const base = { patientId, date, time: "20:00", type: "Pilates terapêutico", notes: "Fluxo automatizado" };
    const created = saveAppointment(base); assert.ok(created); appointmentIds.push(created.id);
    assert.equal(created.patientName, patient.name);
    assert.equal(listAppointments({ date }).some((a) => a.id === created.id), true);

    const updated = saveAppointment({ ...base, time: "20:30", status: "COMPLETED" }, created.id);
    assert.equal(updated?.time, "20:30"); assert.equal(updated?.status, "COMPLETED");
    assert.equal(getAppointment(created.id)?.status, "COMPLETED");

    const absent = saveAppointment({ ...base, time: "20:45", status: "ABSENT" }); assert.ok(absent); appointmentIds.push(absent.id);
    const cancelled = saveAppointment({ ...base, time: "21:00", status: "CANCELLED" }); assert.ok(cancelled); appointmentIds.push(cancelled.id);
    const dashboard = dashboardData(date);
    assert.ok(dashboard.counts.COMPLETED >= 1);
    assert.ok(dashboard.counts.ABSENT >= 1);
    assert.ok(dashboard.counts.CANCELLED >= 1);
    assert.equal(dashboard.weekly.length, 7);
    assert.equal(listAppointments({ date, status: "ABSENT" }).some((a) => a.id === absent.id), true);
    assert.throws(() => saveAppointment({ ...base, patientId: -1 }), /paciente ativo/i);
    assert.throws(() => deletePatient(patientId), /histórico/i, "paciente com histórico não deve ser removido");
  } finally {
    for (const id of appointmentIds) deleteAppointment(id);
    if (patientId) assert.equal(deletePatient(patientId), true);
  }
});
