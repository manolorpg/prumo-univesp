"""Persistência SQLite local e dados exclusivamente demonstrativos."""
import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "data" / "prumo.db"
NAMES = ["Carla Mendes", "Rafael Lima", "Juliana Costa", "Bruno Almeida", "Fernanda Oliveira", "Lucas Ferreira", "Camila Souza", "Gabriel Rodrigues", "Beatriz Alves", "Thiago Martins"]
KINDS = ["Reabilitação ortopédica", "Fisioterapia esportiva", "Pilates terapêutico", "Reabilitação neurológica", "Fisioterapia ortopédica"]

def connect():
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    db = sqlite3.connect(DB_PATH)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    return db

def init_db():
    with connect() as db:
        db.executescript("""
        CREATE TABLE IF NOT EXISTS patients (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, contact TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS appointments (id INTEGER PRIMARY KEY AUTOINCREMENT, patient_id INTEGER NOT NULL REFERENCES patients(id), date TEXT NOT NULL, time TEXT NOT NULL, type TEXT NOT NULL, notes TEXT NOT NULL DEFAULT '', status TEXT NOT NULL CHECK(status IN ('SCHEDULED','IN_PROGRESS','COMPLETED','ABSENT','CANCELLED')), created_at TEXT NOT NULL, updated_at TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS appointment_date_idx ON appointments(date, time);
        """)
        if db.execute("SELECT COUNT(*) FROM patients").fetchone()[0] == 0:
            today = date.today()
            now = today.isoformat()
            for name in NAMES:
                db.execute("INSERT INTO patients(name,contact,active,created_at,updated_at) VALUES(?,?,1,?,?)", (name, "(19) 99999-0000", now, now))
            day_rows = [("08:00",0,"COMPLETED"),("09:00",1,"COMPLETED"),("10:00",2,"COMPLETED"),("11:00",3,"COMPLETED"),("14:00",4,"IN_PROGRESS"),("15:00",5,"SCHEDULED"),("16:00",6,"SCHEDULED"),("17:00",7,"SCHEDULED"),("18:00",8,"SCHEDULED")]
            for offset in range(-6, 1):
                d = (today + timedelta(days=offset)).isoformat()
                rows = day_rows if offset == 0 else [(f"{8+i:02}:00", (i+abs(offset))%10, "ABSENT" if i == 1 and offset % 2 else "COMPLETED") for i in range(4)]
                for tm, person, status in rows:
                    db.execute("INSERT INTO appointments(patient_id,date,time,type,notes,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)", (person+1,d,tm,KINDS[person%len(KINDS)],"",status,now,now))
            for name, tm in [(9,"19:00")]:
                db.execute("INSERT INTO appointments(patient_id,date,time,type,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)", (name+1,today.isoformat(),tm,KINDS[name%len(KINDS)],"SCHEDULED",now,now))
