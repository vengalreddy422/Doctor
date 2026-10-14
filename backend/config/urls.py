from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

from django.http import JsonResponse
from django.utils import timezone

def health_check(request):
    return JsonResponse({
        "status": "healthy",
        "service": "careconnect-backend",
        "timestamp": timezone.now().isoformat()
    })

urlpatterns = [
    path('health/', health_check, name='health_check_root'),
    path('api/health/', health_check, name='health_check_api'),
    path('admin/', admin.site.urls),

    # REST APIs (JWT-auth)
    path('api/accounts/', include('accounts.urls')),
    path('api/doctors/', include('doctors.urls')),
    path('api/appointments/', include('appointments.urls')),
    path('api/payments/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

handler404 = 'django.views.defaults.page_not_found'
handler500 = 'django.views.defaults.server_error'

