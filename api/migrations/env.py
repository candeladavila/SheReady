from alembic import context
from sqlalchemy import create_engine, pool

import models  # noqa: F401
from config import get_settings
from database import Base

target_metadata = Base.metadata

if context.is_offline_mode():
    context.configure(
        url=get_settings().migration_sqlalchemy_url,
        target_metadata=target_metadata,
        literal_binds=True,
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    migration_url = get_settings().migration_sqlalchemy_url
    connect_args = {} if migration_url.startswith("sqlite") else {"prepare_threshold": None}
    engine = create_engine(migration_url, poolclass=pool.NullPool, connect_args=connect_args)
    with engine.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()
    engine.dispose()
