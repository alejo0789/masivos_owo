import asyncio
import sys
import os

# Create backend directory path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from sqlalchemy import select, update
from database import async_session
from models.message_log import MessageLog

async def fix_request_timeouts():
    """
    Search for email logs with 'Webhook request timed out' error and mark them as successful.
    """
    print("Iniciando corrección de timeouts en el historial de correos...")
    
    async with async_session() as session:
        # Find records that match the criteria
        # Criteria: error_message contains 'timed out' AND channel is 'email' (or contains email)
        
        # Determine strict criteria
        # The user specifically mentioned "Webhook request timed out"
        target_error = "Webhook request timed out"
        
        stmt = select(MessageLog).where(
            MessageLog.error_message.contains("timed out"),
            MessageLog.channel.contains("email")
        )
        
        result = await session.execute(stmt)
        logs = result.scalars().all()
        
        count = len(logs)
        print(f"Encontrados {count} registros con timeout de webhook en email.")
        
        if count == 0:
            print("No se encontraron registros para actualizar.")
            return

        # Perform the update
        update_stmt = (
            update(MessageLog)
            .where(
                MessageLog.error_message.contains("timed out"),
                MessageLog.channel.contains("email")
            )
            .values(
                status="sent",
                error_message=None  # Clear the error message or maybe note it was fixed manually? User said "queden exitosos"
            )
        )
        
        await session.execute(update_stmt)
        await session.commit()
        
        print(f"¡Éxito! Se han actualizado {count} registros a estado 'sent' (exitoso).")

if __name__ == "__main__":
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    
    asyncio.run(fix_request_timeouts())
