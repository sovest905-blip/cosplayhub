import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("messaging", "0001_initial"),
        ("listings", "0002_listing_contact"),
    ]

    operations = [
        migrations.AddField(
            model_name="conversation",
            name="listing",
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="conversations", to="listings.listing",
            ),
        ),
        migrations.AddField(
            model_name="conversation",
            name="listing_title",
            field=models.CharField(blank=True, max_length=120, verbose_name="объявление"),
        ),
    ]
