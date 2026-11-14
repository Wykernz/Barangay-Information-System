from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Named staff accounts; domain permissions are introduced per vertical slice."""
