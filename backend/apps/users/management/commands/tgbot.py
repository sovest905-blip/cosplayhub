import logging

from django.conf import settings
from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Run Telegram bot (long-polling)"

    def handle(self, *args, **options):
        if not getattr(settings, "TELEGRAM_BOT_TOKEN", ""):
            self.stderr.write("TELEGRAM_BOT_TOKEN not set — bot disabled")
            return

        import django
        django.setup() if not django.apps.registry.apps.ready else None  # noqa

        from apps.users.tgbot import run_polling
        run_polling()
