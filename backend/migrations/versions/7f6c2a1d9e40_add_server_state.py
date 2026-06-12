"""add_server_state

Revision ID: 7f6c2a1d9e40
Revises: 353a1c22ec86
Create Date: 2026-06-10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "7f6c2a1d9e40"
down_revision: Union[str, Sequence[str], None] = "353a1c22ec86"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "active_jobs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("job_id", sa.Text(), nullable=False),
        sa.Column("uuid", sa.Text(), nullable=False),
        sa.Column("parent_uuid", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("provider", sa.Text(), nullable=False),
        sa.Column("upsampler", sa.Text(), nullable=True),
        sa.Column("job_type", sa.Text(), nullable=False),
        sa.Column("progress_step", sa.Text(), nullable=True),
        sa.Column("display_text", sa.Text(), nullable=True),
        sa.Column("raw_prompt", sa.Text(), nullable=False),
        sa.Column("upsampled_prompt", sa.Text(), nullable=True),
        sa.Column("provider_params", sa.JSON(), nullable=False),
        sa.Column("upsampler_params", sa.JSON(), nullable=False),
        sa.Column("draft_json", sa.JSON(), nullable=True),
        sa.Column("chat_messages", sa.JSON(), nullable=True),
        sa.Column("steps", sa.JSON(), nullable=True),
        sa.Column("images", sa.JSON(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("job_id"),
        sa.UniqueConstraint("uuid"),
    )
    op.create_index(op.f("ix_active_jobs_id"), "active_jobs", ["id"], unique=False)
    op.create_index(op.f("ix_active_jobs_job_id"), "active_jobs", ["job_id"], unique=True)
    op.create_index(op.f("ix_active_jobs_uuid"), "active_jobs", ["uuid"], unique=True)
    op.create_index(op.f("ix_active_jobs_parent_uuid"), "active_jobs", ["parent_uuid"], unique=False)
    op.create_index(op.f("ix_active_jobs_status"), "active_jobs", ["status"], unique=False)

    op.create_table(
        "session_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tab_uuid", sa.Text(), nullable=False),
        sa.Column("active_job_id", sa.Text(), nullable=True),
        sa.Column("route", sa.Text(), nullable=False),
        sa.Column("form_state", sa.JSON(), nullable=False),
        sa.Column("draft_json", sa.JSON(), nullable=True),
        sa.Column("last_updated", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tab_uuid"),
    )
    op.create_index(op.f("ix_session_states_id"), "session_states", ["id"], unique=False)
    op.create_index(op.f("ix_session_states_tab_uuid"), "session_states", ["tab_uuid"], unique=True)
    op.create_index(op.f("ix_session_states_active_job_id"), "session_states", ["active_job_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_session_states_active_job_id"), table_name="session_states")
    op.drop_index(op.f("ix_session_states_tab_uuid"), table_name="session_states")
    op.drop_index(op.f("ix_session_states_id"), table_name="session_states")
    op.drop_table("session_states")
    op.drop_index(op.f("ix_active_jobs_status"), table_name="active_jobs")
    op.drop_index(op.f("ix_active_jobs_parent_uuid"), table_name="active_jobs")
    op.drop_index(op.f("ix_active_jobs_uuid"), table_name="active_jobs")
    op.drop_index(op.f("ix_active_jobs_job_id"), table_name="active_jobs")
    op.drop_index(op.f("ix_active_jobs_id"), table_name="active_jobs")
    op.drop_table("active_jobs")
