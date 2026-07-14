#!/usr/bin/env python3
"""agent-event.py — Puerta canonica del AGENTE para eventos de calendario.

Escribe/lee eventos via el endpoint de agentes de la app (/api/calendar/agent),
que escribe en Google Calendar (via gog server-side) Y actualiza el espejo
calendar_events de Supabase en el mismo movimiento. Asi la app (desktop + web)
muestra el evento al instante.

REGLA: NUNCA uses `gog calendar create` directo para eventos — deja el espejo
stale y la app no se entera hasta el siguiente sync. Este bridge es la unica
pluma; el espejo y Google se actualizan juntos.

Config por variables de entorno (o un .env junto a este script):
  BUSINESS_OS_URL        Base(s) de la app, separadas por coma.
                         Default: http://localhost:3218,http://localhost:3000
                         (desktop Tauri primero, luego dev server)
  OPENCLAW_GATEWAY_TOKEN Token compartido app <-> agente (el mismo del .env de la app)
  GOOGLE_CALENDAR_ACCOUNT Cuenta Google default para escrituras

Uso:
  agent-event.py create --calendar <calendarId> --title "..." --start ISO --end ISO
                        [--account email] [--description ...] [--location ...]
                        [--all-day] [--task-id <uuid>] [--rrule <RRULE>]...
  agent-event.py update --calendar <calendarId> --event-id <id> [--title ...]
                        [--start ISO] [--end ISO] [--description ...] [--account email]
  agent-event.py delete --calendar <calendarId> --event-id <id> [--account email]
  agent-event.py query  --from ISO --to ISO [--calendar <calendarId>]...
  agent-event.py sync   [--from ISO] [--to ISO]

Ejemplo:
  agent-event.py create --calendar "primary" \
    --title "Deep Work: propuesta v2" \
    --start "2026-08-01T09:00:00-06:00" --end "2026-08-01T13:00:00-06:00"
"""

import argparse
import json
import os
import sys
import urllib.request
from datetime import datetime, timedelta

BASES = [
    b.strip().rstrip("/")
    for b in os.environ.get(
        "BUSINESS_OS_URL", "http://localhost:3218,http://localhost:3000"
    ).split(",")
    if b.strip()
]
TOKEN = os.environ.get("OPENCLAW_GATEWAY_TOKEN", "")
DEFAULT_ACCOUNT = os.environ.get("GOOGLE_CALENDAR_ACCOUNT", "")


