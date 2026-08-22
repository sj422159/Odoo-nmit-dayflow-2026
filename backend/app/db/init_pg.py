import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

def init_db():
    # Try superuser postgres with password 'admin' or 'postgres'
    for pwd in ["admin", "postgres", "dayflow"]:
        try:
            conn = psycopg2.connect(
                dbname="postgres",
                user="postgres",
                password=pwd,
                host="localhost",
                port=5432,
            )
            conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
            cur = conn.cursor()
            cur.execute("SELECT 1 FROM pg_database WHERE datname='dayflow'")
            if not cur.fetchone():
                cur.execute("CREATE DATABASE dayflow")
                print("Created PostgreSQL database 'dayflow'.")
            else:
                print("PostgreSQL database 'dayflow' already exists.")
            cur.close()
            conn.close()
            return pwd
        except Exception as e:
            pass
    print("Could not connect with postgres/admin password.")
    return None

if __name__ == "__main__":
    init_db()
