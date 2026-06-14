"""add_system_settings_table

Revision ID: 9e0721ecbdb5
Revises: a1b2c3d4e5f6
Create Date: 2026-06-14 13:28:11.913035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
"""add_system_settings_table

Revision ID: 9e0721ecbdb5
Revises: a1b2c3d4e5f6
Create Date: 2026-06-14 13:28:11.913035

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9e0721ecbdb5'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('system_settings',
    sa.Column('key', sa.Text(), nullable=False),
    sa.Column('value', sa.Text(), nullable=True),
    sa.PrimaryKeyConstraint('key')
    )
    op.create_index(op.f('ix_system_settings_key'), 'system_settings', ['key'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_system_settings_key'), table_name='system_settings')
    op.drop_table('system_settings')
