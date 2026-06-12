from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.config import get_database_url

DATABASE_URL = get_database_url()

# Setup creation arguments. If using postgresql, we do not need connect_args {"check_same_thread": False}.
# We enable pool_pre_ping to check database liveness.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def verify_db_connection():
    """Checks database connectivity. Raises RuntimeException if connection fails."""
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
        print("[Database] PostgreSQL connection verified successfully.")
    except Exception as e:
        print(f"[Database] Critical Error: Failed to connect to PostgreSQL database: {e}")
        raise RuntimeError(f"Database connection verification failed: {e}") from e
