"""Expose onboarding selections as user-scoped profile columns."""
import sqlalchemy as sa
from alembic import op

revision = "20261107_profile_fields"
down_revision = "20261107_cycles"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("profiles", sa.Column("goals", sa.JSON(), nullable=True))
    op.add_column("profiles", sa.Column("age_range", sa.String(40), nullable=True))
    op.add_column("profiles", sa.Column("daily_time_choice", sa.String(40), nullable=True))
    op.add_column("profiles", sa.Column("sector", sa.String(150), nullable=True))
    profiles = sa.table("profiles", sa.column("id", sa.String), sa.column("data", sa.JSON),
        sa.column("goals", sa.JSON), sa.column("age_range", sa.String),
        sa.column("daily_time_choice", sa.String), sa.column("sector", sa.String))
    connection = op.get_bind()
    for row in connection.execute(sa.select(profiles.c.id, profiles.c.data)):
        data = row.data or {}
        doc = data.get("onboarding_document") or {}
        connection.execute(profiles.update().where(profiles.c.id == row.id).values(
            goals=doc.get("goals", data.get("goals")), age_range=doc.get("age_range", data.get("age_range")),
            daily_time_choice=doc.get("daily_time_choice", data.get("daily_time_choice")),
            sector=data.get("sector") or doc.get("sector")))


def downgrade():
    for column in ("sector", "daily_time_choice", "age_range", "goals"):
        op.drop_column("profiles", column)
