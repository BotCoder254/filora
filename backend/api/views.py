from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from files.models import File, Folder
from files.serializers import FileSerializer, FolderSerializer
from integrations.middleware import check_api_scope

class ApiFileListView(generics.ListCreateAPIView):
    """Public API endpoint for files"""
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return File.objects.filter(owner=self.request.user)
    
    @check_api_scope('files.read')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class ApiFileDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Public API endpoint for individual files"""
    serializer_class = FileSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return File.objects.filter(owner=self.request.user)
    
    @check_api_scope('files.read')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

class ApiFolderListView(generics.ListCreateAPIView):
    """Public API endpoint for folders"""
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Folder.objects.filter(owner=self.request.user)
    
    @check_api_scope('files.read')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def post(self, request, *args, **kwargs):
        return super().post(request, *args, **kwargs)

class ApiFolderDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Public API endpoint for individual folders"""
    serializer_class = FolderSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Folder.objects.filter(owner=self.request.user)
    
    @check_api_scope('files.read')
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def put(self, request, *args, **kwargs):
        return super().put(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def patch(self, request, *args, **kwargs):
        return super().patch(request, *args, **kwargs)
    
    @check_api_scope('files.write')
    def delete(self, request, *args, **kwargs):
        return super().delete(request, *args, **kwargs)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@check_api_scope('files.read')
def api_user_info(request):
    """Get current user information"""
    return Response({
        'id': request.user.id,
        'email': request.user.email,
        'first_name': request.user.first_name,
        'last_name': request.user.last_name,
    })