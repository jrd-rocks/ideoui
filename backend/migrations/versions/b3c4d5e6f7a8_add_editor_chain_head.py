"""add editor_chain_head_uuid to active_jobs

Revision ID: b3c4d5e6f7a8
Revises: 9e0721ecbdb5
Create Date: 2026-06-15

"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c4d5e6f7a8'
down_revision = '9e0721ecbdb5'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('active_jobs', sa.Column('editor_chain_head_uuid', sa.Text(), nullable=True))
    op.create_index('ix_active_jobs_editor_chain_head_uuid', 'active_jobs', ['editor_chain_head_uuid'])

def downgrade():
    op.drop_index('ix_active_jobs_editor_chain_head_uuid', table_name='active_jobs')
    op.drop_column('active_jobs', 'editor_chain_head_uuid')
