"""SMTP email backend без проверки TLS-сертификата.

Используется ТОЛЬКО для собственного почтовика (Postfix на той же машине),
который отдаёт самоподписанный Plesk-сертификат (CN=Plesk). Трафик не покидает
сервер (контейнер → хост-Postfix), поэтому отключение проверки серта безопасно.

Для внешних релеев (Brevo и т.п.) используй стандартный
django.core.mail.backends.smtp.EmailBackend — он проверяет сертификат.
"""
import ssl

from django.core.mail.backends.smtp import EmailBackend as _SmtpEmailBackend


class EmailBackend(_SmtpEmailBackend):
    @property
    def ssl_context(self):
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        return ctx
