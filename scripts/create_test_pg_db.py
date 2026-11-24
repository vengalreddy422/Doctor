import psycopg2

try:
    conn = psycopg2.connect('postgresql://neondb_owner:npg_dbpv2ID0jNiC@ep-wandering-wave-axyw1io9-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require')
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT 1 FROM pg_database WHERE datname = 'careconnect_isolated_test'")
    exists = cur.fetchone()
    if not exists:
        cur.execute("CREATE DATABASE careconnect_isolated_test")
        print("Created careconnect_isolated_test database on Neon!")
    else:
        print("careconnect_isolated_test database already exists.")
    cur.execute("SELECT datname FROM pg_database WHERE datname LIKE '%careconnect%'")
    print("Databases:", cur.fetchall())
    conn.close()
except Exception as e:
    print("Error:", e)
