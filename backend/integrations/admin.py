from django.contrib import admin
from .models import ApiToken, Webhook, WebhookDelivery, TokenUsage

@admin.register(ApiToken)
class ApiTokenAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'usage_count', 'last_used_at', 'expires_at', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at', 'expires_at')
    search_fields = ('name', 'user__email')
    raw_id_fields = ('user',)
    readonly_fields = ('token_hash', 'usage_count', 'last_used_at', 'created_at')

@admin.register(Webhook)
class WebhookAdmin(admin.ModelAdmin):
    list_display = ('url', 'user', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('url', 'user__email')
    raw_id_fields = ('user',)
    readonly_fields = ('secret', 'created_at', 'updated_at')

@admin.register(WebhookDelivery)
class WebhookDeliveryAdmin(admin.ModelAdmin):
    list_display = ('webhook', 'event', 'status', 'http_code', 'attempt_count', 'created_at')
    list_filter = ('status', 'event', 'created_at')
    search_fields = ('webhook__url', 'event')
    raw_id_fields = ('webhook',)
    readonly_fields = ('created_at', 'delivered_at')

@admin.register(TokenUsage)
class TokenUsageAdmin(admin.ModelAdmin):
    list_display = ('token', 'endpoint', 'method', 'ip_address', 'created_at')
    list_filter = ('method', 'created_at')
    search_fields = ('token__name', 'endpoint', 'ip_address')
    raw_id_fields = ('token',)
    readonly_fields = ('created_at',)