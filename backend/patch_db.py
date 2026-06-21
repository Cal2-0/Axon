import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
conn = psycopg2.connect(os.getenv('DATABASE_URL').replace('postgres://', 'postgresql://'))
cur = conn.cursor()

queries = [
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS case_number VARCHAR(50) UNIQUE;',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS updated_at FLOAT;',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS priority VARCHAR(50) DEFAULT \'P2\';',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT \'General\';',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS tags JSON DEFAULT \'[]\';',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS assigned_to VARCHAR(100) DEFAULT \'\';',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS total_entities INTEGER DEFAULT 0;',
    'ALTER TABLE cases ADD COLUMN IF NOT EXISTS highest_risk INTEGER DEFAULT 0;'
]

for q in queries:
    try:
        cur.execute(q)
        print('Executed', q)
    except Exception as e:
        print('Error:', e)
        conn.rollback()

conn.commit()
print('Done')
