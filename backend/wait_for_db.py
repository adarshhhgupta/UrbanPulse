"""
UrbanPulse - Wait for PostgreSQL to be ready before starting FastAPI.
Prevents startup crash when Docker Compose starts containers concurrently.
"""

import os
import sys
import time
import psycopg2


def wait_for_postgres():
    database_url = os.getenv("DATABASE_URL", "")
    if "sqlite" in database_url.lower():
        print(f"[UrbanPulse] SQLite database configured ({database_url}). Skipping PostgreSQL check.")
        return 0

    user = os.getenv("POSTGRES_USER", "urbanpulse_user")
    password = os.getenv("POSTGRES_PASSWORD", "urbanpulse_password")
    db = os.getenv("POSTGRES_DB", "urbanpulse")
    host = os.getenv("POSTGRES_HOST", "db")
    port = os.getenv("POSTGRES_PORT", "5432")

    max_retries = int(os.getenv("DB_CONNECT_RETRIES", "5"))
    retry_interval = float(os.getenv("DB_CONNECT_INTERVAL", "2.0"))

    print(f"[UrbanPulse] Checking PostgreSQL readiness at {host}:{port}/{db} (user: {user})...")

    for attempt in range(1, max_retries + 1):
        try:
            conn = psycopg2.connect(
                dbname=db,
                user=user,
                password=password,
                host=host,
                port=port,
                connect_timeout=3
            )
            conn.close()
            print(f"[UrbanPulse] PostgreSQL is ready and accepting connections! (attempt {attempt}/{max_retries})")
            return 0
        except psycopg2.OperationalError as e:
            print(f"[UrbanPulse] PostgreSQL not ready yet (attempt {attempt}/{max_retries}): {e.args[0].strip() if e.args else e}")
            time.sleep(retry_interval)
        except Exception as e:
            print(f"[UrbanPulse] Connection attempt {attempt}/{max_retries} failed: {e}")
            time.sleep(retry_interval)

    print("[UrbanPulse WARNING] PostgreSQL not reachable. Continuing to allow SQLite fallback.")
    return 0


if __name__ == "__main__":
    wait_for_postgres()
