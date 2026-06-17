import sqlite3

def migrate():
    conn = sqlite3.connect("axon_intel.db")
    cursor = conn.cursor()
    
    try:
        cursor.execute("ALTER TABLE investigation_log ADD COLUMN bulk_batch_id VARCHAR(50)")
        print("Added bulk_batch_id to investigation_log")
    except Exception as e:
        print("investigation_log.bulk_batch_id might already exist:", e)

    try:
        cursor.execute("ALTER TABLE malicious_wallets ADD COLUMN source VARCHAR(50) DEFAULT 'unknown'")
        print("Added source to malicious_wallets")
    except Exception as e:
        print("malicious_wallets.source might already exist:", e)

    try:
        cursor.execute("ALTER TABLE malicious_wallets ADD COLUMN confidence INTEGER DEFAULT 50")
        print("Added confidence to malicious_wallets")
    except Exception as e:
        print("malicious_wallets.confidence might already exist:", e)

    try:
        cursor.execute("ALTER TABLE malicious_wallets ADD COLUMN cluster_id VARCHAR(50)")
        print("Added cluster_id to malicious_wallets")
    except Exception as e:
        print("malicious_wallets.cluster_id might already exist:", e)

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
