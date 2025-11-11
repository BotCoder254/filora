from django.test import TestCase
from django.contrib.auth import get_user_model
from .models import ApiToken, Webhook, WebhookDelivery

User = get_user_model()

class IntegrationsTestCase(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            password='testpass123'
        )
    
    def test_api_token_creation(self):
        token = ApiToken.objects.create(
            user=self.user,
            name='Test Token',
            token_hash='test_hash',
            scopes=['files.read', 'files.write']
        )
        self.assertEqual(token.name, 'Test Token')
        self.assertEqual(len(token.scopes), 2)
        self.assertTrue(token.has_scope('files.read'))
        self.assertFalse(token.has_scope('webhooks.manage'))
    
    def test_webhook_creation(self):
        webhook = Webhook.objects.create(
            user=self.user,
            url='https://example.com/webhook',
            events=['upload.completed', 'file.deleted']
        )
        self.assertEqual(webhook.url, 'https://example.com/webhook')
        self.assertEqual(len(webhook.events), 2)
        self.assertTrue(webhook.secret)  # Should auto-generate secret
    
    def test_token_generation(self):
        token = ApiToken.generate_token()
        self.assertTrue(token.startswith('fl_'))
        self.assertTrue(len(token) > 30)
    
    def test_token_hashing(self):
        token = 'fl_test_token_123'
        hash1 = ApiToken.hash_token(token)
        hash2 = ApiToken.hash_token(token)
        self.assertEqual(hash1, hash2)  # Same token should produce same hash
        self.assertEqual(len(hash1), 64)  # SHA256 produces 64 char hex string