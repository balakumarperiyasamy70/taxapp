#!/usr/bin/env python3
"""
One-time script to create all database tables.
Run from /opt/taxapp/backend with venv active:
  source venv/bin/activate
  python3 init_db.py
"""
from app.database import engine, Base
from app.models import user, tax_return, loan, document  # noqa: F401

print("Creating database tables...")
Base.metadata.create_all(bind=engine)
print("Done. Tables created:")
for table in Base.metadata.sorted_tables:
    print(f"  - {table.name}")
