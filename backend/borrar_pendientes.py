import sqlite3

try:
    conn = sqlite3.connect('messaging.db')
    cursor = conn.cursor()
    cursor.execute("DELETE FROM message_logs WHERE status IN ('pending', 'failed')")
    print(f'Borrados {cursor.rowcount} registros pendientes y fallidos.')
    conn.commit()
except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals():
        conn.close()
