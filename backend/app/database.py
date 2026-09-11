"""
UrbanPulse - Database Connection & Session Management
Provides SQLAlchemy engine, session factory, and Base declarative class.
Reads PostgreSQL parameters from environment variables (POSTGRES_USER, POSTGRES_PASSWORD,
POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT).
Gracefully falls back to embedded SQLite if PostgreSQL service is offline, ensuring
the FastAPI backend is always 100% available without friction.
"""

import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

logger = logging.getLogger("UrbanPulse.Database")

POSTGRES_USER = os.getenv("POSTGRES_USER", "urbanpulse_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "urbanpulse_password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "urbanpulse")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

PG_DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Test connection to PostgreSQL; fallback to embedded SQLite if PostgreSQL server is offline
use_sqlite = False

if "sqlite" in PG_DATABASE_URL.lower():
    use_sqlite = True
else:
    try:
        # Quick 2-second timeout probe to check if PostgreSQL is listening
        test_engine = create_engine(
            PG_DATABASE_URL,
            connect_args={"connect_timeout": 2},
            pool_pre_ping=False
        )
        with test_engine.connect() as conn:
            pass
        test_engine.dispose()
        DATABASE_URL = PG_DATABASE_URL
        engine = create_engine(
            DATABASE_URL,
            pool_pre_ping=True,
            pool_size=10,
            max_overflow=20,
            echo=False
        )
        logger.info("PostgreSQL database verified and connected successfully.")
    except Exception as e:
        logger.warning(
            f"PostgreSQL not reachable at {POSTGRES_HOST}:{POSTGRES_PORT} ({e}). "
            "Activating embedded SQLite database (urbanpulse.db) for instant local execution."
        )
        use_sqlite = True

if use_sqlite:
    DATABASE_URL = "sqlite:///./urbanpulse.db"
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency that provides an isolated SQLAlchemy DB session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
