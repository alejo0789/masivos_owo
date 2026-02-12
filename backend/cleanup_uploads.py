import os
import time
from config import get_settings

def cleanup_old_files(days=3):
    """
    Delete files in the upload directory that are older than the specified number of days.
    """
    settings = get_settings()
    upload_dir = settings.upload_dir
    
    if not os.path.exists(upload_dir):
        print(f"Directory {upload_dir} does not exist.")
        return

    now = time.time()
    cutoff = now - (days * 86400)
    
    deleted_count = 0
    
    print(f"Starting cleanup of {upload_dir} for files older than {days} days...")
    
    for filename in os.listdir(upload_dir):
        file_path = os.path.join(upload_dir, filename)
        
        # Skip directories, only delete files
        if not os.path.isfile(file_path):
            continue
        
        # Skip .gitkeep or special files if any (optional)
        if filename == ".gitkeep":
            continue
            
        file_mtime = os.path.getmtime(file_path)
        
        if file_mtime < cutoff:
            try:
                os.remove(file_path)
                print(f"Deleted: {filename}")
                deleted_count += 1
            except Exception as e:
                print(f"Error deleting {filename}: {e}")
                
    print(f"Cleanup complete. Deleted {deleted_count} files.")

if __name__ == "__main__":
    cleanup_old_files()
