from django.contrib import admin
from .models import File, Folder, Share, Invite, FileVersion, FileActivity, Activity

@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'parent', 'created_at')
    list_filter = ('created_at', 'owner')
    search_fields = ('name', 'owner__email')
    raw_id_fields = ('owner', 'parent')

@admin.register(File)
class FileAdmin(admin.ModelAdmin):
    list_display = ('name', 'owner', 'folder', 'size_bytes', 'status', 'mime_type', 'created_at')
    list_filter = ('mime_type', 'status', 'created_at', 'owner')
    search_fields = ('name', 'owner__email')
    raw_id_fields = ('owner', 'folder')
    readonly_fields = ('storage_key', 'checksum', 'download_count', 'last_accessed')

@admin.register(Share)
class ShareAdmin(admin.ModelAdmin):
    list_display = ('get_item_name', 'actor', 'target_user', 'share_type', 'permission', 'is_active', 'expires_at', 'created_at')
    list_filter = ('share_type', 'permission', 'is_active', 'created_at')
    search_fields = ('actor__email', 'target_user__email')
    raw_id_fields = ('actor', 'target_user', 'file', 'folder')
    
    def get_item_name(self, obj):
        item = obj.get_item()
        return item.name if item else 'No item'
    get_item_name.short_description = 'Item'

@admin.register(Invite)
class InviteAdmin(admin.ModelAdmin):
    list_display = ('get_item_name', 'actor', 'target_email', 'permission', 'is_accepted', 'created_at')
    list_filter = ('permission', 'is_accepted', 'created_at')
    search_fields = ('actor__email', 'target_email')
    raw_id_fields = ('actor', 'file', 'folder')
    
    def get_item_name(self, obj):
        item = obj.get_item()
        return item.name if item else 'No item'
    get_item_name.short_description = 'Item'

@admin.register(FileVersion)
class FileVersionAdmin(admin.ModelAdmin):
    list_display = ('file', 'version_number', 'size_bytes', 'created_at', 'created_by')
    list_filter = ('created_at', 'created_by')
    search_fields = ('file__name', 'created_by__email')
    raw_id_fields = ('file', 'created_by')

@admin.register(Activity)
class ActivityAdmin(admin.ModelAdmin):
    list_display = ('user', 'object_type', 'action', 'timestamp')
    list_filter = ('object_type', 'action', 'timestamp')
    search_fields = ('user__email', 'metadata')
    raw_id_fields = ('user',)
    readonly_fields = ('timestamp', 'ip_address', 'user_agent')

@admin.register(FileActivity)
class FileActivityAdmin(admin.ModelAdmin):
    list_display = ('file', 'user', 'action', 'created_at')
    list_filter = ('action', 'created_at', 'user')
    search_fields = ('file__name', 'user__email')
    raw_id_fields = ('file', 'user')
    readonly_fields = ('ip_address', 'user_agent', 'details')