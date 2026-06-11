"""
Cifrado simétrico para secretos en reposo (tokens OAuth de Gmail).
La clave se deriva de DJANGO_SECRET_KEY → no agrega otra variable que gestionar,
pero mantiene los tokens cifrados en la base de datos.
"""
import base64
import hashlib

from cryptography.fernet import Fernet
from django.conf import settings


def _fernet() -> Fernet:
    digest = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
    key = base64.urlsafe_b64encode(digest)
    return Fernet(key)


def encrypt(plaintext: str) -> str:
    return _fernet().encrypt(plaintext.encode()).decode()


def decrypt(token: str) -> str:
    return _fernet().decrypt(token.encode()).decode()
