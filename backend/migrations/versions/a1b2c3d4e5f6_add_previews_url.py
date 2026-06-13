"""add previews_url to active_jobs and generation_history

Revision ID: a1b2c3d4e5f6
Revises: 7f6c2a1d9e40
Create Date: 2026-06-13

"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '7f6c2a1d9e40'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('active_jobs', sa.Column('previews_url', sa.Text(), nullable=True))
    op.add_column('generation_history', sa.Column('previews_url', sa.Text(), nullable=True))

def downgrade():
    op.drop_column('generation_history', 'previews_url')
    op.drop_column('active_jobs', 'previews_url')
