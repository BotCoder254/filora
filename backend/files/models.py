import os
import uuid
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.hashers import make_password, check_password
from django.core.mail import send_mail
from django.conf import settings

User = get_user_model()

def upload_to(instance, filename):
    return f'files/{instance.owner.id}/{uuid.uuid4()}/{filename}'

class Folder(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='folders')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='subfolders')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['name', 'owner', 'parent']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Trigger webhook event for new folders
        if is_new:
            try:
                from integrations.tasks import trigger_webhook_event
                trigger_webhook_event(
                    self.owner,
                    'folder.created',
                    {
                        'folder_id': str(self.id),
                        'folder_name': self.name,
                        'parent_id': str(self.parent.id) if self.parent else None
                    }
                )
            except ImportError:
                pass

class File(models.Model):
    STATUS_CHOICES = [
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('error', 'Error'),
        ('unavailable', 'Unavailable'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to=upload_to, blank=True, null=True)  # Keep for backward compatibility
    storage_key = models.CharField(max_length=500, unique=True, default='temp/default')
    
    # Cloudinary fields
    cloudinary_public_id = models.CharField(max_length=500, blank=True, null=True)
    cloudinary_url = models.URLField(blank=True, null=True)
    cloudinary_secure_url = models.URLField(blank=True, null=True)
    
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='files')
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='files')
    size_bytes = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ready')
    version = models.IntegerField(default=1)
    is_public = models.BooleanField(default=False)
    thumbnail_keys = models.JSONField(default=dict, blank=True)  # {small: key, medium: key, large: key}
    duration = models.FloatField(null=True, blank=True)  # For audio/video files
    page_count = models.IntegerField(null=True, blank=True)  # For PDF files
    checksum = models.CharField(max_length=64, blank=True, default='')
    download_count = models.IntegerField(default=0)
    last_accessed = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-modified_at']
    
    def __str__(self):
        return self.name
    
    @property
    def file_extension(self):
        return os.path.splitext(self.name)[1].lower()
    
    @property
    def file_url(self):
        """Get the file URL - either Cloudinary or local"""
        if self.cloudinary_secure_url:
            return self.cloudinary_secure_url
        elif self.cloudinary_url:
            return self.cloudinary_url
        elif self.file:
            return self.file.url
        return None
    
    @property
    def download_url(self):
        """Get the download URL"""
        return self.file_url
    
    @property
    def is_image(self):
        return self.mime_type.startswith('image/')
    
    @property
    def is_video(self):
        return self.mime_type.startswith('video/')
    
    @property
    def is_audio(self):
        return self.mime_type.startswith('audio/')
    
    @property
    def is_document(self):
        return self.mime_type in ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    
    @property
    def can_preview(self):
        return self.is_image or self.is_video or self.is_audio or self.mime_type == 'application/pdf'
    
    def get_thumbnail_url(self, size='medium'):
        """Get thumbnail URL for specified size"""
        if not self.thumbnail_keys or size not in self.thumbnail_keys:
            return None
        # In production, this would generate S3 signed URLs for thumbnails
        return f'/media/thumbnails/{self.thumbnail_keys[size]}'
    
    def get_preview_url(self):
        """Get preview URL for streaming/viewing"""
        if not self.can_preview:
            return None
        # In production, this would generate streaming-friendly signed URLs
        return f'/media/{self.file.name}'
    
    def get_signed_url(self, expires_in=3600):
        """Generate signed URL for secure file access"""
        # In production, this would generate S3 signed URLs
        return f'/media/{self.file.name}'
    
    def increment_download_count(self):
        self.download_count += 1
        self.last_accessed = timezone.now()
        self.save(update_fields=['download_count', 'last_accessed'])
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        old_version = None
        
        # Store old version if file is being updated
        if not is_new and self.status == 'ready':
            try:
                old_file = File.objects.get(pk=self.pk)
                if old_file.file != self.file:  # File content changed
                    # Create version before updating
                    FileVersion.objects.create(
                        file=self,
                        version_number=self.version,
                        storage_key=old_file.storage_key,
                        size_bytes=old_file.size_bytes,
                        checksum=old_file.checksum,
                        created_by=getattr(self, '_updated_by', self.owner)
                    )
                    self.version += 1
                    old_version = True
            except File.DoesNotExist:
                pass
        
        super().save(*args, **kwargs)
        
        # Create activity log
        self._log_activity(is_new, old_version)
        
        # Trigger webhook events
        if is_new and self.status == 'ready':
            try:
                from integrations.tasks import trigger_webhook_event
                trigger_webhook_event(
                    self.owner,
                    'upload.completed',
                    {
                        'file_id': str(self.id),
                        'file_name': self.name,
                        'file_size': self.size_bytes,
                        'mime_type': self.mime_type,
                        'folder_id': str(self.folder.id) if self.folder else None
                    }
                )
            except ImportError:
                pass
    
    def _log_activity(self, is_new, old_version):
        """Log file activity"""
        try:
            user = getattr(self, '_updated_by', self.owner)
            
            if is_new:
                action = 'created'
                metadata = {
                    'file_name': self.name,
                    'file_size': self.size_bytes,
                    'mime_type': self.mime_type
                }
            elif old_version:
                action = 'version_created'
                metadata = {
                    'file_name': self.name,
                    'version': self.version,
                    'file_size': self.size_bytes
                }
            else:
                action = 'updated'
                metadata = {
                    'file_name': self.name,
                    'file_size': self.size_bytes
                }
            
            Activity.objects.create(
                user=user,
                object_type='file',
                object_id=self.id,
                action=action,
                metadata=metadata
            )
        except Exception:
            pass  # Don't fail file save if activity logging fails
    
    def delete(self, *args, **kwargs):
        # Log activity before deletion
        try:
            user = getattr(self, '_deleted_by', self.owner)
            Activity.objects.create(
                user=user,
                object_type='file',
                object_id=self.id,
                action='deleted',
                metadata={
                    'file_name': self.name,
                    'file_size': self.size_bytes,
                    'mime_type': self.mime_type
                }
            )
        except Exception:
            pass
        
        # Trigger webhook event before deletion
        try:
            from integrations.tasks import trigger_webhook_event
            trigger_webhook_event(
                self.owner,
                'file.deleted',
                {
                    'file_id': str(self.id),
                    'file_name': self.name,
                    'file_size': self.size_bytes,
                    'mime_type': self.mime_type
                }
            )
        except ImportError:
            pass
        
        super().delete(*args, **kwargs)
    
    def restore_version(self, version_id, user):
        """Restore file to a specific version"""
        try:
            version = self.versions.get(id=version_id)
            
            # Create new version from current state
            FileVersion.objects.create(
                file=self,
                version_number=self.version,
                storage_key=self.storage_key,
                size_bytes=self.size_bytes,
                checksum=self.checksum,
                created_by=user
            )
            
            # Restore from version
            self.storage_key = version.storage_key
            self.size_bytes = version.size_bytes
            self.checksum = version.checksum
            self.version += 1
            self._updated_by = user
            
            self.save()
            
            # Log restore activity
            Activity.objects.create(
                user=user,
                object_type='file',
                object_id=self.id,
                action='restored',
                metadata={
                    'file_name': self.name,
                    'restored_from_version': version.version_number,
                    'new_version': self.version
                }
            )
            
            return True
        except FileVersion.DoesNotExist:
            return False

