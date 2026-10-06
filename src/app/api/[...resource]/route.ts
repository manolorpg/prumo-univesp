import { NextRequest, NextResponse } from "next/server";
import { dashboardData, deleteAppointment, deletePatient, getAppointment, getPatient, listAppointments, listPatients, saveAppointment, savePatient } from "@/lib/appointments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function error(message:string,status=400){return NextResponse.json({error:message},{status})}
function idFrom(req:NextRequest){const raw=req.nextUrl.pathname.split("/").filter(Boolean).at(-1)??"";return /^\d+$/.test(raw)?Number(raw):null}
export async function GET(req:NextRequest){
  try{
    const path=req.nextUrl.pathname.split("/").filter(Boolean).slice(1);const last=path.at(-1);const q=req.nextUrl.searchParams;
    if(path[0]==="patients") { if(last&&last!=="patients"){const patient=getPatient(Number(last));return patient?NextResponse.json(patient):error("Paciente não encontrado.",404)} return NextResponse.json(listPatients()) }
    if(path[0]==="appointments"||path[0]==="frequency") { if(last&&last!==path[0]){const appointment=getAppointment(Number(last));return appointment?NextResponse.json(appointment):error("Agendamento não encontrado.",404)} return NextResponse.json(listAppointments({date:q.get("date")||undefined,from:q.get("from")||undefined,to:q.get("to")||undefined,patientId:q.has("patientId")?Number(q.get("patientId")):undefined,status:q.get("status")||undefined})) }
    if(path[0]==="dashboard")return NextResponse.json(dashboardData(new Intl.DateTimeFormat("en-CA",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date())));
    return error("Rota não encontrada.",404);
  }catch{return error("Não foi possível carregar os dados.",500)}
}
export async function POST(req:NextRequest){try{const body=await req.json();const path=req.nextUrl.pathname.split("/").filter(Boolean)[1];if(path==="patients"){const patient=savePatient(body);return NextResponse.json(patient,{status:201})}if(path==="appointments"){const appointment=saveAppointment(body);return NextResponse.json(appointment,{status:201})}return error("Rota não encontrada.",404)}catch(e){return error(e instanceof Error?e.message:"Dados inválidos.")}}
export async function PUT(req:NextRequest){try{const id=idFrom(req);if(!id)return error("Identificador inválido.");const body=await req.json();const path=req.nextUrl.pathname.split("/").filter(Boolean)[1];if(path==="patients"){const patient=savePatient(body,id);return patient?NextResponse.json(patient):error("Paciente não encontrado.",404)}if(path==="appointments"){const appointment=saveAppointment(body,id);return appointment?NextResponse.json(appointment):error("Agendamento não encontrado.",404)}return error("Rota não encontrada.",404)}catch(e){return error(e instanceof Error?e.message:"Dados inválidos.")}}
export async function DELETE(req:NextRequest){try{const id=idFrom(req);if(!id)return error("Identificador inválido.");const path=req.nextUrl.pathname.split("/").filter(Boolean)[1];const removed=path==="patients"?deletePatient(id):path==="appointments"?deleteAppointment(id):false;return removed?new NextResponse(null,{status:204}):error("Registro não encontrado.",404)}catch(e){return error(e instanceof Error?e.message:"Não foi possível remover o registro.",409)}}
