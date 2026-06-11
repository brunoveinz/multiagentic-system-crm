from rest_framework.routers import DefaultRouter

from .views import EmailMessageViewSet

router = DefaultRouter()
router.register("", EmailMessageViewSet, basename="email")

urlpatterns = router.urls
