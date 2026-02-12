import asyncio
import aiosqlite
from config import get_settings

settings = get_settings()

async def add_column():
    print(f"Connecting to database: {settings.database_url}")
    # The database_url is like sqlite+aiosqlite:///./messaging.db
    # We need the path part for aiosqlite, which is ./messaging.db
    db_path = settings.database_url.replace("sqlite+aiosqlite:///", "")
    
    async with aiosqlite.connect(db_path) as db:
        try:
            # Check if column exists first
            cursor = await db.execute("PRAGMA table_info(templates)")
            columns = await cursor.fetchall()
            column_names = [col[1] for col in columns]
            
            if "attachment_path" not in column_names:
                await db.execute("ALTER TABLE templates ADD COLUMN attachment_path VARCHAR(500)")
                await db.commit()
                print("Successfully added attachment_path column to templates table.")
            else:
                print("Column attachment_path already exists in templates table.")
                
        except Exception as e:
            print(f"Error adding column: {e}")

if __name__ == "__main__":
    asyncio.run(add_column())