def call_agent(payload):
    if not TOKEN:
        sys.exit("ERROR: exporta OPENCLAW_GATEWAY_TOKEN (el mismo token del .env de la app)")
    body = json.dumps(payload).encode()
    last_error = None
    for base in BASES:
        req = urllib.request.Request(
            f"{base}/api/calendar/agent",
            data=body,
            headers={"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=120) as res:
                data = json.loads(res.read())
            if data.get("error"):
                sys.exit(f"ERROR del calendar bridge ({base}): {data['error']}")
            return data, base
        except Exception as e:  # server caido en esta base, probar la siguiente
            last_error = e
    sys.exit(f"ERROR: ningun servidor respondio en {BASES}: {last_error}")


def main():
    parser = argparse.ArgumentParser(description="Eventos de calendario via el bridge de agentes")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_create = sub.add_parser("create")
    p_create.add_argument("--calendar", required=True)
    p_create.add_argument("--title", required=True)
    p_create.add_argument("--start", required=True)
    p_create.add_argument("--end", required=True)
    p_create.add_argument("--account", default=DEFAULT_ACCOUNT)
    p_create.add_argument("--description")
    p_create.add_argument("--location")
    p_create.add_argument("--all-day", action="store_true")
    p_create.add_argument("--task-id")
    p_create.add_argument("--rrule", action="append")

    p_update = sub.add_parser("update")
    p_update.add_argument("--calendar", required=True)
    p_update.add_argument("--event-id", required=True)
    p_update.add_argument("--account", default=DEFAULT_ACCOUNT)
    p_update.add_argument("--title")
    p_update.add_argument("--start")
    p_update.add_argument("--end")
    p_update.add_argument("--all-day", action="store_true")
    p_update.add_argument("--description")
    p_update.add_argument("--location")

    p_delete = sub.add_parser("delete")
    p_delete.add_argument("--calendar", required=True)
    p_delete.add_argument("--event-id", required=True)
    p_delete.add_argument("--account", default=DEFAULT_ACCOUNT)

    p_query = sub.add_parser("query")
    p_query.add_argument("--from", dest="from_", required=True)
    p_query.add_argument("--to", required=True)
    p_query.add_argument("--calendar", action="append")

    p_sync = sub.add_parser("sync")
    p_sync.add_argument("--from", dest="from_")
    p_sync.add_argument("--to")

    args = parser.parse_args()

    if args.cmd == "create":
        payload = {
            "action": "create_event",
            "accountEmail": args.account,
            "googleCalendarId": args.calendar,
            "title": args.title,
            "start": args.start,
            "end": args.end,
        }
        if args.description:
            payload["description"] = args.description
        if args.location:
            payload["location"] = args.location
        if args.all_day:
            payload["allDay"] = True
        if args.task_id:
            payload["taskId"] = args.task_id
        if args.rrule:
            payload["recurrence"] = args.rrule
        data, base = call_agent(payload)
        event = data.get("event") or {}
        print(json.dumps({
            "ok": True,
            "base": base,
            "googleEventId": event.get("googleEventId"),
            "title": event.get("title"),
            "start": event.get("start"),
            "end": event.get("end"),
        }, ensure_ascii=False))

    elif args.cmd == "update":
        payload = {
            "action": "update_event",
            "accountEmail": args.account,
            "googleCalendarId": args.calendar,
            "eventId": args.event_id,
        }
        for key, value in [("title", args.title), ("start", args.start), ("end", args.end),
                           ("description", args.description), ("location", args.location)]:
            if value:
                payload[key] = value
        if getattr(args, "all_day", False):
            payload["allDay"] = True
        data, base = call_agent(payload)
        event = data.get("event") or {}
        print(json.dumps({"ok": True, "base": base, "googleEventId": event.get("googleEventId"),
                          "title": event.get("title"), "start": event.get("start")}, ensure_ascii=False))

    elif args.cmd == "delete":
        _, base = call_agent({
            "action": "delete_event",
            "accountEmail": args.account,
            "googleCalendarId": args.calendar,
            "eventId": args.event_id,
        })
        print(json.dumps({"ok": True, "base": base, "deleted": args.event_id}))

    elif args.cmd == "query":
        payload = {"action": "query_events", "from": args.from_, "to": args.to}
        if args.calendar:
            payload["calendarIds"] = args.calendar
        data, base = call_agent(payload)
        events = data.get("events", [])
        print(json.dumps({
            "ok": True,
            "base": base,
            "syncHealth": data.get("syncHealth"),
            "count": len(events),
            "events": [{
                "googleEventId": e.get("googleEventId"),
                "calendar": e.get("calendarName"),
                "title": e.get("title"),
                "start": e.get("start"),
                "end": e.get("end"),
                "allDay": e.get("allDay"),
                "taskId": e.get("taskId"),
            } for e in events],
        }, ensure_ascii=False, indent=2))

    elif args.cmd == "sync":
        now = datetime.now()
        from_ = args.from_ or (now - timedelta(days=7)).strftime("%Y-%m-%dT00:00:00Z")
        to = args.to or (now + timedelta(days=45)).strftime("%Y-%m-%dT00:00:00Z")
        data, base = call_agent({"action": "sync_events", "from": from_, "to": to})
        print(json.dumps({"ok": True, "base": base, "synced": len(data.get("events", [])),
                          "from": from_, "to": to}))


if __name__ == "__main__":
    main()
