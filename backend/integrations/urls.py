from django.urls import path
from . import views

urlpatterns = [
    # API Tokens
    path('tokens/', views.ApiTokenListCreateView.as_view(), name='api-tokens'),
    path('tokens/<uuid:pk>/', views.ApiTokenDetailView.as_view(), name='api-token-detail'),
    
    # Webhooks
    path('webhooks/', views.WebhookListCreateView.as_view(), name='webhooks'),
    path('webhooks/<uuid:pk>/', views.WebhookDetailView.as_view(), name='webhook-detail'),
    path('webhooks/<uuid:webhook_id>/deliveries/', views.WebhookDeliveryListView.as_view(), name='webhook-deliveries'),
    path('webhooks/<uuid:webhook_id>/test/', views.test_webhook, name='test-webhook'),
    
    # Stats
    path('stats/', views.integration_stats, name='integration-stats'),
]