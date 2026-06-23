import os
import sys
from sqlalchemy import create_engine, MetaData, Table
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Ensure we can import from database
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database.db import Base
# Import all models to ensure they are registered on Base.metadata
from database.models import (
    MaliciousWallet,
    ExchangeWallet,
    KnownMixer,
    ThreatActor,
    InvestigationLog,
    VerificationReport,
    Case,
    CaseEntity,
    CaseNote,
    CandidateEntity
)

def migrate():
    load_dotenv()
    
    db_dir = os.path.dirname(os.path.abspath(__file__))
    db_path = os.path.join(db_dir, "axon_intel.db")
    sqlite_url = f"sqlite:///{db_path}"
    postgres_url = os.getenv("DATABASE_URL")
    
    if not postgres_url:
        print("[-] Error: DATABASE_URL not found in environment. Please add it to your .env file.")
        return
    
    if postgres_url.startswith("sqlite"):
        print("[-] Error: DATABASE_URL is pointing to a SQLite database. Please change it to your Supabase PostgreSQL URL.")
        return

    print(f"[*] Connecting to source database: {sqlite_url}")
    sqlite_engine = create_engine(sqlite_url)
    
    print(f"[*] Connecting to target database: {postgres_url.split('@')[-1] if '@' in postgres_url else postgres_url}")
    # Handle postgres:// vs postgresql:// scheme compatibility for SQLAlchemy
    if postgres_url.startswith("postgres://"):
        postgres_url = postgres_url.replace("postgres://", "postgresql://", 1)
        
    postgres_engine = create_engine(postgres_url)

    # 1. Recreate tables in Supabase Postgres to apply latest schema updates
    # print("[*] Dropping old tables in Supabase Postgres for a clean migration...")
    # Base.metadata.drop_all(bind=postgres_engine)
    print("[*] Creating tables in Supabase Postgres...")
    Base.metadata.create_all(bind=postgres_engine)
    print("[+] Tables created successfully.")

    # Sessions
    SqliteSession = sessionmaker(bind=sqlite_engine)
    PostgresSession = sessionmaker(bind=postgres_engine)
    
    sqlite_db = SqliteSession()
    postgres_db = PostgresSession()

    # Define model order to respect relationships / dependencies if any (though there are no hard foreign keys in models.py)
    models = [
        Case,
        CaseEntity,
        CaseNote,
        CandidateEntity,
        MaliciousWallet,
        ExchangeWallet,
        KnownMixer,
        ThreatActor,
        InvestigationLog,
        VerificationReport
    ]

    # Inspect SQLite database to check if tables exist
    from sqlalchemy import inspect
    inspector = inspect(sqlite_engine)

    try:
        for model in models:
            table_name = model.__tablename__
            print(f"[*] Migrating table: '{table_name}'...")
            
            # Check if table exists in SQLite source
            if not inspector.has_table(table_name):
                print(f"    - Table '{table_name}' does not exist in SQLite source. Skipping.")
                continue
                
            # Count existing source records
            src_count = sqlite_db.query(model).count()
            print(f"    - Found {src_count} records in SQLite.")
            
            if src_count == 0:
                print(f"    - Skipping (no records to migrate).")
                continue
                
            # Clear target table first to avoid duplicate primary key violations on a fresh migrate
            dest_count = postgres_db.query(model).count()
            if dest_count > 0:
                print(f"    - Target table '{table_name}' already contains {dest_count} records. Clearing it first...")
                postgres_db.query(model).delete()
                postgres_db.commit()

            # Read all records from sqlite
            records = sqlite_db.query(model).all()
            
            # Bulk save to postgres
            # We construct new instances to detach them from the SQLite session
            new_records = []
            for r in records:
                # Extract all columns
                data = {col.name: getattr(r, col.name) for col in model.__table__.columns}
                new_records.append(model(**data))
                
            postgres_db.bulk_save_objects(new_records)
            postgres_db.commit()
            print(f"    - Successfully migrated {len(new_records)} records to Supabase.")

            # Reset auto-increment sequence in Postgres for tables with an 'id' column
            if 'id' in [col.name for col in model.__table__.columns]:
                try:
                    postgres_db.execute(
                        f"SELECT setval(pg_get_serial_sequence('{table_name}', 'id'), COALESCE(max(id), 1), max(id) IS NOT null) FROM {table_name};"
                    )
                    postgres_db.commit()
                    print(f"    - Sequence reset for table '{table_name}'.")
                except Exception as seq_err:
                    postgres_db.rollback()
                    # In some environments, pg_get_serial_sequence might not find the sequence name directly, ignore if not critical
                    print(f"    - Note: Sequence reset skipped or not required for '{table_name}': {seq_err}")

        print("[+] Migration finished successfully!")
        
    except Exception as e:
        postgres_db.rollback()
        print(f"[-] Migration failed with error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        sqlite_db.close()
        postgres_db.close()

if __name__ == "__main__":
    migrate()
