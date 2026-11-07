"""Keep demo data accessible through FastAPI, not the public Supabase Data API."""

from alembic import op

revision = "3dcfb64ac5f8"
down_revision = "20261106_wellbeing"
branch_labels = None
depends_on = None

TABLES = (
    "profiles",
    "activities",
    "interviews",
    "interview_turns",
    "wellbeing_completions",
    "alembic_version",
)


def upgrade():
    if op.get_context().dialect.name == "postgresql":
        for table in TABLES:
            op.execute(f'ALTER TABLE "{table}" ENABLE ROW LEVEL SECURITY')


def downgrade():
    if op.get_context().dialect.name == "postgresql":
        for table in TABLES:
            op.execute(f'ALTER TABLE "{table}" DISABLE ROW LEVEL SECURITY')
