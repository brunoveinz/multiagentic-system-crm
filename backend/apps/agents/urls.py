from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import (
    CoachAnswerView,
    CoachChatView,
    CoachHistoryView,
    CoachTodayView,
    DraftView,
    FollowupsView,
    KnowledgeDocViewSet,
)

router = DefaultRouter()
router.register("knowledge", KnowledgeDocViewSet, basename="knowledge")

urlpatterns = [
    path("draft/", DraftView.as_view(), name="draft"),
    path("coach/today/", CoachTodayView.as_view(), name="coach_today"),
    path("coach/answer/", CoachAnswerView.as_view(), name="coach_answer"),
    path("coach/chat/", CoachChatView.as_view(), name="coach_chat"),
    path("coach/history/", CoachHistoryView.as_view(), name="coach_history"),
    path("followups/", FollowupsView.as_view(), name="followups"),
    *router.urls,
]
