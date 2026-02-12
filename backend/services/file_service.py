"""File service for handling file uploads."""
import os
import uuid
import aiofiles
from fastapi import UploadFile, HTTPException
from typing import List, Tuple
from config import get_settings

settings = get_settings()


class FileService:
    """Service for handling file uploads and management."""
    
    ALLOWED_EXTENSIONS = {
        # Documents
        ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx", ".txt", ".csv",
        # Images
        ".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg",
        # Video
        ".mp4",
        # Others
        ".zip", ".rar"
    }
    
    def __init__(self):
        self.upload_dir = settings.upload_dir
        self.max_file_size = settings.max_file_size_mb * 1024 * 1024  # Convert to bytes
        self._ensure_upload_dir()
    
    def _ensure_upload_dir(self):
        """Ensure upload directory exists."""
        os.makedirs(self.upload_dir, exist_ok=True)
    
    def _get_file_extension(self, filename: str) -> str:
        """Get lowercase file extension."""
        return os.path.splitext(filename)[1].lower()
    
    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate a unique filename while preserving the extension."""
        ext = self._get_file_extension(original_filename)
        unique_id = uuid.uuid4().hex[:8]
        name = os.path.splitext(original_filename)[0]
        
        # Clean the name:
        # 1. Replace spaces with underscores
        # 2. Keep only alphanumeric, dots, underscores, and dashes
        # 3. Limit length to 7 chars
        clean_name = name.replace(" ", "_")
        clean_name = "".join(c for c in clean_name if c.isalnum() or c in "._-")[:7]
        
        # Ensure name isn't empty after cleaning
        if not clean_name:
            clean_name = "file"
            
        return f"{clean_name}_{unique_id}{ext}"
    
    async def validate_file(self, file: UploadFile) -> Tuple[bool, str]:
        """
        Validate a file for upload.
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        # Check extension
        ext = self._get_file_extension(file.filename or "")
        if ext not in self.ALLOWED_EXTENSIONS:
            return False, f"Tipo de archivo no permitido: {ext}"
        
        # Check size by reading content
        content = await file.read()
        await file.seek(0)  # Reset file position
        
        if len(content) > self.max_file_size:
            return False, f"El archivo excede el tamaño máximo de {settings.max_file_size_mb}MB"
        
        return True, ""
    
    async def save_file(self, file: UploadFile) -> str:
        """
        Save an uploaded file and return the stored filename.
        
        Returns:
            The stored filename
        """
        # Validate first
        is_valid, error_msg = await self.validate_file(file)
        if not is_valid:
            raise HTTPException(status_code=400, detail=error_msg)
        
        # Generate unique filename
        stored_filename = self._generate_unique_filename(file.filename or "file")
        filepath = os.path.join(self.upload_dir, stored_filename)
        
        # Save file
        content = await file.read()
        async with aiofiles.open(filepath, "wb") as f:
            await f.write(content)
        
        return stored_filename
    
    async def save_files(self, files: List[UploadFile]) -> List[str]:
        """
        Save multiple uploaded files.
        
        Returns:
            List of stored filenames
        """
        filenames = []
        for file in files:
            filename = await self.save_file(file)
            filenames.append(filename)
        return filenames
    
    def delete_file(self, filename: str) -> bool:
        """Delete a file from the uploads directory."""
        filepath = os.path.join(self.upload_dir, filename)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False
    
    def delete_files(self, filenames: List[str]) -> int:
        """Delete multiple files. Returns count of deleted files."""
        deleted = 0
        for filename in filenames:
            if self.delete_file(filename):
                deleted += 1
        return deleted
    
    def get_file_path(self, filename: str) -> str:
        """Get the full path of a file."""
        return os.path.join(self.upload_dir, filename)
    
    def file_exists(self, filename: str) -> bool:
        """Check if a file exists."""
        return os.path.exists(self.get_file_path(filename))


# Singleton instance
file_service = FileService()
