# MongoDB Schema for advDeception Platform

This document describes the extensible, protocol-agnostic schema for supporting multiple honeypots (IT/OT) and protocols.

---

## 1. honeypots
_Registry and orchestration of all honeypots._

```json
{
  "_id": ObjectId("..."),
  "name": "ssh-honeypot",
  "protocol": "ssh",
  "type": "IT",
  "status": "running",
  "host": "10.0.44.32",
  "port": 2222,
  "config": {
    "timer": 3600,
    "custom_setting": "value"
  },
  "last_heartbeat": ISODate("2024-06-10T12:00:00Z"),
  "created_at": ISODate("2024-06-01T10:00:00Z"),
  "updated_at": ISODate("2024-06-10T12:00:00Z")
}
```

---

## 2. raw_logs
_Stores unprocessed logs for auditing and reprocessing._

```json
{
  "_id": ObjectId("..."),
  "honeypot_id": ObjectId("..."),
  "protocol": "ssh",
  "timestamp": ISODate("2024-06-10T12:05:00Z"),
  "raw_data": "raw log content or file reference",
  "source_ip": "192.168.1.100",
  "meta": {
    "filename": "ttylog-20240610-1205.log",
    "parser_version": "1.0"
  }
}
```

---

## 3. events
_Stores parsed/normalized events for all protocols._

```json
{
  "_id": ObjectId("..."),
  "honeypot_id": ObjectId("..."),
  "protocol": "ssh",
  "event_type": "session",
  "timestamp": ISODate("2024-06-10T12:05:00Z"),
  "source_ip": "192.168.1.100",
  "data": {
    "commands": ["ls", "cat /etc/passwd"],
    "session_duration": 120,
    "username": "root"
  },
  "raw_log_id": ObjectId("...")
}
```

---

## 4. analyses
_AI verdicts and threat intelligence per IP/protocol/honeypot._

```json
{
  "_id": ObjectId("..."),
  "source_ip": "192.168.1.100",
  "protocol": "ssh",
  "honeypot_id": ObjectId("..."),
  "verdict": "Likely automated scanning for weak credentials.",
  "details": {
    "model": "gpt-4o-mini",
    "prompt": "session summary...",
    "confidence": 0.92
  },
  "created_at": ISODate("2024-06-10T12:10:00Z"),
  "updated_at": ISODate("2024-06-10T12:10:00Z")
}
```

---

## Notes
- All collections are protocol-agnostic and extensible.
- You can add new honeypot types, protocols, and event types without schema changes.
- The `honeypot_id` field links logs/events/analyses to the honeypot registry for orchestration and filtering.
- The `data` field in `events` is a flexible JSON object for protocol-specific data. 