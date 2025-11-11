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
    
    # Validate file size (50MB limit)
    if int(size) > 50 * 1024 * 1024:
        return Response({'error': 'File size exceeds 50MB limit'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
    
    # Get folder object if folder_id is provided
    folder = None
    if folder_id:
        try:
            folder = Folder.objects.get(id=folder_id, owner=request.user)
        except Folder.DoesNotExist:
            return Response({'error': 'Folder not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Create upload session
    upload_session = UploadSession.objects.create(
        user=request.user,
        filename=filename,
        expected_size=size,
        mime_type=mime_type or 'application/octet-stream',
        folder=folder,
        status='initialized'
    )
    
    return Response({
        'upload_id': upload_session.id,
        'chunk_size': 1024 * 1024,  # 1MB chunks
        'max_file_size': 50 * 1024 * 1024
    }, status=status.HTTP_201_CREATED)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_chunk(request, upload_id):
    """Upload file chunk"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    chunk = request.FILES.get('chunk')
    chunk_number = int(request.data.get('chunk_number', 0))
    total_chunks = int(request.data.get('total_chunks', 1))
    
    if not chunk:
        return Response({'error': 'No chunk provided'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Store chunk temporarily
    chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
    default_storage.save(chunk_path, chunk)
    
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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def complete_upload(request, upload_id):
    """Complete upload and create file record with Cloudinary storage"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    if upload_session.status == 'completed':
        return Response({'error': 'Upload already completed'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Combine chunks into memory
        buffer = bytearray()
        chunk_number = 0
        total_size = 0
        
        # Collect all chunks
        while True:
            chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
            if default_storage.exists(chunk_path):
                with default_storage.open(chunk_path, 'rb') as chunk_file:
                    chunk_data = chunk_file.read()
                    buffer.extend(chunk_data)
                    total_size += len(chunk_data)
                # Clean up chunk immediately
                default_storage.delete(chunk_path)
                chunk_number += 1
            else:
                break

        # Validate file size
        expected = int(upload_session.expected_size)
        if total_size != expected:
            upload_session.status = 'failed'
            upload_session.save()
            return Response({'error': f'File size mismatch: expected {expected}, got {total_size}'}, 
                          status=status.HTTP_400_BAD_REQUEST)

        # Generate checksum
        file_data = bytes(buffer)
        checksum = hashlib.sha256(file_data).hexdigest()

        # Upload to Cloudinary if configured
        cloudinary_public_id = None
        cloudinary_url = None
        cloudinary_secure_url = None
        
        if getattr(settings, 'USE_CLOUDINARY', False):
            try:
                # Generate unique public_id
                public_id = f"filora/{request.user.id}/{uuid.uuid4()}"
                
                # Upload to Cloudinary
                upload_result = cloudinary.uploader.upload(
                    file_data,
                    public_id=public_id,
                    resource_type="auto",  # Auto-detect file type
                    filename=upload_session.filename,
                    use_filename=True,
                    unique_filename=False,
                    overwrite=False,
                )
                
                cloudinary_public_id = upload_result.get('public_id')
                cloudinary_url = upload_result.get('url')
                cloudinary_secure_url = upload_result.get('secure_url')
                
            except Exception as e:
                upload_session.status = 'failed'
                upload_session.save()
                return Response({'error': f'Cloudinary upload failed: {str(e)}'}, 
                               status=status.HTTP_500_INTERNAL_SERVER_ERROR)

        # Create File record
        file_obj = File(
            name=upload_session.filename,
            storage_key=cloudinary_public_id or f'files/{request.user.id}/{uuid.uuid4()}/{upload_session.filename}',
            cloudinary_public_id=cloudinary_public_id,
            cloudinary_url=cloudinary_url,
            cloudinary_secure_url=cloudinary_secure_url,
            owner=request.user,
            folder=upload_session.folder,
            size_bytes=total_size,
            mime_type=upload_session.mime_type,
            checksum=checksum,
            status='ready'
        )

        # If not using Cloudinary, save file locally
        if not getattr(settings, 'USE_CLOUDINARY', False):
            django_file = ContentFile(file_data, name=upload_session.filename)
            file_obj.file.save(upload_session.filename, django_file, save=False)

        file_obj.save()

        # Update upload session
        upload_session.status = 'completed'
        upload_session.file = file_obj
        upload_session.save()

        return Response(FileSerializer(file_obj, context={'request': request}).data, 
                       status=status.HTTP_201_CREATED)

    except Exception as e:
        # Clean up on error
        upload_session.status = 'failed'
        upload_session.save()
        return Response({'error': f'Upload completion failed: {str(e)}'}, 
                       status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_upload(request, upload_id):
    """Cancel upload and clean up"""
    try:
        upload_session = UploadSession.objects.get(id=upload_id, user=request.user)
    except UploadSession.DoesNotExist:
        return Response({'error': 'Upload session not found'}, status=status.HTTP_404_NOT_FOUND)
    
    # Clean up chunks
    if upload_session.uploaded_chunks:
        for chunk_number in upload_session.uploaded_chunks:
            chunk_path = f'uploads/temp/{upload_session.id}/chunk_{chunk_number}'
            if default_storage.exists(chunk_path):
                default_storage.delete(chunk_path)
    
    upload_session.status = 'cancelled'
    upload_session.save()
    
    return Response({'message': 'Upload cancelled'}, status=status.HTTP_200_OK)