from rest_framework.permissions import DjangoModelPermissions


class StrictModelPermissions(DjangoModelPermissions):
    """Require model capabilities for reads as well as writes."""

    perms_map = {
        "GET": ["%(app_label)s.view_%(model_name)s"],
        "OPTIONS": ["%(app_label)s.view_%(model_name)s"],
        "HEAD": ["%(app_label)s.view_%(model_name)s"],
        "POST": ["%(app_label)s.add_%(model_name)s"],
        "PUT": ["%(app_label)s.change_%(model_name)s"],
        "PATCH": ["%(app_label)s.change_%(model_name)s"],
        "DELETE": ["%(app_label)s.delete_%(model_name)s"],
    }


class ChangeModelPermissions(StrictModelPermissions):
    """POST actions that transition an existing object are changes, not creations."""

    perms_map = {
        key: ["%(app_label)s.change_%(model_name)s"] for key in StrictModelPermissions.perms_map
    }
