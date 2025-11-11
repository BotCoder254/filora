"""
PostgreSQL Large Object utilities for efficient large file storage.
Provides chunked upload and streaming download capabilities.
"""

import psycopg2
from django.db import connection
from django.conf import settings
from contextlib import contextmanager
import logging

logger = logging.getLogger(__name__)

class PostgreSQLLOBManager:
    """Manager class for PostgreSQL Large Object operations"""
    
    def __init__(self):
        self.connection = None
        
    @contextmanager
    def get_connection(self):
        """Get a PostgreSQL connection with Large Object support"""
        try:
            # Use Django's connection but enable autocommit for LOB operations
            conn = connection.connection
            if conn is None:
                connection.ensure_connection()
                conn = connection.connection
                
            # DON'T set autocommit for LOB operations - use transactions instead
            yield conn
            
        except Exception as e:
            logger.error(f"PostgreSQL connection error: {e}")
            raise
    
    def create_lob(self):
        """Create a new PostgreSQL Large Object and return its OID"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Create a new large object in BINARY mode
                    lob_oid = conn.lobject(0, 'wb').oid
                    logger.info(f"Created PostgreSQL LOB with OID: {lob_oid}")
                    return lob_oid
        except Exception as e:
            logger.error(f"Failed to create PostgreSQL LOB: {e}")
            raise
    
    def append_chunk_to_lob(self, lob_oid, chunk_data):
        """Append chunk data to an existing PostgreSQL Large Object"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Open the large object for writing in BINARY mode
                    lob = conn.lobject(lob_oid, 'wb')
                    
                    # Seek to the end for appending
                    lob.seek(0, 2)  # SEEK_END
                    
                    # Write chunk data
                    bytes_written = lob.write(chunk_data)
                    
                    # Close the large object
                    lob.close()
                    
                    logger.debug(f"Appended {bytes_written} bytes to LOB {lob_oid}")
                    return bytes_written
                    
        except Exception as e:
            logger.error(f"Failed to append chunk to LOB {lob_oid}: {e}")
            raise
    
    def write_chunk_at_position(self, lob_oid, chunk_data, position):
        """Write chunk data at a specific position in PostgreSQL Large Object"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Open the large object for writing in BINARY mode
                    lob = conn.lobject(lob_oid, 'wb')
                    
                    # Seek to the specified position
                    lob.seek(position)
                    
                    # Write chunk data
                    bytes_written = lob.write(chunk_data)
                    
                    # Close the large object
                    lob.close()
                    
                    logger.debug(f"Wrote {bytes_written} bytes to LOB {lob_oid} at position {position}")
                    return bytes_written
                    
        except Exception as e:
            logger.error(f"Failed to write chunk to LOB {lob_oid} at position {position}: {e}")
            raise
    
    def read_lob(self, lob_oid, chunk_size=8192):
        """Generator to read PostgreSQL Large Object in chunks"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Open the large object for reading in BINARY mode
                    lob = conn.lobject(lob_oid, 'rb')
                    
                    try:
                        while True:
                            chunk = lob.read(chunk_size)
                            if not chunk:
                                break
                            yield chunk
                    finally:
                        lob.close()
                        
        except Exception as e:
            logger.error(f"Failed to read LOB {lob_oid}: {e}")
            raise
    
    def get_lob_size(self, lob_oid):
        """Get the size of a PostgreSQL Large Object"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Open in BINARY mode for accurate size calculation
                    lob = conn.lobject(lob_oid, 'rb')
                    
                    # Seek to end and get position
                    lob.seek(0, 2)  # SEEK_END
                    size = lob.tell()
                    
                    lob.close()
                    return size
                    
        except Exception as e:
            logger.error(f"Failed to get size of LOB {lob_oid}: {e}")
            raise
    
    def delete_lob(self, lob_oid):
        """Delete a PostgreSQL Large Object"""
        from django.db import transaction
        try:
            with transaction.atomic():
                with self.get_connection() as conn:
                    # Unlink (delete) the large object
                    conn.lobject(lob_oid, 'n').unlink()
                    logger.info(f"Deleted PostgreSQL LOB with OID: {lob_oid}")
                    
        except Exception as e:
            logger.error(f"Failed to delete LOB {lob_oid}: {e}")
            raise
    
    def is_postgresql_available(self):
        """Check if we're using PostgreSQL database"""
        try:
            return 'postgresql' in settings.DATABASES['default']['ENGINE']
        except:
            return False
    
    def calculate_chunk_position(self, chunk_number, chunk_size):
        """Calculate the byte position for a given chunk number"""
        return chunk_number * chunk_size

# Global instance
lob_manager = PostgreSQLLOBManager()