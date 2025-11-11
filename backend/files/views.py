from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.db import models
from django.contrib.auth import get_user_model
from .models import File, Folder, Share, Invite, FileActivity, FileVersion, Activity
from .serializers import (
    FileSerializer, FolderSerializer, FileUploadSerializer,
    FileDetailSerializer, FileRenameSerializer, FileVersionSerializer, ActivitySerializer
)

User = get_user_model()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def folders(request):
    if request.method == 'GET':
        parent_id = request.query_params.get('parent')
        if parent_id:
            folders = Folder.objects.filter(owner=request.user, parent_id=parent_id)
        else:
            folders = Folder.objects.filter(owner=request.user, parent=None)
        serializer = FolderSerializer(folders, many=True)
        return Response(serializer.data)
    
    elif request.method == 'POST':
        serializer = FolderSerializer(data=request.data)
        if serializer.is_valid():
            # Check for cycle prevention
            parent_id = serializer.validated_data.get('parent')
            if parent_id:
                # Ensure parent exists and is owned by user
                try:
                    parent = Folder.objects.get(id=parent_id, owner=request.user)
                except Folder.DoesNotExist:
                    return Response({'error': 'Parent folder not found'}, status=status.HTTP_400_BAD_REQUEST)
            
            folder = serializer.save(owner=request.user)
            
            # Log activity
            FileActivity.objects.create(
                file=None,
                user=request.user,
                action='created',
                details={'folder_name': folder.name, 'folder_id': str(folder.id)},
                ip_address=request.META.get('REMOTE_ADDR'),
                user_agent=request.META.get('HTTP_USER_AGENT', '')
            )
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def folder_detail(request, folder_id):
    folder = get_object_or_404(Folder, id=folder_id, owner=request.user)
    
    if request.method == 'GET':
        serializer = FolderSerializer(folder)
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = FolderSerializer(folder, data=request.data, partial=True)
        if serializer.is_valid():
            # Check for cycle prevention if parent is being changed
            new_parent_id = serializer.validated_data.get('parent')
            if new_parent_id and new_parent_id != folder.parent_id:
                # Prevent moving folder into its own subtree
                if _would_create_cycle(folder, new_parent_id):
                    return Response({'error': 'Cannot move folder into its own subtree'}, status=status.HTTP_400_BAD_REQUEST)
            
            old_name = folder.name
            updated_folder = serializer.save(updated_at=timezone.now())
            
            # Log rename activity if name changed
            if 'name' in request.data and old_name != updated_folder.name:
                FileActivity.objects.create(
                    file=None,
                    user=request.user,
                    action='renamed',
                    details={'old_name': old_name, 'new_name': updated_folder.name, 'folder_id': str(updated_folder.id)},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        # Check if folder has contents
        files_count = folder.files.count()
        subfolders_count = folder.subfolders.count()
        
        if files_count > 0 or subfolders_count > 0:
            return Response({
                'error': 'Folder is not empty',
                'files_count': files_count,
                'subfolders_count': subfolders_count
            }, status=status.HTTP_400_BAD_REQUEST)
        
        FileActivity.objects.create(
            file=None,
            user=request.user,
            action='deleted',
            details={'folder_name': folder.name, 'folder_id': str(folder.id)},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        folder.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def folder_contents(request, folder_id):
    folder = get_object_or_404(Folder, id=folder_id, owner=request.user)
    
    # Get subfolders
    subfolders = folder.subfolders.all()
    folders_data = FolderSerializer(subfolders, many=True).data
    
    # Get files
    files = folder.files.filter(status='ready')
    files_data = FileSerializer(files, many=True, context={'request': request}).data
    
    # Get breadcrumb path
    breadcrumbs = _get_breadcrumbs(folder)
    
    return Response({
        'folder': FolderSerializer(folder).data,
        'breadcrumbs': breadcrumbs,
        'folders': folders_data,
        'files': files_data
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def move_file(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    folder_id = request.data.get('folder_id')
    
    old_folder = file_obj.folder
    
    if folder_id:
        new_folder = get_object_or_404(Folder, id=folder_id, owner=request.user)
        file_obj.folder = new_folder
    else:
        file_obj.folder = None
    
    file_obj.modified_at = timezone.now()
    file_obj.save()
    
    # Log move activity
    FileActivity.objects.create(
        file=file_obj,
        user=request.user,
        action='moved',
        details={
            'old_folder': old_folder.name if old_folder else 'Root',
            'new_folder': new_folder.name if folder_id else 'Root'
        },
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    return Response(FileSerializer(file_obj, context={'request': request}).data)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_folder_force(request, folder_id):
    folder = get_object_or_404(Folder, id=folder_id, owner=request.user)
    
    # Recursively delete all contents
    _delete_folder_recursive(folder, request.user, request.META)
    
    return Response(status=status.HTTP_204_NO_CONTENT)

def _would_create_cycle(folder, new_parent_id):
    """Check if moving folder to new_parent_id would create a cycle"""
    current = Folder.objects.filter(id=new_parent_id).first()
    while current:
        if current.id == folder.id:
            return True
        current = current.parent
    return False

def _get_breadcrumbs(folder):
    """Get breadcrumb trail for a folder"""
    breadcrumbs = []
    current = folder
    while current:
        breadcrumbs.insert(0, {
            'id': str(current.id),
            'name': current.name
        })
        current = current.parent
    
    # Add root
    breadcrumbs.insert(0, {
        'id': None,
        'name': 'My Files'
    })
    
    return breadcrumbs

def _delete_folder_recursive(folder, user, meta):
    """Recursively delete folder and all contents"""
    # Delete all files in folder
    for file_obj in folder.files.all():
        FileActivity.objects.create(
            file=file_obj,
            user=user,
            action='deleted',
            ip_address=meta.get('REMOTE_ADDR'),
            user_agent=meta.get('HTTP_USER_AGENT', '')
        )
        file_obj.delete()
    
    # Recursively delete subfolders
    for subfolder in folder.subfolders.all():
        _delete_folder_recursive(subfolder, user, meta)
    
    # Delete the folder itself
    FileActivity.objects.create(
        file=None,
        user=user,
        action='deleted',
        details={'folder_name': folder.name, 'folder_id': str(folder.id)},
        ip_address=meta.get('REMOTE_ADDR'),
        user_agent=meta.get('HTTP_USER_AGENT', '')
    )
    folder.delete()

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def files(request):
    if request.method == 'GET':
        # Get query parameters
        folder_id = request.query_params.get('folder')
        file_type = request.query_params.get('type')  # image, video, document, other
        search_query = request.query_params.get('q', '')
        sort_by = request.query_params.get('sort_by', '-modified_at')  # name, -name, modified_at, -modified_at, size_bytes, -size_bytes
        limit = int(request.query_params.get('limit', 50))
        cursor = request.query_params.get('cursor')
        
        # Base queryset
        files = File.objects.filter(owner=request.user, status='ready')
        
        # Apply folder filter
        if folder_id:
            files = files.filter(folder_id=folder_id)
        elif folder_id == '':
            # Empty string means get all files regardless of folder (for Recent Uploads)
            pass  # Don't apply any folder filter
        else:
            files = files.filter(folder=None)
        
        # Apply type filter
        if file_type:
            if file_type == 'image':
                files = files.filter(mime_type__startswith='image/')
            elif file_type == 'video':
                files = files.filter(mime_type__startswith='video/')
            elif file_type == 'document':
                files = files.filter(mime_type__in=[
                    'application/pdf', 'application/msword', 
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ])
            elif file_type == 'other':
                files = files.exclude(mime_type__startswith='image/').exclude(
                    mime_type__startswith='video/'
                ).exclude(mime_type__in=[
                    'application/pdf', 'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ])
        
        # Apply search filter
        if search_query:
            files = files.filter(name__icontains=search_query)
        
        # Apply sorting
        valid_sorts = ['name', '-name', 'modified_at', '-modified_at', 'size_bytes', '-size_bytes', 'created_at', '-created_at']
        if sort_by in valid_sorts:
            files = files.order_by(sort_by)
        else:
            files = files.order_by('-modified_at')
        
        # Apply cursor pagination
        if cursor:
            try:
                cursor_file = File.objects.get(id=cursor, owner=request.user)
                if sort_by.startswith('-'):
                    field = sort_by[1:]
                    cursor_value = getattr(cursor_file, field)
                    files = files.filter(**{f'{field}__lt': cursor_value})
                else:
                    cursor_value = getattr(cursor_file, sort_by)
                    files = files.filter(**{f'{sort_by}__gt': cursor_value})
            except File.DoesNotExist:
                pass
        
        # Limit results
        files_page = files[:limit + 1]  # Get one extra to check if there are more
        has_more = len(files_page) > limit
        if has_more:
            files_page = files_page[:limit]
        
        # Get next cursor
        next_cursor = None
        if has_more and files_page:
            next_cursor = str(files_page[-1].id)
        
        serializer = FileSerializer(files_page, many=True, context={'request': request})
        
        return Response({
            'files': serializer.data,
            'has_more': has_more,
            'next_cursor': next_cursor,
            'total_count': files.count() if not cursor else None  # Only count on first page
        })
    
    elif request.method == 'POST':
        serializer = FileUploadSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            file_obj = serializer.save()
            return Response(FileSerializer(file_obj, context={'request': request}).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def file_detail(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    if request.method == 'GET':
        # Log file access
        FileActivity.objects.create(
            file=file_obj,
            user=request.user,
            action='downloaded',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        serializer = FileDetailSerializer(file_obj, context={'request': request})
        return Response(serializer.data)
    
    elif request.method == 'PUT':
        serializer = FileSerializer(file_obj, data=request.data, partial=True)
        if serializer.is_valid():
            old_name = file_obj.name
            updated_file = serializer.save(modified_at=timezone.now())
            
            # Log activity if name changed
            if 'name' in request.data and old_name != updated_file.name:
                FileActivity.objects.create(
                    file=updated_file,
                    user=request.user,
                    action='renamed',
                    details={'old_name': old_name, 'new_name': updated_file.name},
                    ip_address=request.META.get('REMOTE_ADDR'),
                    user_agent=request.META.get('HTTP_USER_AGENT', '')
                )
            
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    elif request.method == 'DELETE':
        FileActivity.objects.create(
            file=file_obj,
            user=request.user,
            action='deleted',
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        file_obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rename_file(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    serializer = FileRenameSerializer(data=request.data)
    
    if serializer.is_valid():
        old_name = file_obj.name
        new_name = serializer.validated_data['new_name']
        
        file_obj.name = new_name
        file_obj.modified_at = timezone.now()
        file_obj.save()
        
        # Log rename activity
        FileActivity.objects.create(
            file=file_obj,
            user=request.user,
            action='renamed',
            details={'old_name': old_name, 'new_name': new_name},
            ip_address=request.META.get('REMOTE_ADDR'),
            user_agent=request.META.get('HTTP_USER_AGENT', '')
        )
        
        return Response(FileSerializer(file_obj, context={'request': request}).data)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_download(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    if file_obj.status != 'ready':
        return Response(
            {'error': 'File temporarily unavailable'}, 
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )
    
    # Increment download count and log activity
    file_obj.increment_download_count()
    FileActivity.objects.create(
        file=file_obj,
        user=request.user,
        action='downloaded',
        ip_address=request.META.get('REMOTE_ADDR'),
        user_agent=request.META.get('HTTP_USER_AGENT', '')
    )
    
    return Response({
        'download_url': file_obj.get_signed_url(),
        'filename': file_obj.name,
        'size': file_obj.size_bytes,
        'mime_type': file_obj.mime_type
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_share(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    share_type = request.data.get('type', 'public')
    permission = request.data.get('permission', 'viewer')
    expires_at = request.data.get('expires_at')
    password = request.data.get('password', '')
    target_email = request.data.get('target_email')
    
    if share_type == 'user':
        if not target_email:
            return Response({'error': 'target_email is required for user shares'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user exists
        try:
            target_user = User.objects.get(email=target_email)
            # Create direct share
            share = Share.objects.create(
                file=file_obj,
                actor=request.user,
                target_user=target_user,
                share_type='user',
                permission=permission,
                expires_at=expires_at
            )
            from .serializers import ShareSerializer
            serializer = ShareSerializer(share, context={'request': request})
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except User.DoesNotExist:
            # Create invite for non-registered user
            invite = Invite.objects.create(
                file=file_obj,
                actor=request.user,
                target_email=target_email,
                permission=permission,
                expires_at=expires_at
            )
            from .serializers import InviteSerializer
            serializer = InviteSerializer(invite, context={'request': request})
            return Response({
                'type': 'invite',
                'invite': serializer.data,
                'message': 'Invitation sent to unregistered user'
            }, status=status.HTTP_201_CREATED)
    
    else:  # public share
        # Check if public share already exists
        existing_share = Share.objects.filter(
            file=file_obj,
            share_type='public',
            is_active=True
        ).first()
        
        if existing_share:
            # Update existing share
            existing_share.permission = permission
            existing_share.expires_at = expires_at
            if password:
                existing_share.password = make_password(password)
            existing_share.save()
            share = existing_share
        else:
            # Create new public share
            share = Share.objects.create(
                file=file_obj,
                actor=request.user,
                share_type='public',
                permission=permission,
                expires_at=expires_at,
                password=make_password(password) if password else ''
            )
        
        from .serializers import ShareSerializer
        serializer = ShareSerializer(share, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_shares(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    shares = Share.objects.filter(file=file_obj, is_active=True)
    invites = Invite.objects.filter(file=file_obj, is_accepted=False)
    
    from .serializers import ShareSerializer, InviteSerializer
    shares_data = ShareSerializer(shares, many=True, context={'request': request}).data
    invites_data = InviteSerializer(invites, many=True, context={'request': request}).data
    
    return Response({
        'shares': shares_data,
        'invites': invites_data
    })

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def revoke_share(request, file_id, share_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    share = get_object_or_404(Share, id=share_id, file=file_obj, actor=request.user)
    
    share.is_active = False
    share.save()
    
    return Response({'message': 'Share revoked successfully'})

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def cancel_invite(request, file_id, invite_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    invite = get_object_or_404(Invite, id=invite_id, file=file_obj, actor=request.user)
    
    invite.delete()
    
    return Response({'message': 'Invite cancelled successfully'})

@api_view(['GET'])
def public_file_access(request, token):
    """Public access endpoint for shared files"""
    share = get_object_or_404(Share, token=token, share_type='public', is_active=True)
    
    if share.is_expired():
        return Response({'error': 'Share link has expired'}, status=status.HTTP_410_GONE)
    
    # Check password if required
    if share.password:
        provided_password = request.query_params.get('password')
        if not provided_password or not check_password(provided_password, share.password):
            return Response({'error': 'Password required', 'requires_password': True}, status=status.HTTP_401_UNAUTHORIZED)
    
    file_obj = share.file
    if not file_obj or file_obj.status != 'ready':
        return Response({'error': 'File not available'}, status=status.HTTP_404_NOT_FOUND)
    
    # Return file info and access URLs
    return Response({
        'file': {
            'id': str(file_obj.id),
            'name': file_obj.name,
            'size_bytes': file_obj.size_bytes,
            'mime_type': file_obj.mime_type,
            'can_preview': file_obj.can_preview,
            'is_image': file_obj.is_image,
            'is_video': file_obj.is_video,
            'is_audio': file_obj.is_audio,
            'duration': file_obj.duration,
            'page_count': file_obj.page_count
        },
        'permission': share.permission,
        'preview_url': file_obj.get_preview_url() if file_obj.can_preview else None,
        'download_url': file_obj.get_signed_url() if share.permission in ['editor', 'viewer'] else None,
        'thumbnail_urls': {
            size: file_obj.get_thumbnail_url(size) 
            for size in ['small', 'medium', 'large']
            if size in (file_obj.thumbnail_keys or {})
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def shared_with_me(request):
    """List files shared with the current user"""
    shares = Share.objects.filter(
        target_user=request.user,
        is_active=True
    ).select_related('file', 'folder', 'actor')
    
    shared_files = []
    for share in shares:
        item = share.get_item()
        if item:
            shared_files.append({
                'share_id': str(share.id),
                'item_type': 'file' if share.file else 'folder',
                'item': {
                    'id': str(item.id),
                    'name': item.name,
                    'size_bytes': getattr(item, 'size_bytes', None),
                    'mime_type': getattr(item, 'mime_type', None),
                    'created_at': item.created_at,
                    'modified_at': getattr(item, 'modified_at', item.updated_at)
                },
                'permission': share.permission,
                'shared_by': share.actor.email,
                'shared_at': share.created_at
            })
    
    return Response({'shared_files': shared_files})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def embed_code(request, file_id):
    """Generate embed code for a file"""
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    # Get or create public share
    share = Share.objects.filter(
        file=file_obj,
        share_type='public',
        is_active=True
    ).first()
    
    if not share:
        share = Share.objects.create(
            file=file_obj,
            actor=request.user,
            share_type='public',
            permission='viewer'
        )
    
    base_url = request.build_absolute_uri('/').rstrip('/')
    embed_url = f"{base_url}/embed/{share.token}"
    
    # Generate different embed codes
    embed_codes = {
        'iframe': f'<iframe src="{embed_url}" width="600" height="400" frameborder="0" allowfullscreen></iframe>',
        'responsive_iframe': f'''<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">
  <iframe src="{embed_url}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;" allowfullscreen></iframe>
</div>''',
        'link': f'<a href="{base_url}/share/{share.token}" target="_blank">{file_obj.name}</a>',
        'markdown': f'[{file_obj.name}]({base_url}/share/{share.token})'
    }
    
    return Response({
        'embed_url': embed_url,
        'share_url': f"{base_url}/share/{share.token}",
        'embed_codes': embed_codes
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_thumbnail(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    size = request.query_params.get('size', 'medium')
    
    if size not in ['small', 'medium', 'large']:
        return Response({'error': 'Invalid size parameter'}, status=status.HTTP_400_BAD_REQUEST)
    
    thumbnail_url = file_obj.get_thumbnail_url(size)
    if not thumbnail_url:
        return Response({'error': 'Thumbnail not available'}, status=status.HTTP_404_NOT_FOUND)
    
    return Response({
        'thumbnail_url': thumbnail_url,
        'size': size
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_preview(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    if not file_obj.can_preview:
        return Response({'error': 'Preview not available for this file type'}, status=status.HTTP_400_BAD_REQUEST)
    
    if file_obj.status != 'ready':
        return Response({'error': 'File not ready for preview'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
    
    preview_url = file_obj.get_preview_url()
    
    return Response({
        'preview_url': preview_url,
        'mime_type': file_obj.mime_type,
        'size': file_obj.size_bytes,
        'duration': file_obj.duration,
        'page_count': file_obj.page_count,
        'can_stream': file_obj.is_video or file_obj.is_audio
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def regenerate_thumbnail(request, file_id):
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    if not (file_obj.is_image or file_obj.is_video or file_obj.mime_type == 'application/pdf'):
        return Response({'error': 'Thumbnails not supported for this file type'}, status=status.HTTP_400_BAD_REQUEST)
    
    # In production, this would trigger thumbnail generation job
    # For now, we'll simulate success
    file_obj.status = 'processing'
    file_obj.save()
    
    # Simulate thumbnail generation (in production, this would be async)
    import time
    time.sleep(1)  # Simulate processing time
    
    file_obj.thumbnail_keys = {
        'small': f'thumb_small_{file_obj.id}.jpg',
        'medium': f'thumb_medium_{file_obj.id}.jpg', 
        'large': f'thumb_large_{file_obj.id}.jpg'
    }
    file_obj.status = 'ready'
    file_obj.save()
    
    return Response({'message': 'Thumbnail regeneration completed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_data(request):
    """Get comprehensive dashboard data"""
    user = request.user
    
    # Storage summary
    files = File.objects.filter(owner=user, status='ready')
    total_size = files.aggregate(total=models.Sum('size_bytes'))['total'] or 0
    quota = 10 * 1024 * 1024 * 1024  # 10GB
    
    # File type breakdown
    file_types = {
        'documents': files.filter(mime_type__in=['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']).aggregate(total=models.Sum('size_bytes'))['total'] or 0,
        'images': files.filter(mime_type__startswith='image/').aggregate(total=models.Sum('size_bytes'))['total'] or 0,
        'videos': files.filter(mime_type__startswith='video/').aggregate(total=models.Sum('size_bytes'))['total'] or 0,
        'audio': files.filter(mime_type__startswith='audio/').aggregate(total=models.Sum('size_bytes'))['total'] or 0,
        'other': 0
    }
    file_types['other'] = total_size - sum(file_types.values())
    
    # Recent files (last 7 days)
    from datetime import timedelta
    week_ago = timezone.now() - timedelta(days=7)
    recent_files = files.filter(created_at__gte=week_ago).order_by('-created_at')[:10]
    
    # Recent activity
    recent_activity = Activity.objects.filter(user=user).order_by('-timestamp')[:10]
    
    # Upload trends (last 30 days)
    month_ago = timezone.now() - timedelta(days=30)
    upload_trends = []
    for i in range(30):
        day = month_ago + timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0)
        day_end = day_start + timedelta(days=1)
        count = files.filter(created_at__gte=day_start, created_at__lt=day_end).count()
        upload_trends.append({
            'date': day_start.strftime('%Y-%m-%d'),
            'uploads': count
        })
    
    # Folder stats
    folders = Folder.objects.filter(owner=user)
    
    # Share stats
    shares = Share.objects.filter(actor=user, is_active=True)
    pending_shares = Invite.objects.filter(actor=user, is_accepted=False).count()
    
    # Integration stats
    try:
        from integrations.models import ApiToken, Webhook
        active_tokens = ApiToken.objects.filter(user=user, is_active=True).count()
        active_webhooks = Webhook.objects.filter(user=user, is_active=True).count()
    except ImportError:
        active_tokens = 0
        active_webhooks = 0
    
    return Response({
        'storage': {
            'used': total_size,
            'quota': quota,
            'percentage': (total_size / quota * 100) if quota > 0 else 0,
            'file_types': file_types
        },
        'stats': {
            'total_files': files.count(),
            'total_folders': folders.count(),
            'total_shares': shares.count(),
            'pending_shares': pending_shares,
            'active_tokens': active_tokens,
            'active_webhooks': active_webhooks
        },
        'recent_files': FileSerializer(recent_files, many=True, context={'request': request}).data,
        'recent_activity': ActivitySerializer(recent_activity, many=True).data,
        'upload_trends': upload_trends,
        'quick_stats': {
            'files_this_week': files.filter(created_at__gte=week_ago).count(),
            'downloads_this_week': files.filter(last_accessed__gte=week_ago).aggregate(total=models.Sum('download_count'))['total'] or 0,
            'shares_this_week': shares.filter(created_at__gte=week_ago).count()
        }
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_versions(request, file_id):
    """Get all versions of a file"""
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    versions = file_obj.versions.all()
    serializer = FileVersionSerializer(versions, many=True)
    return Response(serializer.data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def restore_file_version(request, file_id, version_id):
    """Restore file to a specific version"""
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    success = file_obj.restore_version(version_id, request.user)
    if success:
        return Response({
            'message': 'File restored successfully',
            'new_version': file_obj.version
        })
    else:
        return Response(
            {'error': 'Version not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def file_activity(request, file_id):
    """Get activity log for a specific file"""
    file_obj = get_object_or_404(File, id=file_id, owner=request.user)
    
    # Get activities for this specific file
    activities = Activity.objects.filter(
        object_type='file',
        object_id=file_obj.id
    ).order_by('-timestamp')[:50]
    
    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_activity(request):
    """Get activity log for the current user"""
    # Get query parameters
    object_type = request.query_params.get('type')  # file, folder, share, token, webhook
    limit = int(request.query_params.get('limit', 50))
    
    # Base queryset
    activities = Activity.objects.filter(user=request.user)
    
    # Apply type filter
    if object_type:
        activities = activities.filter(object_type=object_type)
    
    # Limit and order
    activities = activities.order_by('-timestamp')[:limit]
    
    serializer = ActivitySerializer(activities, many=True)
    return Response(serializer.data)