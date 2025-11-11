import uuid
import hashlib
import secrets
from django.db import models
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class ApiToken(models.Model):
    SCOPE_CHOICES = [
        ('files.read', 'Read Files'),
        ('files.write', 'Write Files'),
        ('webhooks.manage', 'Manage Webhooks'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='api_tokens')
    name = models.CharField(max_length=255)
    token_hash = models.CharField(max_length=64, unique=True)
    scopes = models.JSONField(default=list)
    usage_count = models.IntegerField(default=0)
    last_used_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.name} - {self.user.email}"
    
    @classmethod
    def generate_token(cls):
        """Generate a new API token"""
        return f"fl_{secrets.token_urlsafe(32)}"
    
    @classmethod
    def hash_token(cls, token):
        """Hash a token for storage"""
        return hashlib.sha256(token.encode()).hexdigest()
    
    def is_expired(self):
        if self.expires_at:
            return timezone.now() > self.expires_at
        return False
    
    def has_scope(self, scope):
        return scope in self.scopes
    
    def increment_usage(self):
        self.usage_count += 1
        self.last_used_at = timezone.now()
        self.save(update_fields=['usage_count', 'last_used_at'])

class Webhook(models.Model):
    EVENT_CHOICES = [
        ('upload.completed', 'Upload Completed'),
        ('file.deleted', 'File Deleted'),
        ('share.created', 'Share Created'),
        ('file.updated', 'File Updated'),
        ('folder.created', 'Folder Created'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='webhooks')
    url = models.URLField()
    events = models.JSONField(default=list)
    secret = models.CharField(max_length=64, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.url} - {self.user.email}"
    
    def save(self, *args, **kwargs):
        if not self.secret:
            self.secret = secrets.token_urlsafe(32)
        super().save(*args, **kwargs)

class WebhookDelivery(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('success', 'Success'),
        ('failed', 'Failed'),
        ('retrying', 'Retrying'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    webhook = models.ForeignKey(Webhook, on_delete=models.CASCADE, related_name='deliveries')
    event = models.CharField(max_length=50)
    payload = models.JSONField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    http_code = models.IntegerField(null=True, blank=True)
    response_body = models.TextField(blank=True)
    attempt_count = models.IntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.webhook.url} - {self.event} - {self.status}"

class TokenUsage(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    token = models.ForeignKey(ApiToken, on_delete=models.CASCADE, related_name='usage_logs')
    endpoint = models.CharField(max_length=255)
    method = models.CharField(max_length=10)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['-created_at']