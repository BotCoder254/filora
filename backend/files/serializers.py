from rest_framework import serializers
from django.db import models
from .models import File, Folder, Share, Invite, FileVersion, FileActivity, Activity
import uuid

class FolderSerializer(serializers.ModelSerializer):
    subfolders_count = serializers.SerializerMethodField()
    files_count = serializers.SerializerMethodField()
    total_size = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = ('id', 'name', 'parent', 'created_at', 'updated_at', 'subfolders_count', 'files_count', 'total_size')
        read_only_fields = ('id', 'created_at', 'updated_at')
    
    def get_subfolders_count(self, obj):
        return obj.subfolders.count()
    
    def get_files_count(self, obj):
        return obj.files.filter(status='ready').count()
    
    def get_total_size(self, obj):
        return obj.files.filter(status='ready').aggregate(total=models.Sum('size_bytes'))['total'] or 0

class FileVersionSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.name', read_only=True)
    
    class Meta:
        model = FileVersion
        fields = ('id', 'version_number', 'size_bytes', 'created_at', 'created_by_name')

class FileActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    
    class Meta:
        model = FileActivity
        fields = ('id', 'action', 'details', 'created_at', 'user_name', 'user_email')

class FileSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    thumbnail_urls = serializers.SerializerMethodField()
    preview_url = serializers.SerializerMethodField()
    owner_name = serializers.CharField(source='owner.name', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    versions_count = serializers.SerializerMethodField()
    share_links_count = serializers.SerializerMethodField()
    can_preview = serializers.ReadOnlyField()
    is_audio = serializers.ReadOnlyField()
    
    class Meta:
        model = File
        fields = (
            'id', 'name', 'description', 'file_url', 'thumbnail_urls', 'preview_url', 'folder', 'folder_name',
            'size_bytes', 'mime_type', 'status', 'version', 'is_public', 'download_count',
            'last_accessed', 'created_at', 'modified_at', 'file_extension', 'is_image', 
            'is_video', 'is_audio', 'is_document', 'can_preview', 'duration', 'page_count',
            'owner_name', 'versions_count', 'share_links_count', 'cloudinary_public_id', 
            'cloudinary_url', 'cloudinary_secure_url', 'checksum'
        )
        read_only_fields = (
            'id', 'size_bytes', 'mime_type', 'file_extension', 'is_image', 'is_video', 
            'is_audio', 'is_document', 'can_preview', 'created_at', 'modified_at', 'owner_name', 'folder_name',
            'versions_count', 'share_links_count'
        )
    
    def get_file_url(self, obj):
        if obj.status == 'ready':
            return obj.file_url  # Uses the new property that handles Cloudinary URLs
        return None
    
    def get_thumbnail_urls(self, obj):
        if obj.thumbnail_keys:
            return {
                size: obj.get_thumbnail_url(size) 
                for size in ['small', 'medium', 'large']
                if size in obj.thumbnail_keys
            }
        return {}
    
    def get_preview_url(self, obj):
        if obj.can_preview:
            return obj.get_preview_url()
        return None
    
    def get_versions_count(self, obj):
        return obj.versions.count()
    
    def get_share_links_count(self, obj):
        return obj.shares.filter(is_active=True).count()

class FileDetailSerializer(FileSerializer):
    versions = FileVersionSerializer(many=True, read_only=True)
    recent_activity = serializers.SerializerMethodField()
    
    class Meta(FileSerializer.Meta):
        fields = FileSerializer.Meta.fields + ('versions', 'recent_activity')
    
    def get_recent_activity(self, obj):
        activities = obj.activities.all()[:10]
        return FileActivitySerializer(activities, many=True).data

class FileUploadSerializer(serializers.ModelSerializer):
    file = serializers.FileField()
    
    class Meta:
        model = File
        fields = ('file', 'folder', 'description')
    
    def create(self, validated_data):
        file_obj = validated_data['file']
        validated_data['name'] = file_obj.name
        validated_data['size_bytes'] = file_obj.size
        validated_data['mime_type'] = file_obj.content_type or 'application/octet-stream'
        validated_data['owner'] = self.context['request'].user
        validated_data['storage_key'] = f'files/{self.context["request"].user.id}/{uuid.uuid4()}/{file_obj.name}'
        return super().create(validated_data)

class FileRenameSerializer(serializers.Serializer):
    new_name = serializers.CharField(max_length=255)
    
    def validate_new_name(self, value):
        if not value.strip():
            raise serializers.ValidationError('Filename cannot be empty')
        return value.strip()

class ShareSerializer(serializers.ModelSerializer):
    share_url = serializers.SerializerMethodField()
    item_name = serializers.SerializerMethodField()
    target_user_email = serializers.CharField(source='target_user.email', read_only=True)
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    
    class Meta:
        model = Share
        fields = (
            'id', 'share_type', 'permission', 'expires_at', 'is_active', 'created_at', 'updated_at',
            'share_url', 'item_name', 'target_user_email', 'actor_email', 'token'
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'share_url', 'item_name', 'token')
    
    def get_share_url(self, obj):
        request = self.context.get('request')
        if request and obj.share_type == 'public':
            return request.build_absolute_uri(f'/share/{obj.token}')
        return None
    
    def get_item_name(self, obj):
        item = obj.get_item()
        return item.name if item else None

class InviteSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    actor_email = serializers.CharField(source='actor.email', read_only=True)
    
    class Meta:
        model = Invite
        fields = (
            'id', 'target_email', 'permission', 'expires_at', 'is_accepted', 'created_at',
            'item_name', 'actor_email', 'token'
        )
        read_only_fields = ('id', 'created_at', 'item_name', 'token')
    
    def get_item_name(self, obj):
        item = obj.get_item()
        return item.name if item else None

class ActivitySerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source='user.first_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    object_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Activity
        fields = ('id', 'object_type', 'object_id', 'action', 'metadata', 'timestamp', 'user_name', 'user_email', 'object_name')
    
    def get_object_name(self, obj):
        return obj.metadata.get('file_name') or obj.metadata.get('folder_name') or str(obj.object_id)

# Keep ShareLinkSerializer for backward compatibility
class ShareLinkSerializer(ShareSerializer):
    class Meta(ShareSerializer.Meta):
        model = Share