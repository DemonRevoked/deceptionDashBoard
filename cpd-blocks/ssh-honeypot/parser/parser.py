import os, time, json
from pymongo import MongoClient

# config via env
MONGO_URI = os.getenv("MONGO_URI", "mongodb://mongo:27017/ttylogs")
SCAN_INTERVAL = int(os.getenv("SCAN_INTERVAL", "10"))
TTY_DIR = "/data/ttylogs"
RAW_DIR = "/data/raw"
JSON_DIR = "/data/json"

client = MongoClient(MONGO_URI)
db = client.get_default_database()
collection = db.ssh_sessions

def parse_tty_file(path):
    # very basic stub: read entire file as single blob
    with open(path, "rb") as f:
        data = f.read().decode(errors="ignore")
    return {
        "session_file": os.path.basename(path),
        "content": data,
        "timestamp": time.time()
    }

processed = set()
while True:
    for fname in os.listdir(TTY_DIR):
        src = os.path.join(TTY_DIR, fname)
        if fname not in processed and os.path.isfile(src):
            rec = parse_tty_file(src)
            collection.insert_one(rec)
            processed.add(fname)
    time.sleep(SCAN_INTERVAL)
