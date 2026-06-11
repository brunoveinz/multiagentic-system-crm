from django.urls import path

from .views import OnboardingView, OrgMeView

urlpatterns = [
    path("onboarding/", OnboardingView.as_view(), name="onboarding"),
    path("me/", OrgMeView.as_view(), name="org_me"),
]

