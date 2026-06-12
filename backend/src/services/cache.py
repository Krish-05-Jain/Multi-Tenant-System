import os
import logging
from typing import Any, Optional
import json

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        self.redis_client = None
        self.memory_cache = {}
        redis_url = os.getenv("REDIS_URL")
        
        if redis_url:
            try:
                import redis
                self.redis_client = redis.from_url(redis_url, decode_responses=True)
                # Quick connection test
                self.redis_client.ping()
                logger.info("Connected to Redis server successfully.")
            except Exception as e:
                logger.warning(f"Failed to connect to Redis at {redis_url}: {e}. Falling back to in-memory cache.")
                self.redis_client = None
        else:
            logger.info("REDIS_URL not configured. Running in-memory cache fallback.")

    def get(self, key: str) -> Optional[Any]:
        if self.redis_client:
            try:
                val = self.redis_client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                logger.error(f"Redis get error: {e}")
        return self.memory_cache.get(key)

    def set(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        serialized = json.dumps(value)
        if self.redis_client:
            try:
                self.redis_client.set(key, serialized, ex=expire_seconds)
                return True
            except Exception as e:
                logger.error(f"Redis set error: {e}")
        
        self.memory_cache[key] = value
        # Simple local dict expirations can be added if needed, but dict fallback is fine for dev
        return True

    def delete(self, key: str) -> bool:
        if self.redis_client:
            try:
                self.redis_client.delete(key)
                return True
            except Exception as e:
                logger.error(f"Redis delete error: {e}")
                
        if key in self.memory_cache:
            del self.memory_cache[key]
            return True
        return False

# Global Singleton Instance
cache_service = CacheService()
