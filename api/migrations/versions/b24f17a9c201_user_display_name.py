"""Store account display names, preserving existing accounts."""

import sqlalchemy as sa
from alembic import op

revision = "b24f17a9c201"
down_revision = "94d9603ad3a2"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("display_name", sa.String(80), nullable=True))
    op.execute("UPDATE users SET display_name = 'Lucía' WHERE id = 'demo'")


def downgrade():
    op.drop_column("users", "display_name")
