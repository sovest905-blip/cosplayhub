from django.db import models


class DailyVisit(models.Model):
    """Счётчик посещений сайта по дням.

    `count` — уникальные посетители за день (по IP, дедуп через VisitorDay).
    Боты не учитываются. Виден только в staff-админке."""
    date = models.DateField("дата", unique=True)
    count = models.PositiveIntegerField("посещений", default=0)

    class Meta:
        ordering = ["-date"]
        verbose_name = "посещения за день"
        verbose_name_plural = "посещения по дням"

    def __str__(self):
        return f"{self.date}: {self.count}"


class VisitorDay(models.Model):
    """Один уникальный посетитель за день — для дедупа посещений.

    IP хранится только в виде соленого хэша (сырой IP не сохраняем — ПДн)."""
    date = models.DateField("дата")
    ip_hash = models.CharField("хэш IP", max_length=64)

    class Meta:
        unique_together = ("date", "ip_hash")
        indexes = [models.Index(fields=["date"])]
        verbose_name = "уникальный посетитель"
        verbose_name_plural = "уникальные посетители"

    def __str__(self):
        return f"{self.date} · {self.ip_hash[:8]}…"
