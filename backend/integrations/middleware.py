from django.http import JsonResponse
from django.contrib.auth import get_user_model
from .models import ApiToken, TokenUsage

User = get_user_model()

class ApiTokenAuthenticationMiddleware:
    """Middleware to authenticate API requests using tokens"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Only process API requests
        if request.path.startswith('/api/v1/'):
            auth_header = request.META.get('HTTP_AUTHORIZATION', '')
            
            if auth_header.startswith('Bearer '):
                token = auth_header.split(' ')[1]
                
                # Check if it's an API token (starts with 'fl_')
                if token.startswith('fl_'):
                    try:
                        token_hash = ApiToken.hash_token(token)
                        api_token = ApiToken.objects.select_related('user').get(
                            token_hash=token_hash,
                            is_active=True
                        )
                        
                        # Check if token is expired
                        if api_token.is_expired():
                            return JsonResponse(
                                {'error': 'Token expired'}, 
                                status=401
                            )
                        
                        # Set user and token in request
                        request.user = api_token.user
                        request.api_token = api_token
                        
                        # Log token usage
                        TokenUsage.objects.create(
                            token=api_token,
                            endpoint=request.path,
                            method=request.method,
                            ip_address=self.get_client_ip(request),
                            user_agent=request.META.get('HTTP_USER_AGENT', '')
                        )
                        
                        # Increment usage count
                        api_token.increment_usage()
                        
                    except ApiToken.DoesNotExist:
                        return JsonResponse(
                            {'error': 'Invalid token'}, 
                            status=401
                        )
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip

def check_api_scope(required_scope):
    """Decorator to check if API token has required scope"""
    def decorator(view_func):
        def wrapper(request, *args, **kwargs):
            # Check if request has API token
            if hasattr(request, 'api_token'):
                if not request.api_token.has_scope(required_scope):
                    return JsonResponse(
                        {'error': f'Insufficient scope. Required: {required_scope}'}, 
                        status=403
                    )
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator