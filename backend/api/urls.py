from django.urls import path
from . import views

# Public API v1 endpoints
urlpatterns = [
    path('v1/user/', views.api_user_info, name='api-user-info'),
    path('v1/files/', views.ApiFileListView.as_view(), name='api-files'),
    path('v1/files/<uuid:pk>/', views.ApiFileDetailView.as_view(), name='api-file-detail'),
    path('v1/folders/', views.ApiFolderListView.as_view(), name='api-folders'),
    path('v1/folders/<uuid:pk>/', views.ApiFolderDetailView.as_view(), name='api-folder-detail'),
]