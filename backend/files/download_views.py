"""
Views for downloading files stored in PostgreSQL Large Objects and other storage types
"""

from django.http import HttpResponse, Http404, StreamingHttpResponse
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.files.storage import default_storage
from .models import File
from .lob_utils import lob_manager
import logging
import mimetypes

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def download_file(request, file_id):
    """Download a file from any storage type (Cloudinary, PostgreSQL LOB, or local)"""
    try:
        file_obj = get_object_or_404(File, id=file_id)
        
        # Check permissions (you can expand this logic)
        if file_obj.owner != request.user and not file_obj.is_public:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Increment download count
        file_obj.increment_download_count()
        
        # Handle different storage types
        if file_obj.storage_type == 'postgres_lob' and file_obj.postgres_lob_oid:
            return _download_from_postgres_lob(file_obj)
        elif file_obj.storage_type == 'cloudinary' and file_obj.cloudinary_secure_url:
            return _redirect_to_cloudinary(file_obj)
        elif file_obj.storage_type == 'local_file' and file_obj.file:
            return _download_from_local_storage(file_obj)
        else:
            logger.error(f"No valid storage found for file {file_id}")
            return Response({'error': 'File not available'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Download failed for file {file_id}: {e}")
        return Response({'error': 'Download failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _download_from_postgres_lob(file_obj):
    """Stream download from PostgreSQL Large Object"""
    try:
        # Determine content type
        content_type = file_obj.mime_type or 'application/octet-stream'
        
        # Create streaming response for large files
        def generate_chunks():
            try:
                for chunk in lob_manager.read_lob(file_obj.postgres_lob_oid, chunk_size=8192):
                    yield chunk
            except Exception as e:
                logger.error(f"Error streaming LOB {file_obj.postgres_lob_oid}: {e}")
                raise
        
        response = StreamingHttpResponse(
            generate_chunks(),
            content_type=content_type
        )
        
        # Set headers for download
        response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
        response['Content-Length'] = str(file_obj.size_bytes)
        
        # Add cache headers for better performance
        response['Cache-Control'] = 'public, max-age=3600'
        response['ETag'] = f'"{file_obj.checksum}"'
        
        logger.info(f"Starting PostgreSQL LOB download for {file_obj.name} (OID: {file_obj.postgres_lob_oid})")
        return response
        
    except Exception as e:
        logger.error(f"PostgreSQL LOB download failed for {file_obj.name}: {e}")
        raise

def _redirect_to_cloudinary(file_obj):
    """Redirect to Cloudinary URL for direct download"""
    from django.shortcuts import redirect
    
    try:
        # Use secure URL if available, otherwise fallback to regular URL
        url = file_obj.cloudinary_secure_url or file_obj.cloudinary_url
        if url:
            logger.info(f"Redirecting to Cloudinary for {file_obj.name}")
            return redirect(url)
        else:
            raise Exception("No Cloudinary URL available")
            
    except Exception as e:
        logger.error(f"Cloudinary redirect failed for {file_obj.name}: {e}")
        raise

def _download_from_local_storage(file_obj):
    """Stream download from local file storage"""
    try:
        if not file_obj.file or not default_storage.exists(file_obj.file.name):
            raise Exception("Local file not found")
        
        # Determine content type
        content_type = file_obj.mime_type or mimetypes.guess_type(file_obj.name)[0] or 'application/octet-stream'
        
        # Open and stream the file
        def generate_chunks():
            try:
                with default_storage.open(file_obj.file.name, 'rb') as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
            except Exception as e:
                logger.error(f"Error streaming local file {file_obj.file.name}: {e}")
                raise
        
        response = StreamingHttpResponse(
            generate_chunks(),
            content_type=content_type
        )
        
        # Set headers for download
        response['Content-Disposition'] = f'attachment; filename="{file_obj.name}"'
        response['Content-Length'] = str(file_obj.size_bytes)
        
        # Add cache headers
        response['Cache-Control'] = 'public, max-age=3600'
        response['ETag'] = f'"{file_obj.checksum}"'
        
        logger.info(f"Starting local file download for {file_obj.name}")
        return response
        
    except Exception as e:
        logger.error(f"Local file download failed for {file_obj.name}: {e}")
        raise

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def stream_file(request, file_id):
    """Stream a file for viewing (video/audio) instead of downloading"""
    try:
        file_obj = get_object_or_404(File, id=file_id)
        
        # Check permissions
        if file_obj.owner != request.user and not file_obj.is_public:
            return Response({'error': 'Access denied'}, status=status.HTTP_403_FORBIDDEN)
        
        # Only allow streaming for video/audio files
        if not (file_obj.is_video or file_obj.is_audio):
            return Response({'error': 'File type not streamable'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Handle different storage types for streaming
        if file_obj.storage_type == 'postgres_lob' and file_obj.postgres_lob_oid:
            return _stream_from_postgres_lob(file_obj, request)
        elif file_obj.storage_type == 'cloudinary' and file_obj.cloudinary_secure_url:
            return _redirect_to_cloudinary(file_obj)
        elif file_obj.storage_type == 'local_file' and file_obj.file:
            return _stream_from_local_storage(file_obj, request)
        else:
            return Response({'error': 'File not available'}, status=status.HTTP_404_NOT_FOUND)
            
    except Exception as e:
        logger.error(f"Streaming failed for file {file_id}: {e}")
        return Response({'error': 'Streaming failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

def _stream_from_postgres_lob(file_obj, request):
    """Stream video/audio from PostgreSQL LOB with range support"""
    try:
        content_type = file_obj.mime_type
        file_size = file_obj.size_bytes
        
        # Handle range requests for video streaming
        range_header = request.META.get('HTTP_RANGE')
        if range_header:
            # Parse range header (e.g., "bytes=0-1023")
            range_match = range_header.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            
            # Ensure valid range
            start = max(0, start)
            end = min(file_size - 1, end)
            content_length = end - start + 1
            
            def generate_range_chunks():
                try:
                    current_pos = 0
                    for chunk in lob_manager.read_lob(file_obj.postgres_lob_oid, chunk_size=8192):
                        chunk_end = current_pos + len(chunk) - 1
                        
                        # Skip chunks before our range
                        if chunk_end < start:
                            current_pos += len(chunk)
                            continue
                        
                        # Stop if we're past our range
                        if current_pos > end:
                            break
                        
                        # Trim chunk to fit within range
                        chunk_start = max(0, start - current_pos)
                        chunk_end_trim = min(len(chunk), end - current_pos + 1)
                        
                        if chunk_start < chunk_end_trim:
                            yield chunk[chunk_start:chunk_end_trim]
                        
                        current_pos += len(chunk)
                        
                except Exception as e:
                    logger.error(f"Error streaming LOB range {start}-{end}: {e}")
                    raise
            
            response = StreamingHttpResponse(
                generate_range_chunks(),
                content_type=content_type,
                status=206  # Partial Content
            )
            
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Content-Length'] = str(content_length)
            response['Accept-Ranges'] = 'bytes'
            
        else:
            # Full file stream
            def generate_chunks():
                for chunk in lob_manager.read_lob(file_obj.postgres_lob_oid, chunk_size=8192):
                    yield chunk
            
            response = StreamingHttpResponse(
                generate_chunks(),
                content_type=content_type
            )
            response['Content-Length'] = str(file_size)
            response['Accept-Ranges'] = 'bytes'
        
        # Set streaming headers
        response['Cache-Control'] = 'public, max-age=3600'
        response['ETag'] = f'"{file_obj.checksum}"'
        
        return response
        
    except Exception as e:
        logger.error(f"PostgreSQL LOB streaming failed for {file_obj.name}: {e}")
        raise

def _stream_from_local_storage(file_obj, request):
    """Stream video/audio from local storage with range support"""
    try:
        if not file_obj.file or not default_storage.exists(file_obj.file.name):
            raise Exception("Local file not found")
        
        content_type = file_obj.mime_type
        file_size = file_obj.size_bytes
        
        # Handle range requests
        range_header = request.META.get('HTTP_RANGE')
        if range_header:
            # Parse range header
            range_match = range_header.replace('bytes=', '').split('-')
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if range_match[1] else file_size - 1
            
            start = max(0, start)
            end = min(file_size - 1, end)
            content_length = end - start + 1
            
            def generate_range_chunks():
                try:
                    with default_storage.open(file_obj.file.name, 'rb') as f:
                        f.seek(start)
                        remaining = content_length
                        while remaining > 0:
                            chunk_size = min(8192, remaining)
                            chunk = f.read(chunk_size)
                            if not chunk:
                                break
                            yield chunk
                            remaining -= len(chunk)
                except Exception as e:
                    logger.error(f"Error streaming local file range {start}-{end}: {e}")
                    raise
            
            response = StreamingHttpResponse(
                generate_range_chunks(),
                content_type=content_type,
                status=206
            )
            
            response['Content-Range'] = f'bytes {start}-{end}/{file_size}'
            response['Content-Length'] = str(content_length)
            response['Accept-Ranges'] = 'bytes'
            
        else:
            # Full file stream
            def generate_chunks():
                with default_storage.open(file_obj.file.name, 'rb') as f:
                    while True:
                        chunk = f.read(8192)
                        if not chunk:
                            break
                        yield chunk
            
            response = StreamingHttpResponse(
                generate_chunks(),
                content_type=content_type
            )
            response['Content-Length'] = str(file_size)
            response['Accept-Ranges'] = 'bytes'
        
        response['Cache-Control'] = 'public, max-age=3600'
        response['ETag'] = f'"{file_obj.checksum}"'
        
        return response
        
    except Exception as e:
        logger.error(f"Local file streaming failed for {file_obj.name}: {e}")
        raise