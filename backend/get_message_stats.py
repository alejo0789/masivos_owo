import sqlite3
import os

def get_stats():
    # Ruta a la base de datos (relativa a este archivo)
    db_path = os.path.join(os.path.dirname(__file__), 'messaging.db')
    
    if not os.path.exists(db_path):
        print(f"❌ No se encontró la base de datos en: {db_path}")
        return

    try:
        # Conectar a la base de datos
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Consulta para obtener el total actual y el ID máximo
        cursor.execute("SELECT COUNT(*), MAX(id) FROM message_logs")
        count, max_id = cursor.fetchone()
        
        # Consulta para contar por estado (opcional, pero útil)
        cursor.execute("SELECT status, COUNT(*) FROM message_logs GROUP BY status")
        status_counts = cursor.fetchall()
        
        print("-" * 40)
        print(" ESTADISTICAS DEL HISTORIAL")
        print("-" * 40)
        print(f" Total historico (ID maximo):  {max_id if max_id else 0}")
        print(f" Mensajes actuales en DB:     {count}")
        print(f" Mensajes eliminados:          {(max_id - count) if max_id and count else 0}")
        print("-" * 40)
        
        if status_counts:
            print("Detalle por estado en base de datos:")
            for status, s_count in status_counts:
                st = status if status else "N/A"
                print(f"  - {st.capitalize()}: {s_count}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Error al conectar con SQLite: {e}")

if __name__ == "__main__":
    get_stats()
