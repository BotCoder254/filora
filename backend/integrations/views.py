from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta
from .models import ApiToken, Webhook, WebhookDelivery, TokenUsage
from .serializers import (
    ApiTokenSerializer, ApiTokenCreateSerializer, 
    WebhookSerializer, WebhookDeliverySerializer, TokenUsageSerializer
)
from .tasks import send_webhook

class ApiTokenListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return ApiToken.objects.filter(user=self.request.user, is_active=True)
    
    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ApiTokenCreateSerializer
        return ApiTokenSerializer
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Generate token
        token = ApiToken.generate_token()
        token_hash = ApiToken.hash_token(token)
        
        # Save token
        api_token = serializer.save(user=request.user, token_hash=token_hash)
        
        # Return token in response (only time it's shown)
        return Response({
            'id': str(api_token.id),
            'secret': token,
            'name': api_token.name,
            'scopes': api_token.scopes,
            'expires_at': api_token.expires_at,
            'created_at': api_token.created_at
        }, status=status.HTTP_201_CREATED)

class ApiTokenDetailView(generics.RetrieveDestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ApiTokenSerializer
    
    def get_queryset(self):
        return ApiToken.objects.filter(user=self.request.user, is_active=True)
    
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class WebhookListCreateView(generics.ListCreateAPIView):
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Webhook.objects.filter(user=self.request.user, is_active=True)
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

class WebhookDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = WebhookSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Webhook.objects.filter(user=self.request.user, is_active=True)
    
    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save()

class WebhookDeliveryListView(generics.ListAPIView):
    serializer_class = WebhookDeliverySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        webhook_id = self.kwargs.get('webhook_id')
        return WebhookDelivery.objects.filter(
            webhook__id=webhook_id,
            webhook__user=self.request.user
        )

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def integration_stats(request):
    """Get integration statistics for the dashboard"""
    user = request.user
    
    # Token usage in last 7 days
    seven_days_ago = timezone.now() - timedelta(days=7)
    token_usage = TokenUsage.objects.filter(
        token__user=user,
        created_at__gte=seven_days_ago
    ).values('token__name').annotate(
        count=Count('id')
    ).order_by('-count')[:5]
    
    # Recent webhook deliveries
    recent_deliveries = WebhookDelivery.objects.filter(
        webhook__user=user
    ).select_related('webhook').order_by('-created_at')[:10]
    
    # Active tokens and webhooks count
    active_tokens = ApiToken.objects.filter(user=user, is_active=True).count()
    active_webhooks = Webhook.objects.filter(user=user, is_active=True).count()
    
    # Webhook delivery success rate
    total_deliveries = WebhookDelivery.objects.filter(webhook__user=user).count()
    successful_deliveries = WebhookDelivery.objects.filter(
        webhook__user=user, 
        status='success'
    ).count()
    
    success_rate = (successful_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
    
    return Response({
        'token_usage': list(token_usage),
        'recent_deliveries': WebhookDeliverySerializer(recent_deliveries, many=True).data,
        'active_tokens': active_tokens,
        'active_webhooks': active_webhooks,
        'webhook_success_rate': round(success_rate, 1)
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def test_webhook(request, webhook_id):
    """Send a test webhook delivery"""
    try:
        webhook = Webhook.objects.get(id=webhook_id, user=request.user, is_active=True)
        
        # Create test payload
        test_payload = {
            'event': 'webhook.test',
            'timestamp': timezone.now().isoformat(),
            'data': {
                'message': 'This is a test webhook delivery from Filora',
                'webhook_id': str(webhook.id)
            }
        }
        
        # Send webhook directly (in production, this would be async with Celery)
        delivery = send_webhook(webhook.id, 'webhook.test', test_payload)
        
        if delivery and delivery.status == 'success':
            return Response({'message': 'Test webhook sent successfully'})
        else:
            return Response(
                {'message': 'Test webhook sent but delivery failed'}, 
                status=status.HTTP_202_ACCEPTED
            )
    
    except Webhook.DoesNotExist:
        return Response(
            {'error': 'Webhook not found'}, 
            status=status.HTTP_404_NOT_FOUND
        )