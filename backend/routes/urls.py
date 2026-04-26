from django.urls import path

from . import views

urlpatterns = [
    path("compute", views.compute, name="routes-compute"),
]
