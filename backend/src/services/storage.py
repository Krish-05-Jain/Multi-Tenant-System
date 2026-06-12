import os
import logging
from typing import Optional
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class StorageService:
    def __init__(self):
        self.supabase_client: Optional[Client] = None
        supabase_url = os.getenv("SUPABASE_URL")
        supabase_key = os.getenv("SUPABASE_KEY")
        
        if supabase_url and supabase_key:
            try:
                self.supabase_client = create_client(supabase_url, supabase_key)
                logger.info("Supabase client initialized successfully for asset storage.")
            except Exception as e:
                logger.warning(f"Error initializing Supabase client: {e}")
        else:
            logger.info("Supabase credentials not configured. Local mock asset pipeline active.")

    def upload_file(self, tenant_id: str, bucket_name: str, file_path: str, file_bytes: bytes, content_type: str) -> Optional[str]:
        """
        Uploads a file to a specific tenant's folder inside a Supabase Storage bucket.
        """
        # Ensure strict tenant isolation in path structure
        destination_path = f"{tenant_id}/{file_path}"
        
        if self.supabase_client:
            try:
                # supabase client storage upload
                bucket = self.supabase_client.storage.from_(bucket_name)
                response = bucket.upload(
                    path=destination_path,
                    file=file_bytes,
                    file_options={"content-type": content_type, "upsert": "true"}
                )
                # Retrieve public url
                public_url = bucket.get_public_url(destination_path)
                return public_url
            except Exception as e:
                logger.error(f"Supabase upload error for tenant {tenant_id}: {e}")
                return None
        
        # Fallback Mock Link for local dev
        logger.info(f"Mock Upload: Saved {file_path} to virtual tenant bucket [{bucket_name}] under /{tenant_id}/")
        return f"https://mockstorage.local/{bucket_name}/{tenant_id}/{file_path}"

# Global Singleton Instance
storage_service = StorageService()
