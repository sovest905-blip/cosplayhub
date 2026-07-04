"""Управляемый контент главной страницы: блок «Выбор редакции» и лента категорий.
Раньше был захардкожен в web/app/page.tsx — теперь редактируется из админ-панели."""
from django.db import models


class CuratedPick(models.Model):
    """Карточка блока «Выбор редакции» на главной.
    style задаёт цвет/размер карточки (совпадает с CSS-классами cur-look/cur-ws/cur-ev)."""
    STYLE_CHOICES = [
        ("look", "Образ (розовый, крупный)"),
        ("workshop", "Мастерская (голубой)"),
        ("event", "Событие (жёлтый)"),
    ]
    style = models.CharField("стиль карточки", max_length=20, choices=STYLE_CHOICES, default="look")
    tag = models.CharField("метка", max_length=60, blank=True, help_text="Напр. ★ Образ недели")
    title = models.CharField("заголовок", max_length=200)
    meta = models.CharField("подпись", max_length=200, blank=True, help_text="Напр. 12 400 просмотров · 890 ♥")
    link = models.CharField("ссылка", max_length=300, blank=True, help_text="Напр. /people/1 или https://…")
    image = models.ImageField("картинка (файл)", upload_to="curated/", blank=True, null=True)
    image_url = models.URLField("картинка (ссылка)", max_length=500, blank=True,
                                help_text="Альтернатива загрузке файла")
    order = models.PositiveIntegerField("порядок", default=0)
    is_active = models.BooleanField("показывать", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "выбор редакции"
        verbose_name_plural = "выбор редакции"

    def __str__(self):
        return self.title


class Category(models.Model):
    """Пункт бегущей ленты категорий на главной (marquee)."""
    label = models.CharField("название", max_length=60)
    link = models.CharField("ссылка", max_length=300, blank=True)
    order = models.PositiveIntegerField("порядок", default=0)
    is_active = models.BooleanField("показывать", default=True)

    class Meta:
        ordering = ["order", "id"]
        verbose_name = "категория"
        verbose_name_plural = "категории"

    def __str__(self):
        return self.label
