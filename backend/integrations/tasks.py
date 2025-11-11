import requests
import json
import hmac
import hashlib
from django.utils import timezone
from datetime import timedelta
from .models import Webhook, WebhookDelivery

def send_webhook(webhook_id, event, payload):
    """Send webhook delivery (in production, this would be a Celery task)"""
    try:
        webhook = Webhook.objects.get(id=webhook_id, is_active=True)
        
        # Create delivery record
        delivery = WebhookDelivery.objects.create(
            webhook=webhook,
            event=event,
            payload=payload,
            status='pending'
        )
        
        # Prepare headers
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Filora-Webhook/1.0'
        }
        
        # Add signature if webhook has secret
        if webhook.secret:
            signature = hmac.new(
                webhook.secret.encode(),
                json.dumps(payload).encode(),
                hashlib.sha256
            ).hexdigest()
            headers['X-Filora-Signature'] = f'sha256={signature}'
        
        try:
            # Send webhook
            response = requests.post(
                webhook.url,
                json=payload,
                headers=headers,
                timeout=30
            )
            
            # Update delivery status
            delivery.status = 'success' if response.status_code < 400 else 'failed'
            delivery.http_code = response.status_code
            delivery.response_body = response.text[:1000]  # Limit response body size
            delivery.delivered_at = timezone.now()
            delivery.attempt_count = 1
            
        except requests.RequestException as e:
            # Handle request errors
            delivery.status = 'failed'
            delivery.response_body = str(e)[:1000]
            delivery.attempt_count = 1
            
            # Schedule retry
            delivery.next_retry_at = timezone.now() + timedelta(minutes=5)
        
        delivery.save()
        return delivery
        
    except Webhook.DoesNotExist:
        pass

def trigger_webhook_event(user, event, data):
    """Trigger webhook event for all user's webhooks subscribed to this event"""
    webhooks = Webhook.objects.filter(
        user=user,
        is_active=True,
        events__contains=[event]
    )
    
    payload = {
        'event': event,
        'timestamp': timezone.now().isoformat(),
        'data': data
    }
    
    for webhook in webhooks:
        send_webhook(webhook.id, event, payload)