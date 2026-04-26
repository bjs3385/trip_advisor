from django.urls import path

from . import views

urlpatterns = [
    path("", views.trips_collection, name="trips-collection"),
    path("<int:trip_id>", views.trip_detail, name="trip-detail"),
]
