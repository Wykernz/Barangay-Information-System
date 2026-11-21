from rest_framework import serializers


class StaffSessionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150, read_only=True)
    display_name = serializers.CharField(read_only=True)
    health_only = serializers.BooleanField(read_only=True)
