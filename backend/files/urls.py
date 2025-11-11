from django.urls import path
from . import views, upload_views, download_views

urlpatterns = [
    path('folders/', views.folders, name='folders'),
    path('folders/<uuid:folder_id>/', views.folder_detail, name='folder_detail'),
    path('folders/<uuid:folder_id>/contents/', views.folder_contents, name='folder_contents'),
    path('folders/<uuid:folder_id>/delete-force/', views.delete_folder_force, name='delete_folder_force'),
    path('files/', views.files, name='files'),
    path('files/<uuid:file_id>/', views.file_detail, name='file_detail'),
    path('files/<uuid:file_id>/rename/', views.rename_file, name='rename_file'),
    path('files/<uuid:file_id>/download/', download_views.download_file, name='file_download'),
    path('files/<uuid:file_id>/stream/', download_views.stream_file, name='file_stream'),
    path('files/<uuid:file_id>/move/', views.move_file, name='move_file'),
    path('files/<uuid:file_id>/thumbnail/', views.file_thumbnail, name='file_thumbnail'),
    path('files/<uuid:file_id>/preview/', views.file_preview, name='file_preview'),
    path('files/<uuid:file_id>/regenerate-thumbnail/', views.regenerate_thumbnail, name='regenerate_thumbnail'),
    path('files/<uuid:file_id>/share/', views.create_share, name='create_share'),
    path('files/<uuid:file_id>/shares/', views.list_shares, name='list_shares'),
    path('files/<uuid:file_id>/shares/<uuid:share_id>/', views.revoke_share, name='revoke_share'),
    path('files/<uuid:file_id>/invites/<uuid:invite_id>/', views.cancel_invite, name='cancel_invite'),
    path('files/<uuid:file_id>/embed/', views.embed_code, name='embed_code'),
    path('files/<uuid:file_id>/versions/', views.file_versions, name='file_versions'),
    path('files/<uuid:file_id>/versions/<uuid:version_id>/restore/', views.restore_file_version, name='restore_file_version'),
    path('files/<uuid:file_id>/activity/', views.file_activity, name='file_activity'),
    path('activity/', views.user_activity, name='user_activity'),
    path('dashboard/', views.dashboard_data, name='dashboard_data'),
    path('share/<str:token>/', views.public_file_access, name='public_file_access'),
    path('shared-with-me/', views.shared_with_me, name='shared_with_me'),
    
    # Upload endpoints
    path('uploads/init/', upload_views.init_upload, name='init_upload'),
    path('uploads/<uuid:upload_id>/chunk/', upload_views.upload_chunk, name='upload_chunk'),
    path('uploads/<uuid:upload_id>/complete/', upload_views.complete_upload, name='complete_upload'),
    path('uploads/<uuid:upload_id>/cancel/', upload_views.cancel_upload, name='cancel_upload'),
]