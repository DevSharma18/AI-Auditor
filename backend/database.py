import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ---------------------------------------
# ABSOLUTE DATABASE PATH (CRITICAL FIX)
# ---------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'ai_auditor.db')}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

# ---------------------------------------
# DB DEPENDENCY
# ---------------------------------------

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------------------------------
# INITIALIZE DB (TABLE CREATION)
# ---------------------------------------

def init_db():
    # Import here to avoid circular imports
    from .models import Base as ModelsBase
    ModelsBase.metadata.create_all(bind=engine)
