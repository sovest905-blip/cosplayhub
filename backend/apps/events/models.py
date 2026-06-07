from django.db import models


class Event(models.Model):
    """Событие: сходка, конвент, фотосет. Управляется из админ-панели."""
    title = models.CharField("название", max_length=200)
    description = models.TextField("описание", blank=True)
    city = models.CharField("город", max_length=80, blank=True)
    place = models.CharField("место", max_length=200, blank=True)
    date = models.DateField("дата")
    cover = models.ImageField("обложка", upload_to="events/", blank=True, null=True)
    going = models.PositiveIntegerField("идут", default=0)
    is_published = models.BooleanField("опубликовано", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["date"]
        verbose_name = "событие"
        verbose_name_plural = "события"

    def __str__(self):
        return f"{self.title} ({self.date})"
