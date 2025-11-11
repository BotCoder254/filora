from rest_framework import serializers
from .models import ApiToken, Webhook, WebhookDelivery, TokenUsage

class ApiTokenSerializer(serializers.ModelSerializer):
    scopes = serializers.ListField(child=serializers.CharField())
    
    class Meta:
        model = ApiToken
        fields = ['id', 'name', 'scopes', 'usage_count', 'last_used_at', 'expires_at', 'created_at', 'is_active']
        read_only_fields = ['id', 'usage_count', 'last_used_at', 'created_at']

class ApiTokenCreateSerializer(serializers.ModelSerializer):
    scopes = serializers.ListField(child=serializers.CharField())
    
    class Meta:
        model = ApiToken
        fields = ['name', 'scopes', 'expires_at']
    
    def validate_scopes(self, value):
        valid_scopes = [choice[0] for choice in ApiToken.SCOPE_CHOICES]
        for scope in value:
            if scope not in valid_scopes:
                raise serializers.ValidationError(f"Invalid scope: {scope}")
        return value

class WebhookSerializer(serializers.ModelSerializer):
    events = serializers.ListField(child=serializers.CharField())
    
    class Meta:
        model = Webhook
        fields = ['id', 'url', 'events', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_events(self, value):
        valid_events = [choice[0] for choice in Webhook.EVENT_CHOICES]
        for event in value:
            if event not in valid_events:
                raise serializers.ValidationError(f"Invalid event: {event}")
        return value

class WebhookDeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookDelivery
        fields = ['id', 'event', 'status', 'http_code', 'attempt_count', 'created_at', 'delivered_at']
        read_only_fields = ['id', 'created_at', 'delivered_at']

class TokenUsageSerializer(serializers.ModelSerializer):
    class Meta:
        model = TokenUsage
        fields = ['endpoint', 'method', 'created_at']
        read_only_fields = ['endpoint', 'method', 'created_at']