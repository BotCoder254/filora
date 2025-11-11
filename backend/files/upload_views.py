import uuid
import mimetypes
import hashlib
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import cloudinary
import cloudinary.uploader
from .models import File, Folder, UploadSession
from .serializers import FileSerializer
from .lob_utils import lob_manager
import logging

logger = logging.getLogger(__name__)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def init_upload(request):
    """Initialize upload session and return upload details"""
    filename = request.data.get('filename')
    size = request.data.get('size')
    mime_type = request.data.get('mime_type')
    folder_id = request.data.get('folder_id')
    
    if not filename or not size:
        return Response({'error': 'filename and size are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Validate file size (100MB limit)
    if int(size) > 100 * 1024 * 1024:
        return Response({'error': 'File size exceeds 100MB limit'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    
    # Get folder object if folder_id is provided
    folder = None
    if folder_id:
        try:
            folder = Folder.objects.get(id=folder_id, owner=request.user)
        except Folder.DoesNotExist:
            return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Determine if we should use PostgreSQL LOB for this file
    use_postgres_lob = False
    if lob_manager.is_postgresql_available():
        # Use LOB for large video/audio files or when Cloudinary is not configured
        is_media_file = mime_type and (mime_type.startswith('video/') or mime_type.startswith('audio/'))
        is_large_file = int(size) > 10 * 1024 * 1024  # Files larger than 10MB
        cloudinary_available = getattr(settings, 'USE_CLOUDINARY', False)
        
        # Use PostgreSQL LOB for large media files or as fallback when Cloudinary unavailable
        use_postgres_lob = (is_media_file and is_large_file) or not cloudinary_available
    
    # Determine chunk size based on file type and size
    chunk_size = 1024 * 1024  # Default 1MB
    
    # For video/audio files or large files, use larger chunks for better performance
    if mime_type and (mime_type.startswith('video/') or mime_type.startswith('audio/')):
        chunk_size = 5 * 1024 * 1024  # 5MB chunks for media files
    elif int(size) > 50 * 1024 * 1024:  # Files larger than 50MB
        chunk_size = 2 * 1024 * 1024  # 2MB chunks for large files
    
    # Create upload session
    upload_session = UploadSession.objects.create(
        user=request.user,
        filename=filename,
        expected_size=size,
        mime_type=mime_type or 'application/octet-stream',
        folder=folder,
        status='initialized',
        use_postgres_lob=use_postgres_lob
    )
    
    # If using PostgreSQL LOB, create the LOB immediately
    if use_postgres_lob:
        try:
            lob_oid = lob_manager.create_lob()
            upload_session.postgres_lob_oid = lob_oid
            upload_session.save()
            logger.info(f"Created PostgreSQL LOB {lob_oid} for upload session {upload_session.id}")
        except Exception as e:
            upload_session.status = 'failed'
            upload_session.save()
            return Response({'error': f'Failed to create PostgreSQL LOB: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return Response({
        'upload_id': upload_session.id,
        'chunk_size': chunk_size,
        'max_file_size': 100 * 1024 * 1024,  # Updated to 100MB
        'use_postgres_lob': use_postgres_lob
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_chunk(request, upload_id):
    """Upload file chunk - supports both traditional file chunks and PostgreSQL LOB"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    chunk = request.FILES.get('chunk')
    chunk_number = int(request.data.get('chunk_number', 0))
    total_chunks = int(request.data.get('total_chunks', 1))
    
    if not chunk:
        return Response({'error': 'No chunk provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Read chunk data
    chunk_data = chunk.read()
    
    if upload_session.use_postgres_lob and upload_session.postgres_lob_oid:
        # Use PostgreSQL LOB for efficient chunked upload
        try:
            bytes_written = lob_manager.append_chunk_to_lob(
                upload_session.postgres_lob_oid, 
                chunk_data
            )
            
            # Update session progress
            upload_session.total_bytes_written += bytes_written
            upload_session.uploaded_chunks = upload_session.uploaded_chunks or []
            if chunk_number not in upload_session.uploaded_chunks:
                upload_session.uploaded_chunks.append(chunk_number)
            upload_session.save()
            
            progress = (upload_session.total_bytes_written / upload_session.expected_size) * 100
            
            logger.debug(f"LOB upload progress: {progress:.2f}% ({upload_session.total_bytes_written}/{upload_session.expected_size} bytes)")
            
            return Response({
                'chunk_number': chunk_number,
                'progress': progress,
                'uploaded_chunks': len(upload_session.uploaded_chunks),
                'total_chunks': total_chunks,
                'bytes_written': upload_session.total_bytes_written
            })
            
        except Exception as e:
            upload_session.status = 'failed'
            upload_session.save()
            logger.error(f"PostgreSQL LOB chunk upload failed: {e}")
            return Response({'error': f'LOB chunk upload failed: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    else:
        # Use traditional file chunk storage for non-LOB uploads
        try:
            chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
            default_storage.save(chunk_path, ContentFile(chunk_data))
            
            # Update upload session
            upload_session.uploaded_chunks = upload_session.uploaded_chunks or []
            if chunk_number not in upload_session.uploaded_chunks:
                upload_session.uploaded_chunks.append(chunk_number)
            upload_session.save()
            
            progress = (len(upload_session.uploaded_chunks) / total_chunks) * 100
            
            return Response({
                'chunk_number': chunk_number,
                'progress': progress,
                'uploaded_chunks': len(upload_session.uploaded_chunks),
                'total_chunks': total_chunks
            })
            
        except Exception as e:
            upload_session.status = 'failed'
            upload_session.save()
            logger.error(f"Traditional chunk upload failed: {e}")
            return Response({'error': f'Chunk upload failed: {str(e)}'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_upload(request, upload_id):
    """Complete upload and create file record with storage priority: Cloudinary > PostgreSQL LOB > Local"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if upload_session.status == 'completed':
        return Response({'error': 'Upload already completed'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        if upload_session.use_postgres_lob and upload_session.postgres_lob_oid:
            # Handle PostgreSQL LOB completion
            return _complete_lob_upload(upload_session, request.user)
        else:
            # Handle traditional chunk-based upload
            return _complete_traditional_upload(upload_session, request.user)
            
    except Exception as e:
        # Clean up on error
        upload_session.status = 'failed'
        upload_session.save()
        
        # Clean up LOB if it exists
        if upload_session.postgres_lob_oid:
            try:
                lob_manager.delete_lob(upload_session.postgres_lob_oid)
            except:
                pass  # Don't fail if LOB cleanup fails
                
        logger.error(f"Upload completion failed: {e}")
        return Response({'error': f'Upload completion failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _complete_lob_upload(upload_session, user):
    """Complete a PostgreSQL LOB upload"""
    try:
        # Verify LOB size matches expected size
        lob_size = lob_manager.get_lob_size(upload_session.postgres_lob_oid)
        expected_size = upload_session.expected_size
        
        if lob_size != expected_size:
            # Try to clean up LOB
            try:
                lob_manager.delete_lob(upload_session.postgres_lob_oid)
            except:
                pass
            upload_session.status = 'failed'
            upload_session.save()
            return Response({'error': f'File size mismatch: expected {expected_size}, got {lob_size}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Generate checksum from LOB data
        checksum_hash = hashlib.sha256()
        for chunk in lob_manager.read_lob(upload_session.postgres_lob_oid, chunk_size=8192):
            checksum_hash.update(chunk)
        checksum = checksum_hash.hexdigest()
        
        # Create File record with PostgreSQL LOB storage
        file_obj = File(
            name=upload_session.filename,
            storage_key=f'lob/{upload_session.postgres_lob_oid}',
            postgres_lob_oid=upload_session.postgres_lob_oid,
            storage_type='postgres_lob',
            owner=user,
            folder=upload_session.folder,
            size_bytes=lob_size,
            mime_type=upload_session.mime_type,
            checksum=checksum,
            status='ready'
        )
        file_obj.save()
        
        # Update upload session
        upload_session.status = 'completed'
        upload_session.file = file_obj
        upload_session.save()
        
        logger.info(f"Completed PostgreSQL LOB upload: {file_obj.name} (LOB OID: {upload_session.postgres_lob_oid})")
        
        return Response(FileSerializer(file_obj, context={'request': None}).data, 
                       status=status.HTTP_201_CREATED)
                       
    except Exception as e:
        logger.error(f"LOB upload completion failed: {e}")
        raise


def _complete_traditional_upload(upload_session, user):
    """Complete a traditional chunk-based upload"""
    
    try:
        # Combine chunks into memory efficiently for large files
        buffer = bytearray()
        chunk_number = 0
        total_size = 0
        
        # Collect all chunks in order
        while True:
            chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
            if default_storage.exists(chunk_path):
                try:
                    with default_storage.open(chunk_path, 'rb') as chunk_file:
                        chunk_data = chunk_file.read()
                        buffer.extend(chunk_data)
                        total_size += len(chunk_data)
                    # Clean up chunk immediately to save disk space
                    default_storage.delete(chunk_path)
                    chunk_number += 1
                except Exception as e:
                    # Handle individual chunk read errors
                    upload_session.status = 'failed'
                    upload_session.save()
                    return Response({'error': f'Failed to read chunk {chunk_number}: {str(e)}'}, 
                                  status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            else:
                break

        # Validate file size
        expected = int(upload_session.expected_size)
        if total_size != expected:
            upload_session.status = 'failed'
            upload_session.save()
            return Response({'error': f'File size mismatch: expected {expected}, got {total_size}'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Generate checksum for integrity verification
        file_data = bytes(buffer)
        checksum = hashlib.sha256(file_data).hexdigest()

        # Upload to Cloudinary if configured, otherwise use PostgreSQL/local storage
        cloudinary_public_id = None
        cloudinary_url = None
        cloudinary_secure_url = None
        use_cloudinary = getattr(settings, 'USE_CLOUDINARY', False)
        
        # Try Cloudinary first if configured
        if use_cloudinary:
            try:
                # Generate unique public_id
                public_id = f"filora/{user.id}/{uuid.uuid4()}"
                
                # Determine resource type based on mime type
                resource_type = "auto"
                if upload_session.mime_type.startswith('video/'):
                    resource_type = "video"
                elif upload_session.mime_type.startswith('audio/'):
                    resource_type = "raw"  # Use raw for audio files
                elif upload_session.mime_type.startswith('image/'):
                    resource_type = "image"
                else:
                    resource_type = "raw"  # Use raw for other file types
                
                # Upload to Cloudinary with appropriate settings for large files
                upload_result = cloudinary.uploader.upload(
                    file_data,
                    public_id=public_id,
                    resource_type=resource_type,
                    filename=upload_session.filename,
                    use_filename=True,
                    unique_filename=False,
                    overwrite=False,
                    chunk_size=6000000,  # 6MB chunks for large files
                    timeout=300,  # 5 minute timeout for large uploads
                )
                
                cloudinary_public_id = upload_result.get('public_id')
                cloudinary_url = upload_result.get('url')
                cloudinary_secure_url = upload_result.get('secure_url')
                
            except Exception as e:
                # Log the error but continue with PostgreSQL fallback
                print(f"Cloudinary upload failed, falling back to PostgreSQL: {str(e)}")
                use_cloudinary = False

        # Create File record
        file_obj = File(
            name=upload_session.filename,
            storage_key=cloudinary_public_id or f'files/{user.id}/{uuid.uuid4()}/{upload_session.filename}',
            cloudinary_public_id=cloudinary_public_id,
            cloudinary_url=cloudinary_url,
            cloudinary_secure_url=cloudinary_secure_url,
            storage_type='cloudinary' if cloudinary_public_id else 'local_file',
            owner=user,
            folder=upload_session.folder,
            size_bytes=total_size,
            mime_type=upload_session.mime_type,
            checksum=checksum,
            status='ready'
        )

        # If not using Cloudinary or Cloudinary failed, save file to PostgreSQL/local storage
        if not use_cloudinary or not cloudinary_public_id:
            # Store file data directly in PostgreSQL as binary data or save to local storage
            try:
                django_file = ContentFile(file_data, name=upload_session.filename)
                file_obj.file.save(upload_session.filename, django_file, save=False)
                # For PostgreSQL, we can also store large objects or use bytea fields
                # The file field will handle the storage automatically
            except Exception as e:
                upload_session.status = 'failed'
                upload_session.save()
                return Response({'error': f'Local storage failed: {str(e)}'}, 
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        file_obj.save()

        # Update upload session
        upload_session.status = 'completed'
        upload_session.file = file_obj
        upload_session.save()

        return Response(FileSerializer(file_obj, context={'request': None}).data, 
                       status=status.HTTP_201_CREATED)

    except Exception as e:
        # Clean up on error
        upload_session.status = 'failed'
        upload_session.save()
        raise Exception(f'Upload completion failed: {str(e)}')

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_upload(request, upload_id):
    """Cancel upload and clean up resources"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Clean up PostgreSQL LOB if it exists
    if upload_session.postgres_lob_oid:
        try:
            lob_manager.delete_lob(upload_session.postgres_lob_oid)
            logger.info(f"Cleaned up PostgreSQL LOB {upload_session.postgres_lob_oid} for cancelled upload")
        except Exception as e:
            logger.warning(f"Failed to cleanup LOB {upload_session.postgres_lob_oid}: {e}")
    
    # Clean up traditional chunks
    if upload_session.uploaded_chunks:
        for chunk_number in upload_session.uploaded_chunks:
            chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
            if default_storage.exists(chunk_path):
                try:
                    default_storage.delete(chunk_path)
                except Exception as e:
                    logger.warning(f"Failed to cleanup chunk {chunk_path}: {e}")
    
    upload_session.status = 'cancelled'
    upload_session.save()
    
    return Response({'message': 'Upload cancelled'}, status=status.HTTP_200_OK)