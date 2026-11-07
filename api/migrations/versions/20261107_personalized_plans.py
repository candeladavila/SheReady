"""Store the initial interview and one generated plan per user and role."""
import sqlalchemy as sa
from alembic import op

revision = '20261107_plans'
down_revision = 'b24f17a9c201'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('initial_profiles',
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('answers', sa.JSON(), nullable=False),
        sa.Column('context', sa.JSON(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False))
    op.create_table('role_plans',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('user_id', sa.String(36), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('role_key', sa.String(64), nullable=False),
        sa.Column('generation_id', sa.String(36), nullable=False),
        sa.Column('role', sa.JSON(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('plan', sa.JSON()),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'role_key', name='uq_role_plan_user_role'))
    op.create_index('ix_role_plans_user_id', 'role_plans', ['user_id'])
    if op.get_context().dialect.name == 'postgresql':
        op.execute('ALTER TABLE initial_profiles ENABLE ROW LEVEL SECURITY')
        op.execute('ALTER TABLE role_plans ENABLE ROW LEVEL SECURITY')


def downgrade():
    op.drop_index('ix_role_plans_user_id', table_name='role_plans')
    op.drop_table('role_plans')
    op.drop_table('initial_profiles')
