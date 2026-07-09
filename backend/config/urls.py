from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from . import dev_views
from audit import dev_views as audit_dev_views

urlpatterns = [
    path("admin/", admin.site.urls),

    # API routes
    path("api/v1/", include("accounts.urls")),
    path("api/v1/", include("roles.urls")),
    path("api/v1/", include("audit.urls")),
    path("api/v1/", include("core.urls")),
    path("api/v1/dev-seed-audit/", audit_dev_views.seed_audit),

    # Dev helper
    path("dev-token/", dev_views.dev_token),

    # -------- Swagger / OpenAPI --------
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]