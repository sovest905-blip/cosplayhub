# Объединение тарифов (2026-06-27): легаси plan="workshop" подписки переносятся
# в единый Pro владельца мастерской. Workshop.is_pro теперь = owner.is_pro, поэтому
# отдельные workshop-подписки больше не влияют — конвертируем и удаляем их, чтобы
# не путали в админке. Идемпотентно: на чистой БД (нет workshop-подписок) — no-op.

from django.db import migrations


def forward(apps, schema_editor):
    Subscription = apps.get_model("billing", "Subscription")
    Workshop = apps.get_model("workshops", "Workshop")

    ws_subs = Subscription.objects.filter(plan="workshop", workshop__isnull=False)
    for s in ws_subs:
        owner_id = (
            Workshop.objects.filter(pk=s.workshop_id)
            .values_list("owner_id", flat=True)
            .first()
        ) or s.user_id

        pro = Subscription.objects.filter(
            user_id=owner_id, plan="pro", workshop__isnull=True
        ).first()

        if pro is None:
            Subscription.objects.create(
                user_id=owner_id, plan="pro", workshop=None,
                source=s.source, active_until=s.active_until, disabled=s.disabled,
                note="перенос тарифа мастерской → единый Pro",
            )
        else:
            # Берём более выгодный срок: бессрочный (None) приоритетнее любой даты.
            better = pro.active_until is not None and (
                s.active_until is None or s.active_until > pro.active_until
            )
            if better:
                pro.active_until = s.active_until
            if not s.disabled:
                pro.disabled = False
            if better or not s.disabled:
                pro.save(update_fields=["active_until", "disabled", "updated_at"])

    # Старые workshop-подписки теперь инертны — убираем их.
    ws_subs.delete()


def backward(apps, schema_editor):
    # Необратимо (не воссоздаём workshop-подписки). No-op.
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("billing", "0003_remove_subscription_uniq_user_pro_and_more"),
        ("workshops", "0003_workshopphoto"),
    ]

    operations = [
        migrations.RunPython(forward, backward),
    ]
