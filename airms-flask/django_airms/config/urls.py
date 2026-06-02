from django.contrib import admin
from django.urls import include, path, re_path

from django_airms.webpages import views as web_views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('django_airms.webpages.urls')),
    path('', web_views.spa_index, name='spa_root'),
    re_path(r'^(?!web/|admin/).+$', web_views.spa_index, name='spa_catchall'),
]
