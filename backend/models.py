from datetime import datetime

from sqlalchemy import Column, Integer, BigInteger, Text, JSON, DateTime
from backend.database import Base

class GenerationHistory(Base):
    __tablename__ = "generation_history"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(Text, unique=True, index=True, nullable=False)
    parent_uuid = Column(Text, nullable=True, index=True)
    timestamp = Column(BigInteger, unique=True, index=True, nullable=False)
    raw_prompt = Column(Text, nullable=False)
    upsampled_prompt = Column(Text, nullable=True)
    images = Column(JSON, nullable=False)  # Array of R2 URL strings
    previews_url = Column(Text, nullable=True)  # R2 URL to previews zip
    params = Column(JSON, nullable=False)  # Dictionary of settings parameters


class ActiveJob(Base):
    __tablename__ = "active_jobs"

    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Text, unique=True, index=True, nullable=False)
    uuid = Column(Text, unique=True, index=True, nullable=False)
    parent_uuid = Column(Text, nullable=True, index=True)
    status = Column(Text, index=True, nullable=False, default="pending")
    provider = Column(Text, nullable=False)
    upsampler = Column(Text, nullable=True)
    job_type = Column(Text, nullable=False, default="generation")
    progress_step = Column(Text, nullable=True)
    display_text = Column(Text, nullable=True)
    raw_prompt = Column(Text, nullable=False)
    upsampled_prompt = Column(Text, nullable=True)
    provider_params = Column(JSON, nullable=False, default=dict)
    upsampler_params = Column(JSON, nullable=False, default=dict)
    draft_json = Column(JSON, nullable=True)
    chat_messages = Column(JSON, nullable=True)
    steps = Column(JSON, nullable=True)
    images = Column(JSON, nullable=True)
    previews_url = Column(Text, nullable=True)  # R2 URL to previews zip
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SessionState(Base):
    __tablename__ = "session_states"

    id = Column(Integer, primary_key=True, index=True)
    tab_uuid = Column(Text, unique=True, index=True, nullable=False)
    active_job_id = Column(Text, nullable=True, index=True)
    route = Column(Text, nullable=False, default="#/")
    form_state = Column(JSON, nullable=False, default=dict)
    draft_json = Column(JSON, nullable=True)
    last_updated = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(Text, primary_key=True, index=True, nullable=False)
    value = Column(Text, nullable=True)
