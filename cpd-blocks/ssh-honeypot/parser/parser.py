#!/usr/bin/env python3
import os
import re
import json
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import pymongo
from threading import Lock

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://mongo:27017/advdeception')
HONEYPOT_NAME = os.getenv('HONEYPOT_NAME', 'ssh-honeypot')

# Paths
SSH_SESSIONS_DIR = Path('/data/ssh_sessions')
RAW_LOGS_DIR = Path('/data/raw')
JSON_LOGS_DIR = Path('/data/json')

# Ensure directories exist
SSH_SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
RAW_LOGS_DIR.mkdir(parents=True, exist_ok=True)
JSON_LOGS_DIR.mkdir(parents=True, exist_ok=True)

class SessionParser:
    def __init__(self):
        # Connect to MongoDB
        self.client = pymongo.MongoClient(MONGO_URI)
        self.db = self.client.advdeception
        self.honeypot_id = self._get_honeypot_id()
        self.processing_lock = Lock()
        
    def _get_honeypot_id(self) -> str:
        """Get or create honeypot document and return its ID."""
        honeypot = self.db.honeypots.find_one({'name': HONEYPOT_NAME})
        if not honeypot:
            honeypot = {
                'name': HONEYPOT_NAME,
                'protocol': 'ssh',
                'type': 'IT',
                'status': 'running',
                'created_at': datetime.utcnow(),
                'updated_at': datetime.utcnow()
            }
            result = self.db.honeypots.insert_one(honeypot)
            return str(result.inserted_id)
        return str(honeypot['_id'])

    def parse_session(self, tty_path: Path) -> Optional[Dict]:
        """Parse a TTY session file and return structured data."""
        try:
            with open(tty_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()

            # Check if session is complete
            if 'Script done on' not in content:
                return None

            # Extract metadata from first line
            meta_match = re.search(r'Script started on (.*?) \[TERM="(.*?)" TTY="(.*?)" COLUMNS="(\d+)" LINES="(\d+)"(?: SOURCE_IP="(.*?)")?\]', content)
            if not meta_match:
                logger.error(f"Failed to parse metadata for {tty_path}")
                return None

            start_time_str, term, tty, cols, lines, source_ip = meta_match.groups()
            start_time = datetime.strptime(start_time_str, '%Y-%m-%d %H:%M:%S%z')

            # Extract end time and exit code
            end_match = re.search(r'Script done on (.*?) \[COMMAND_EXIT_CODE="(\d+)"\]', content)
            if not end_match:
                logger.error(f"Failed to parse end time for {tty_path}")
                return None

            end_time_str, exit_code = end_match.groups()
            end_time = datetime.strptime(end_time_str, '%Y-%m-%d %H:%M:%S%z')

            # Extract commands (lines starting with prompt)
            commands = []
            for line in content.split('\n'):
                if re.match(r'.*@.*:.*[#$] .*', line):
                    cmd = re.sub(r'.*@.*:.*[#$] ', '', line).strip()
                    if cmd:
                        commands.append(cmd)

            # Prepare session data
            session_data = {
                'session_id': tty_path.stem,
                'honeypot_id': self.honeypot_id,
                'protocol': 'ssh',
                'source_ip': source_ip,
                'start_time': start_time,
                'end_time': end_time,
                'duration': (end_time - start_time).total_seconds(),
                'exit_code': int(exit_code),
                'terminal': {
                    'type': term,
                    'tty': tty,
                    'columns': int(cols),
                    'lines': int(lines)
                },
                'commands': commands
            }

            return session_data

        except Exception as e:
            logger.error(f"Error parsing session {tty_path}: {str(e)}")
            return None

    def process_session(self, tty_path: Path) -> bool:
        """Process a TTY session file, save raw log, and store parsed data."""
        with self.processing_lock:
            try:
                # Skip if already processed
                json_path = JSON_LOGS_DIR / f"{tty_path.stem}.json"
                if json_path.exists():
                    return True

                # Parse session
                session_data = self.parse_session(tty_path)
                if not session_data:
                    return False

                # Save raw log
                raw_path = RAW_LOGS_DIR / tty_path.name
                if not raw_path.exists():
                    with open(tty_path, 'rb') as src, open(raw_path, 'wb') as dst:
                        dst.write(src.read())

                # Store raw log reference
                raw_log = {
                    'honeypot_id': self.honeypot_id,
                    'protocol': 'ssh',
                    'timestamp': session_data['start_time'],
                    'source_ip': session_data['source_ip'],
                    'raw_data': str(raw_path),
                    'meta': {
                        'filename': tty_path.name,
                        'parser_version': '1.0'
                    }
                }
                raw_log_id = self.db.raw_logs.insert_one(raw_log).inserted_id

                # Store parsed event
                event = {
                    'honeypot_id': self.honeypot_id,
                    'protocol': 'ssh',
                    'event_type': 'session',
                    'timestamp': session_data['start_time'],
                    'source_ip': session_data['source_ip'],
                    'session_id': session_data['session_id'],
                    'start_time': session_data['start_time'],
                    'end_time': session_data['end_time'],
                    'duration': session_data['duration'],
                    'commands': session_data['commands'],
                    'terminal_info': session_data['terminal'],
                    'exit_code': session_data['exit_code'],
                    'raw_log_id': raw_log_id
                }
                self.db.events.insert_one(event)

                # Save JSON for reference
                with open(json_path, 'w') as f:
                    json.dump(session_data, f, indent=2, default=str)

                logger.info(f"Successfully processed session {tty_path.name}")
                return True

            except Exception as e:
                logger.error(f"Error processing session {tty_path}: {str(e)}")
                return False

class TTYHandler(FileSystemEventHandler):
    def __init__(self, parser: SessionParser):
        self.parser = parser

    def on_created(self, event):
        if not event.is_directory and event.src_path.endswith('.tty'):
            path = Path(event.src_path)
            logger.info(f"New TTY file detected: {path}")
            # Wait a bit to ensure file is complete
            time.sleep(1)
            self.parser.process_session(path)

    def on_modified(self, event):
        if not event.is_directory and event.src_path.endswith('.tty'):
            path = Path(event.src_path)
            logger.info(f"TTY file modified: {path}")
            self.parser.process_session(path)

def main():
    parser = SessionParser()
    
    # Process any existing files first
    for tty_file in SSH_SESSIONS_DIR.glob('*.tty'):
        parser.process_session(tty_file)

    # Set up file monitoring
    event_handler = TTYHandler(parser)
    observer = Observer()
    observer.schedule(event_handler, str(SSH_SESSIONS_DIR), recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()

if __name__ == '__main__':
    main()

