"""
UrbanPulse - PostgreSQL Database Connection & Session Management
Provides SQLAlchemy engine, session factory, and Base declarative class for PostgreSQL.
Reads connection parameters from environment variables (POSTGRES_USER, POSTGRES_PASSWORD,
POSTGRES_DB, POSTGRES_HOST, POSTGRES_PORT).
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

POSTGRES_USER = os.getenv("POSTGRES_USER", "urbanpulse_user")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "urbanpulse_password")
POSTGRES_DB = os.getenv("POSTGRES_DB", "urbanpulse")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")

# Construct PostgreSQL connection string using psycopg2 driver
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"postgresql+psycopg2://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"
)

# Configure SQLAlchemy connection engine with pre-ping validation and connection pool sizing
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
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
