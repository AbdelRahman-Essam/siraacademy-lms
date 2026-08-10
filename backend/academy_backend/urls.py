from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),

    # Auth (register + login)
    path('api/auth/', include('accounts.urls')),
    path('api/auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # Courses & lessons
    path('api/courses/', include('courses.urls')),

    # Enrollment & progressive unlock
    path('api/enrollments/', include('enrollments.urls')),

    # Listening & speaking homework
    path('api/assignments/', include('assignments.urls')),

    # Payments (Paymob checkout + webhook)
    path('api/payments/', include('payments.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
