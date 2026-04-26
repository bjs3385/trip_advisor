from django.db import models


class Trip(models.Model):
    name = models.CharField(max_length=200)
    start_date = models.CharField(max_length=10)
    map_camera = models.JSONField(default=dict, blank=True)
    ui_state = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class TripCity(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="cities")
    name = models.CharField(max_length=100)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.trip} - {self.name}"


class Day(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="days")
    day_number = models.IntegerField()
    label = models.CharField(max_length=20)
    city = models.CharField(max_length=100, blank=True)
    note = models.TextField(blank=True)
    group_names = models.JSONField(default=dict, blank=True)

    class Meta:
        ordering = ["day_number"]

    def __str__(self):
        return f"{self.trip} Day {self.day_number}"


class Location(models.Model):
    day = models.ForeignKey(Day, on_delete=models.CASCADE, related_name="locations")
    external_id = models.CharField(max_length=200)
    name = models.CharField(max_length=300)
    category = models.CharField(max_length=20)
    transit_role = models.CharField(max_length=12, blank=True)
    time = models.CharField(max_length=5)
    end_time = models.CharField(max_length=5, blank=True)
    group_id = models.CharField(max_length=200, blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    lng = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    shape_vertices = models.JSONField(default=list, blank=True)
    entry_lat = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    entry_lng = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    exit_lat = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    exit_lng = models.DecimalField(
        max_digits=10, decimal_places=7, null=True, blank=True
    )
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "id"]

    def __str__(self):
        return self.name


class Bookmark(models.Model):
    trip = models.ForeignKey(Trip, on_delete=models.CASCADE, related_name="bookmarks")
    place_id = models.CharField(max_length=200)
    name = models.CharField(max_length=300)
    address = models.CharField(max_length=500, blank=True)
    poi_type = models.CharField(max_length=100, blank=True)
    rating = models.DecimalField(max_digits=3, decimal_places=1, null=True, blank=True)
    lat = models.DecimalField(max_digits=10, decimal_places=7)
    lng = models.DecimalField(max_digits=10, decimal_places=7)
    created_at = models.DateTimeField(auto_now_add=True)
    order = models.IntegerField(default=0)

    class Meta:
        ordering = ["order", "-created_at"]

    def __str__(self):
        return self.name
