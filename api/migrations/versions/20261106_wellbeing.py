"""Persist completed wellbeing practices."""

import sqlalchemy as sa
from alembic import op

revision = "20261106_wellbeing"
down_revision = "754ebcac4d61"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "wellbeing_completions",
        sa.Column("id", sa.String(128), primary_key=True),
        sa.Column(
            "profile_id",
            sa.String(36),
            sa.ForeignKey("profiles.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("duration_seconds", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_wellbeing_completions_profile_id", "wellbeing_completions", ["profile_id"])


def downgrade():
    op.drop_table("wellbeing_completions")
