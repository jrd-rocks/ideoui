"""add_uuid_lineage

Revision ID: 353a1c22ec86
Revises: 8dd7356e57d6
Create Date: 2026-06-06 17:59:58.477502

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '353a1c22ec86'
down_revision: Union[str, Sequence[str], None] = '8dd7356e57d6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Add columns as nullable first
    op.add_column('generation_history', sa.Column('uuid', sa.Text(), nullable=True))
    op.add_column('generation_history', sa.Column('parent_uuid', sa.Text(), nullable=True))
    
    # Generate UUIDs for existing rows
    import uuid
    connection = op.get_bind()
    results = connection.execute(sa.text("SELECT id FROM generation_history")).fetchall()
    for row in results:
        new_uuid = str(uuid.uuid4())
        connection.execute(
            sa.text("UPDATE generation_history SET uuid = :uuid WHERE id = :id"),
            {"uuid": new_uuid, "id": row[0]}
        )
        
    # Now alter columns to make uuid non-nullable and unique
    op.alter_column('generation_history', 'uuid', nullable=False)
    op.create_unique_constraint('uq_generation_history_uuid', 'generation_history', ['uuid'])
    op.create_index('ix_generation_history_uuid', 'generation_history', ['uuid'])
    op.create_index('ix_generation_history_parent_uuid', 'generation_history', ['parent_uuid'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_generation_history_parent_uuid', table_name='generation_history')
    op.drop_index('ix_generation_history_uuid', table_name='generation_history')
    op.drop_constraint('uq_generation_history_uuid', 'generation_history')
    op.drop_column('generation_history', 'parent_uuid')
    op.drop_column('generation_history', 'uuid')
