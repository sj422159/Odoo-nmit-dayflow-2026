import psycopg2

def inspect():
    conn = psycopg2.connect(
        dbname="dayflow",
        user="postgres",
        password="admin",
        host="localhost",
        port=5432
    )
    cur = conn.cursor()
    cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name")
    tables = [row[0] for row in cur.fetchall()]
    
    print("==========================================")
    print("   DAYFLOW HRMS — POSTGRESQL TABLES       ")
    print("==========================================")
    for t in tables:
        cur.execute(f"SELECT COUNT(*) FROM {t}")
        count = cur.fetchone()[0]
        print(f"  • {t:<22} : {count:>5} rows")
    print("==========================================")
    cur.close()
    conn.close()

if __name__ == "__main__":
    inspect()
