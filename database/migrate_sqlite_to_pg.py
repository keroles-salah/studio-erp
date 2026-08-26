# -*- coding: utf-8 -*-
"""
Studio ERP - SQLite -> PostgreSQL one-shot data migration.
- Discovers tables/columns from SQLite directly (no guessing).
- Tables in FK-safe order.
- Converts epoch-ms datetimes -> Postgres TIMESTAMP.
- Handles JSON columns (settings.value, notifications.data, segmentRules).
Credentials come from environment variables:
  SUPABASE_DB_HOST, SUPABASE_DB_PASSWORD, (optional) SUPABASE_DB_USER
"""
import sqlite3, json, datetime, os
from pathlib import Path
import psycopg2
import psycopg2.extras

ROOT = Path(r"C:\Users\ke_ro\Downloads\studio-erp-updated\studio-erp")
SQLITE_PATH = ROOT / "backend" / "prisma" / "dev.db"

PG = {
    "host": os.environ.get("SUPABASE_DB_HOST", "db.<PROJECT-REF>.supabase.co"),
    "port": 5432,
    "user": os.environ.get("SUPABASE_DB_USER", "postgres"),
    "password": os.environ.get("SUPABASE_DB_PASSWORD", ""),
    "dbname": "postgres",
    "sslmode": "require",
}

# FK-safe order: independent -> parents -> children -> relation tables
ORDER = [
    "roles", "permissions", "_PermissionToRole",
    "users", "settings", "suppliers", "services", "equipment",
    "customers", "customer_documents", "communications", "leads",
    "bookings", "events", "booking_services", "booking_equipment",
    "external_rentals", "invoices", "invoice_items", "payments",
    "expenses", "marketing_campaigns", "campaign_recipients",
    "notifications", "audit_logs", "refresh_tokens",
]


def is_epoch_ms(v):
    return isinstance(v, int) and v > 10**12


def iso_from_ms(v):
    return datetime.datetime.fromtimestamp(v / 1000.0, tz=datetime.timezone.utc)


def main():
    if "<PROJECT-REF>" in PG["host"] or not PG["password"]:
        raise SystemExit("Set SUPABASE_DB_HOST and SUPABASE_DB_PASSWORD environment variables first.")

    lite = sqlite3.connect(str(SQLITE_PATH))
    lcur = lite.cursor()

    print(f"Connecting to {PG['host']} ...")
    pg = psycopg2.connect(**PG)
    pcur = pg.cursor()
    print("Connected.")

    report = []
    for t in ORDER:
        exists = lcur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (t,)
        ).fetchone()
        if not exists:
            report.append((t, "SKIP (not in SQLite)"))
            continue

        cols = [c[1] for c in lcur.execute(f"PRAGMA table_info('{t}')")]
        # Circular FK bookings <-> events: phase 1 inserts bookings without eventId,
        # then events are inserted, then bookings.eventId is back-linked via UPDATE.
        if t == "bookings" and "eventId" in cols:
            cols = [c for c in cols if c != "eventId"]
        col_q = ", ".join(f'"{c}"' for c in cols)
        rows = lcur.execute(f'SELECT {col_q} FROM "{t}"').fetchall()
        if not rows:
            report.append((t, "0 rows, skipped"))
            continue

        pcur.execute(
            """SELECT column_name, data_type FROM information_schema.columns
               WHERE table_schema='public' AND table_name=%s""",
            (t,),
        )
        pg_types = dict(pcur.fetchall())
        ts_cols = {c for c in cols if "time" in pg_types.get(c, "") or "date" in pg_types.get(c, "")}
        json_cols = {c for c in cols if pg_types.get(c) in ("jsonb", "json")}
        bool_cols = {c for c in cols if pg_types.get(c) == "boolean"}

        converted = []
        for row in rows:
            new = []
            for c, v in zip(cols, row):
                if v is None:
                    new.append(None)
                elif c in ts_cols and is_epoch_ms(v):
                    new.append(iso_from_ms(v))
                elif c in bool_cols:
                    new.append(bool(v))
                elif c in json_cols and isinstance(v, str):
                    try:
                        new.append(psycopg2.extras.Json(json.loads(v)))
                    except Exception:
                        new.append(None)
                else:
                    new.append(v)
            converted.append(tuple(new))

        placeholders = ", ".join(["%s"] * len(cols))
        insert_sql = f'INSERT INTO "{t}" ({col_q}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
        try:
            psycopg2.extras.execute_batch(pcur, insert_sql, converted, page_size=500)
            pg.commit()
        except Exception as e:
            pg.rollback()
            report.append((t, f"FAILED: {str(e).splitlines()[0][:120]}"))
            continue
        report.append((t, f"{len(rows)} rows migrated"))

        if t == "events":
            # Phase 2 of the circular FK resolution: restore bookings.eventId
            pcur.execute(
                'UPDATE bookings b SET "eventId" = e.id FROM events e WHERE b.id = e."bookingId"'
            )
            pg.commit()
            report.append(("bookings.eventId", "back-linked from events"))

    print("\n=== MIGRATION REPORT ===")
    for t, msg in report:
        print(f"  {t:25s} {msg}")

    print("\n=== POSTGRES COUNTS vs SQLITE ===")
    ok = True
    for t in ORDER:
        exists = lcur.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name=?", (t,)
        ).fetchone()
        if not exists:
            continue
        s = lcur.execute(f'SELECT COUNT(*) FROM "{t}"').fetchone()[0]
        pcur.execute(f'SELECT COUNT(*) FROM "{t}"')
        p = pcur.fetchone()[0]
        mark = "OK" if p >= s else "*** MISMATCH ***"
        if p < s:
            ok = False
        print(f"  {t:25s} sqlite={s:5d}  postgres={p:5d}  {mark}")

    print("\nRESULT:", "ALL OK" if ok else "MISMATCHES FOUND")
    pcur.close()
    pg.close()


if __name__ == "__main__":
    main()