class FileVersion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    storage_key = models.CharField(max_length=500)
    size_bytes = models.BigIntegerField()
    checksum = models.CharField(max_length=64, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    
    class Meta:
        unique_together = ['file', 'version_number']
        ordering = ['-version_number']
        indexes = [
            models.Index(fields=['file', '-version_number']),
        ]
    
    def __str__(self):
        return f"{self.file.name} v{self.version_number}"
    
    @property
    def size_formatted(self):
        """Return human-readable file size"""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.size_bytes < 1024.0:
                return f"{self.size_bytes:.1f} {unit}"
            self.size_bytes /= 1024.0
        return f"{self.size_bytes:.1f} TB"

class Activity(models.Model):
    OBJECT_TYPE_CHOICES = [
        ('file', 'File'),
        ('folder', 'Folder'),
        ('share', 'Share'),
        ('token', 'API Token'),
        ('webhook', 'Webhook'),
    ]
    
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('downloaded', 'Downloaded'),
        ('shared', 'Shared'),
        ('renamed', 'Renamed'),
        ('moved', 'Moved'),
        ('deleted', 'Deleted'),
        ('restored', 'Restored'),
        ('version_created', 'Version Created'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activities')
    object_type = models.CharField(max_length=20, choices=OBJECT_TYPE_CHOICES)
    object_id = models.UUIDField()
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['object_type', 'object_id', '-timestamp']),
        ]
    
    def __str__(self):
        return f"{self.user.email} {self.action} {self.object_type} {self.object_id}"

