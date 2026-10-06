"""Servidor HTTP e API JSON do PRUMO, sem dependências externas."""
import json
import re
from datetime import date, datetime
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from database import connect, init_db

ROOT = Path(__file__).parent
STATUSES = {"SCHEDULED", "IN_PROGRESS", "COMPLETED", "ABSENT", "CANCELLED"}

def patient_row(row): return {"id":row["id"],"name":row["name"],"contact":row["contact"],"active":bool(row["active"])}
def appointment_row(row): return {"id":row["id"],"patientId":row["patient_id"],"patientName":row["patient_name"],"date":row["date"],"time":row["time"],"type":row["type"],"notes":row["notes"],"status":row["status"]}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT/"python-reference"/"static"),**kwargs)
    def log_message(self,fmt,*args): print("[PRUMO] "+fmt%args)
    def send_json(self,data,status=200):
        body=json.dumps(data,ensure_ascii=False).encode(); self.send_response(status); self.send_header("Content-Type","application/json; charset=utf-8"); self.send_header("Content-Length",str(len(body))); self.send_header("Access-Control-Allow-Origin","*"); self.end_headers(); self.wfile.write(body)
    def read_json(self):
        try: return json.loads(self.rfile.read(int(self.headers.get("Content-Length",0))) or b"{}")
        except (ValueError,UnicodeDecodeError): raise ValueError("Envie um JSON válido.")
    def do_OPTIONS(self): self.send_response(204); self.send_header("Access-Control-Allow-Origin","*"); self.send_header("Access-Control-Allow-Methods","GET,POST,PUT,DELETE,OPTIONS"); self.send_header("Access-Control-Allow-Headers","Content-Type"); self.end_headers()
    def do_GET(self):
        parsed=urlparse(self.path); path=parsed.path; q=parse_qs(parsed.query)
        try:
            with connect() as db:
                if path=="/api/patients":
                    rows=db.execute("SELECT * FROM patients ORDER BY name").fetchall(); return self.send_json([patient_row(r) for r in rows])
                if path.startswith("/api/patients/"):
                    row=db.execute("SELECT * FROM patients WHERE id=?",(path.rsplit('/',1)[-1],)).fetchone(); return self.send_json(patient_row(row) if row else {"error":"Paciente não encontrado."},200 if row else 404)
                if path=="/api/appointments" or path=="/api/frequency":
                    sql="SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE 1=1"; args=[]
                    for key,col in (("date","a.date"),("from","a.date"),("to","a.date"),("patientId","a.patient_id"),("status","a.status")):
                        val=q.get(key,[None])[0]
                        if val:
                            sql += f" AND {col}{' >= ' if key=='from' else ' <= ' if key=='to' else ' = '}?"; args.append(val)
                    rows=db.execute(sql+" ORDER BY a.date,a.time",args).fetchall(); return self.send_json([appointment_row(r) for r in rows])
                if path.startswith("/api/appointments/"):
                    row=db.execute("SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=?",(path.rsplit('/',1)[-1],)).fetchone(); return self.send_json(appointment_row(row) if row else {"error":"Agendamento não encontrado."},200 if row else 404)
                if path=="/api/dashboard": return self.send_json(self.dashboard(db))
                return super().do_GET()
        except Exception as e: return self.send_json({"error":str(e)},500)
    def dashboard(self,db):
        today=date.today().isoformat(); rows=db.execute("SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.date=? ORDER BY a.time",(today,)).fetchall(); allr=[appointment_row(r) for r in rows]
        counts={s:sum(a['status']==s for a in allr) for s in STATUSES}
        week=[]
        for i in range(6,-1,-1):
            d=date.today().fromordinal(date.today().toordinal()-i); c=db.execute("SELECT status,COUNT(*) n FROM appointments WHERE date=? GROUP BY status",(d.isoformat(),)).fetchall(); m={r['status']:r['n'] for r in c}; week.append({"day":d.strftime("%a"),"completed":m.get("COMPLETED",0),"absent":m.get("ABSENT",0)})
        upcoming=[a for a in allr if a['status'] in ("SCHEDULED","IN_PROGRESS")]
        return {"date":today,"appointments":allr,"counts":counts,"todayCount":len(allr),"upcoming":upcoming,"weekly":week}
    def do_POST(self): self.mutate("POST")
    def do_PUT(self): self.mutate("PUT")
    def do_DELETE(self): self.mutate("DELETE")
    def mutate(self,method):
        path=urlparse(self.path).path
        try:
            data={} if method=="DELETE" else self.read_json(); now=date.today().isoformat()
            with connect() as db:
                if path=="/api/patients" and method=="POST" or path.startswith("/api/patients/"):
                    ident=path.rsplit('/',1)[-1] if path!="/api/patients" else None
                    if method=="DELETE":
                        if db.execute("SELECT COUNT(*) FROM appointments WHERE patient_id=? AND status!='CANCELLED'",(ident,)).fetchone()[0]: return self.send_json({"error":"Este paciente tem atendimentos no histórico e não pode ser removido. Desative o cadastro."},409)
                        cur=db.execute("DELETE FROM patients WHERE id=?",(ident,)); return self.send_json({},204) if cur.rowcount else self.send_json({"error":"Paciente não encontrado."},404)
                    name=str(data.get("name","")).strip(); contact=str(data.get("contact","")).strip()
                    if not name: return self.send_json({"error":"Informe o nome do paciente."},400)
                    active=1 if data.get("active",True) else 0
                    if method=="POST": cur=db.execute("INSERT INTO patients(name,contact,active,created_at,updated_at) VALUES(?,?,?,?,?)",(name,contact,active,now,now)); ident=cur.lastrowid
                    else: db.execute("UPDATE patients SET name=?,contact=?,active=?,updated_at=? WHERE id=?",(name,contact,active,now,ident))
                    row=db.execute("SELECT * FROM patients WHERE id=?",(ident,)).fetchone(); return self.send_json(patient_row(row),201 if method=="POST" else 200)
                if path=="/api/appointments" and method=="POST" or path.startswith("/api/appointments/"):
                    ident=path.rsplit('/',1)[-1] if path!="/api/appointments" else None
                    if method=="DELETE":
                        cur=db.execute("DELETE FROM appointments WHERE id=?",(ident,)); return self.send_json({},204) if cur.rowcount else self.send_json({"error":"Agendamento não encontrado."},404)
                    required=("patientId","date","time","type"); missing=[x for x in required if not str(data.get(x,"")).strip()]
                    if missing: return self.send_json({"error":"Preencha paciente, data, horário e tipo de atendimento."},400)
                    try: datetime.strptime(data["date"],"%Y-%m-%d"); datetime.strptime(data["time"],"%H:%M")
                    except ValueError: return self.send_json({"error":"Confira a data e o horário informados."},400)
                    status=data.get("status","SCHEDULED")
                    if status not in STATUSES: return self.send_json({"error":"Status inválido."},400)
                    if not db.execute("SELECT id FROM patients WHERE id=? AND active=1",(data["patientId"],)).fetchone(): return self.send_json({"error":"Selecione um paciente ativo."},400)
                    vals=(data["patientId"],data["date"],data["time"],str(data["type"]).strip(),str(data.get("notes","")).strip(),status,now)
                    if method=="POST": cur=db.execute("INSERT INTO appointments(patient_id,date,time,type,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)",(*vals,now)); ident=cur.lastrowid
                    else: db.execute("UPDATE appointments SET patient_id=?,date=?,time=?,type=?,notes=?,status=?,updated_at=? WHERE id=?",(*vals,ident))
                    row=db.execute("SELECT a.*,p.name patient_name FROM appointments a JOIN patients p ON p.id=a.patient_id WHERE a.id=?",(ident,)).fetchone(); return self.send_json(appointment_row(row),201 if method=="POST" else 200)
                return self.send_json({"error":"Rota não encontrada."},404)
        except ValueError as e: return self.send_json({"error":str(e)},400)
        except Exception as e: return self.send_json({"error":"Não foi possível salvar. Verifique os dados e tente novamente."},500)

if __name__=="__main__":
    init_db(); print("PRUMO disponível em http://localhost:8000"); ThreadingHTTPServer(("127.0.0.1",8000),Handler).serve_forever()
