# Filora Integrations & Developer API

## Overview

Filora provides a comprehensive developer API with scoped tokens and webhook integrations for building applications on top of the file management platform.

## Features

### API Tokens
- **Scoped Access**: Create tokens with specific permissions (files.read, files.write, webhooks.manage)
- **Secure Storage**: Tokens are hashed and stored securely, shown only once during creation
- **Usage Analytics**: Track API usage with detailed logs and statistics
- **Expiration Control**: Set custom expiration dates or create permanent tokens

### Webhooks
- **Real-time Events**: Receive notifications for file operations and sharing events
- **Event Types**: 
  - `upload.completed` - File upload finished
  - `file.deleted` - File was deleted
  - `share.created` - New share was created
  - `file.updated` - File was modified
  - `folder.created` - New folder was created
- **Secure Delivery**: HMAC-SHA256 signatures for webhook verification
- **Retry Logic**: Automatic retry for failed deliveries
- **Test Functionality**: Send test webhooks to verify endpoints

## API Endpoints

### Base URL
```
http://localhost:8000/api/v1
```

### Authentication
All API requests require a Bearer token in the Authorization header:
```
Authorization: Bearer fl_your_token_here
```

### Available Endpoints

#### Files
- `GET /v1/files/` - List user's files (requires: files.read)
- `POST /v1/files/` - Create new file (requires: files.write)
- `GET /v1/files/{id}/` - Get file details (requires: files.read)
- `PUT /v1/files/{id}/` - Update file (requires: files.write)
- `DELETE /v1/files/{id}/` - Delete file (requires: files.write)

#### Folders
- `GET /v1/folders/` - List user's folders (requires: files.read)
- `POST /v1/folders/` - Create new folder (requires: files.write)
- `GET /v1/folders/{id}/` - Get folder details (requires: files.read)
- `PUT /v1/folders/{id}/` - Update folder (requires: files.write)
- `DELETE /v1/folders/{id}/` - Delete folder (requires: files.write)

#### User Info
- `GET /v1/user/` - Get current user information (requires: files.read)

## Integration Management

### Token Management
- `GET /api/integrations/tokens/` - List API tokens
- `POST /api/integrations/tokens/` - Create new token
- `DELETE /api/integrations/tokens/{id}/` - Revoke token

### Webhook Management
- `GET /api/integrations/webhooks/` - List webhooks
- `POST /api/integrations/webhooks/` - Create webhook
- `DELETE /api/integrations/webhooks/{id}/` - Delete webhook
- `POST /api/integrations/webhooks/{id}/test/` - Test webhook

### Statistics
- `GET /api/integrations/stats/` - Get usage statistics

## Example Usage

### Creating an API Token
```javascript
const response = await fetch('/api/integrations/tokens/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token'
  },
  body: JSON.stringify({
    name: 'My App Token',
    scopes: ['files.read', 'files.write'],
    expires_at: '2024-12-31T23:59:59Z' // Optional
  })
});

const { secret } = await response.json();
// Store the secret securely - it won't be shown again!
```

### Using the API
```javascript
const response = await fetch('/api/v1/files/', {
  headers: {
    'Authorization': `Bearer ${apiToken}`
  }
});

const files = await response.json();
```

### Creating a Webhook
```javascript
const response = await fetch('/api/integrations/webhooks/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer your_jwt_token'
  },
  body: JSON.stringify({
    url: 'https://your-app.com/webhooks/filora',
    events: ['upload.completed', 'file.deleted']
  })
});
```

### Webhook Payload Example
```json
{
  "event": "upload.completed",
  "timestamp": "2024-01-20T10:30:00Z",
  "data": {
    "file_id": "123e4567-e89b-12d3-a456-426614174000",
    "file_name": "document.pdf",
    "file_size": 1024000,
    "mime_type": "application/pdf",
    "folder_id": "456e7890-e89b-12d3-a456-426614174001"
  }
}
```

### Webhook Signature Verification
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return signature === `sha256=${expectedSignature}`;
}

// In your webhook handler
const signature = req.headers['x-filora-signature'];
const isValid = verifyWebhookSignature(req.body, signature, webhookSecret);
```

## Security Best Practices

1. **Token Storage**: Store API tokens securely and never expose them in client-side code
2. **Scope Limitation**: Use the minimum required scopes for your application
3. **Token Rotation**: Regularly rotate API tokens for enhanced security
4. **Webhook Verification**: Always verify webhook signatures to ensure authenticity
5. **HTTPS Only**: Use HTTPS for all webhook endpoints in production

## Rate Limits

- API requests: 1000 requests per hour per token
- Webhook deliveries: 100 deliveries per minute per webhook

## Error Handling

The API uses standard HTTP status codes:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized (invalid or missing token)
- `403` - Forbidden (insufficient scope)
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

## Support

For API support and questions, please refer to the documentation or contact the development team.