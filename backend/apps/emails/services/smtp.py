"""
Envío de correo por SMTP usando la configuración de cada empresa.
Solo salida. La contraseña viaja cifrada en la DB y se descifra al enviar.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage as MIMEMessage
from email.utils import make_msgid

from apps.emails.models import EmailAccount

logger = logging.getLogger(__name__)


def send_message(*, account: EmailAccount, to: str, subject: str, body: str) -> str:
    """Envía un correo con la cuenta SMTP de la empresa. Devuelve el Message-ID."""
    mime = MIMEMessage()
    sender = (
        f"{account.from_name} <{account.from_email}>"
        if account.from_name
        else account.from_email
    )
    message_id = make_msgid()
    mime["Message-ID"] = message_id
    mime["From"] = sender
    mime["To"] = to
    mime["Subject"] = subject
    mime.set_content(body)

    password = account.get_password()
    if account.use_tls:
        with smtplib.SMTP(account.host, account.port, timeout=20) as server:
            server.starttls()
            server.login(account.username, password)
            server.send_message(mime)
    else:
        with smtplib.SMTP_SSL(account.host, account.port, timeout=20) as server:
            server.login(account.username, password)
            server.send_message(mime)

    logger.info("SMTP: correo enviado a %s (%s)", to, message_id)
    return message_id


def test_connection(account: EmailAccount) -> None:
    """Verifica credenciales SMTP (login). Lanza excepción si falla."""
    password = account.get_password()
    if account.use_tls:
        with smtplib.SMTP(account.host, account.port, timeout=20) as server:
            server.starttls()
            server.login(account.username, password)
    else:
        with smtplib.SMTP_SSL(account.host, account.port, timeout=20) as server:
            server.login(account.username, password)