class FileActivity(models.Model):
    ACTION_CHOICES = [
        ('created', 'Created'),
        ('updated', 'Updated'),
        ('downloaded', 'Downloaded'),
        ('shared', 'Shared'),
        ('renamed', 'Renamed'),
        ('moved', 'Moved'),
        ('deleted', 'Deleted'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(File, on_delete=models.CASCADE, related_name='activities')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    action = models.CharField(max_length=20, choices=ACTION_CHOICES)
    details = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} {self.action} {self.file.name}"

class UploadSession(models.Model):
    STATUS_CHOICES = [
        ('initialized', 'Initialized'),
        ('uploading', 'Uploading'),
        ('processing', 'Processing'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('cancelled', 'Cancelled'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='upload_sessions')
    filename = models.CharField(max_length=255)
    expected_size = models.BigIntegerField()
    mime_type = models.CharField(max_length=100)
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='initialized')
    uploaded_chunks = models.JSONField(default=list, blank=True)
    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.filename} - {self.status}"

class Share(models.Model):
    SHARE_TYPE_CHOICES = [
        ('public', 'Public Link'),
        ('user', 'User Collaboration'),
    ]
    
    PERMISSION_CHOICES = [
        ('viewer', 'Viewer'),
        ('editor', 'Editor'),
        ('owner', 'Owner'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True, related_name='shares')
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='shares')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_shares')  # Who created the share
    target_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='received_shares')  # For user shares
    share_type = models.CharField(max_length=10, choices=SHARE_TYPE_CHOICES)
    token = models.CharField(max_length=64, unique=True, default='')  # For public links
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='viewer')
    expires_at = models.DateTimeField(null=True, blank=True)
    password = models.CharField(max_length=128, blank=True)  # For password-protected public links
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = [['file', 'target_user'], ['folder', 'target_user']]
    
    def save(self, *args, **kwargs):
        if self.share_type == 'public' and not self.token:
            self.token = uuid.uuid4().hex
        
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Trigger webhook event for new shares
        if is_new:
            try:
                from integrations.tasks import trigger_webhook_event
                trigger_webhook_event(
                    self.actor,
                    'share.created',
                    {
                        'share_id': str(self.id),
                        'share_type': self.share_type,
                        'permission': self.permission,
                        'item_type': 'file' if self.file else 'folder',
                        'item_id': str(self.file.id if self.file else self.folder.id),
                        'item_name': self.get_item().name
                    }
                )
            except ImportError:
                pass
    
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def get_item(self):
        return self.file or self.folder
    
    def __str__(self):
        item = self.get_item()
        if self.share_type == 'public':
            return f"Public link for {item.name}"
        return f"Share {item.name} with {self.target_user.email}"

class Invite(models.Model):
    PERMISSION_CHOICES = Share.PERMISSION_CHOICES
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    file = models.ForeignKey(File, on_delete=models.CASCADE, null=True, blank=True, related_name='invites')
    folder = models.ForeignKey(Folder, on_delete=models.CASCADE, null=True, blank=True, related_name='invites')
    actor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_invites')
    target_email = models.EmailField()
    permission = models.CharField(max_length=10, choices=PERMISSION_CHOICES, default='viewer')
    token = models.CharField(max_length=64, unique=True, default=uuid.uuid4)
    is_accepted = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def get_item(self):
        return self.file or self.folder
    
    def __str__(self):
        item = self.get_item()
        return f"Invite {self.target_email} to {item.name}"

# Keep ShareLink for backward compatibility
class ShareLink(Share):
    class Meta:
        proxy = True

# Version retention settings
MAX_VERSIONS_PER_FILE = 10  # Configurable limit