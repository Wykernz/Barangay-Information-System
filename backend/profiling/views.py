from django.db import transaction
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from common.permissions import ChangeModelPermissions, StrictModelPermissions

from .models import FormDefinition, Resident
from .serializers import FormDefinitionSerializer, ResidentSerializer


class FormDefinitionViewSet(viewsets.ModelViewSet):
    serializer_class = FormDefinitionSerializer
    permission_classes = (StrictModelPermissions,)
    http_method_names = ("get", "post", "patch", "head", "options")
    queryset = FormDefinition.objects.prefetch_related("fields")
    filterset_fields = ("module", "status", "name")
    search_fields = ("name", "fields__label", "fields__key")
    ordering_fields = ("name", "version", "created_at", "updated_at")
    ordering = ("module", "name", "-version")

    def get_queryset(self):
        # Avoid duplicate rows when directory search matches several fields.
        return super().get_queryset().distinct()

    @extend_schema(request=None, responses=FormDefinitionSerializer)
    @transaction.atomic
    @action(detail=True, methods=("post",), permission_classes=(ChangeModelPermissions,))
    def activate(self, request, pk=None):
        definition = self.get_object()
        if definition.status != FormDefinition.Status.DRAFT:
            return Response(
                {"detail": "Only a draft form can be activated."}, status=status.HTTP_409_CONFLICT
            )
        if not definition.fields.exists():
            return Response(
                {"detail": "Add at least one field before activation."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        definition.status = FormDefinition.Status.ACTIVE
        definition.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(definition).data)

    @extend_schema(request=None, responses=FormDefinitionSerializer)
    @action(detail=True, methods=("post",), permission_classes=(ChangeModelPermissions,))
    def archive(self, request, pk=None):
        definition = self.get_object()
        if definition.status != FormDefinition.Status.ACTIVE:
            return Response(
                {"detail": "Only an active form can be archived."}, status=status.HTTP_409_CONFLICT
            )
        definition.status = FormDefinition.Status.ARCHIVED
        definition.save(update_fields=("status", "updated_at"))
        return Response(self.get_serializer(definition).data)


class ResidentViewSet(viewsets.ModelViewSet):
    serializer_class = ResidentSerializer
    permission_classes = (StrictModelPermissions,)
    http_method_names = ("get", "post", "patch", "head", "options")
    queryset = Resident.objects.select_related("form_definition").prefetch_related(
        "form_definition__fields"
    )
    filterset_fields = (
        "verification_status",
        "form_definition",
        "record_status",
        "residency_classification",
        "is_archived",
    )
    search_fields = ("reference", "given_name", "middle_name", "family_name", "suffix")
    ordering_fields = ("family_name", "given_name", "created_at", "updated_at")
    ordering = ("family_name", "given_name")

    @extend_schema(responses={(200, "image/jpeg"): bytes})
    @action(detail=True, methods=("get",))
    def photo(self, request, pk=None):
        from django.http import FileResponse, Http404

        resident = self.get_object()
        if not resident.photo:
            raise Http404
        try:
            response = FileResponse(resident.photo.open("rb"), content_type="image/jpeg")
        except FileNotFoundError:
            raise Http404 from None
        response["Cache-Control"] = "private, no-store"
        return response

    @extend_schema(request=None, responses=ResidentSerializer)
    @action(detail=True, methods=("post",), permission_classes=(ChangeModelPermissions,))
    def verify(self, request, pk=None):
        resident = self.get_object()
        if resident.verification_status.upper() == Resident.VerificationStatus.VERIFIED:
            return Response(
                {"detail": "This resident is already verified."},
                status=status.HTTP_409_CONFLICT,
            )
        serializer = self.get_serializer(resident)
        serializer.update(
            resident,
            {
                "verification_status": Resident.VerificationStatus.VERIFIED,
                "verified_at": timezone.now(),
                "verified_by": request.user,
            },
        )
        return Response(serializer.data)

    def get_queryset(self):
        return super().get_queryset()
