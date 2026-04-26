from django.db import models


class RouteCache(models.Model):
    WALK = "WALK"
    TRANSIT = "TRANSIT"
    TRAVEL_MODE_CHOICES = [
        (WALK, "Walk"),
        (TRANSIT, "Transit"),
    ]

    origin_lat = models.DecimalField(max_digits=8, decimal_places=5)
    origin_lng = models.DecimalField(max_digits=8, decimal_places=5)
    dest_lat = models.DecimalField(max_digits=8, decimal_places=5)
    dest_lng = models.DecimalField(max_digits=8, decimal_places=5)
    travel_mode = models.CharField(max_length=16, choices=TRAVEL_MODE_CHOICES)
    polyline = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=[
                    "origin_lat",
                    "origin_lng",
                    "dest_lat",
                    "dest_lng",
                    "travel_mode",
                ],
                name="routecache_unique_segment",
            ),
        ]
        indexes = [
            models.Index(
                fields=[
                    "origin_lat",
                    "origin_lng",
                    "dest_lat",
                    "dest_lng",
                    "travel_mode",
                ],
            ),
        ]

    def __str__(self):
        return f"{self.origin_lat},{self.origin_lng} -> {self.dest_lat},{self.dest_lng} ({self.travel_mode})"
