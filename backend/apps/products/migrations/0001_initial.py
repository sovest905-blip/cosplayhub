import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Product",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("title", models.CharField(max_length=160, verbose_name="название")),
                ("description", models.TextField(blank=True, verbose_name="описание")),
                ("price", models.PositiveIntegerField(blank=True, null=True, verbose_name="цена ₸")),
                ("image", models.ImageField(blank=True, null=True, upload_to="products/", verbose_name="фото")),
                ("image_url", models.URLField(blank=True, verbose_name="фото по ссылке")),
                ("category", models.CharField(blank=True, max_length=80, verbose_name="категория")),
                ("status", models.CharField(choices=[("in_stock", "В наличии"), ("on_order", "На заказ"), ("sold", "Продано")], default="in_stock", max_length=20, verbose_name="статус")),
                ("is_active", models.BooleanField(default=True, verbose_name="активен")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("owner", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                                            related_name="products", to=settings.AUTH_USER_MODEL)),
            ],
            options={"ordering": ["-created_at"], "verbose_name": "товар", "verbose_name_plural": "товары"},
        ),
    ]
