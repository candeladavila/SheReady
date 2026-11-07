"""Persist planned questions and independent rotation counters."""
import sqlalchemy as sa
from alembic import op

revision = '20261107_cycles'
down_revision = '20261107_plans'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('interviews', sa.Column('planned_questions', sa.JSON(), nullable=True))
    for name in ('cycle_one', 'cycle_five', 'cycle_ten', 'cycle_fifteen'):
        op.add_column('role_plans', sa.Column(name, sa.Integer(), nullable=False, server_default='0'))


def downgrade():
    for name in ('cycle_one', 'cycle_five', 'cycle_ten', 'cycle_fifteen'):
        op.drop_column('role_plans', name)
    op.drop_column('interviews', 'planned_questions')
