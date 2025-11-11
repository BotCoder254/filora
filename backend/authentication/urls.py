from django.urls import path
from . import views

urlpatterns = [
    path('signup/', views.signup, name='signup'),
    path('login/', views.login_view, name='login'),
    path('me/', views.me, name='me'),
    path('password-reset/', views.password_reset, name='password_reset'),
]