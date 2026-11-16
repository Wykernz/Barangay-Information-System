from rest_framework import serializers


class StaffSessionSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
