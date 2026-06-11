from rest_framework.routers import DefaultRouter

from .views import ContactViewSet, LeadViewSet, StageViewSet

router = DefaultRouter()
router.register("stages", StageViewSet, basename="stage")
router.register("leads", LeadViewSet, basename="lead")
router.register("contacts", ContactViewSet, basename="contact")

urlpatterns = router.urls
