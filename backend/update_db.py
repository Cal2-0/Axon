import sqlite3

def update_db():
    conn = sqlite3.connect("axon_intel.db")
    cursor = conn.cursor()
    
    # Try adding each column, ignore if it already exists
    columns_to_add = [
        ("case_number", "VARCHAR(30)"),
        ("updated_at", "FLOAT"),
        ("priority", "VARCHAR(10) DEFAULT 'P2'"),
        ("category", "VARCHAR(50) DEFAULT 'General'"),
        ("tags", "JSON DEFAULT '[]'"),
        ("assigned_to", "VARCHAR(100) DEFAULT ''"),
        ("total_entities", "INTEGER DEFAULT 0"),
        ("highest_risk", "INTEGER DEFAULT 0")
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE cases ADD COLUMN {col_name} {col_type}")
            print(f"Added column {col_name}")
        except sqlite3.OperationalError as e:
            print(f"Column {col_name} likely already exists: {e}")
            
    conn.commit()
    conn.close()

if __name__ == "__main__":
    update_db()
