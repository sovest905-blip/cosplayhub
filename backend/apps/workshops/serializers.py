from rest_framework import serializers
from .models import Workshop, Service

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "description", "price_from"]

class WorkshopSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, required=False)
    is_owner = serializers.SerializerMethodField()
    class Meta:
        model = Workshop
        fields = ["id", "name", "type", "city", "about", "cover", "eta",
                  "rating", "orders_count", "is_pro", "services", "is_owner", "created_at"]
        read_only_fields = ["rating", "orders_count", "is_pro", "created_at"]

    def get_is_owner(self, obj):
        request = self.context.get("request")
        return bool(request and request.user.is_authenticated and obj.owner_id == request.user.id)

    def create(self, validated_data):
        services = validated_data.pop("services", [])
        workshop = Workshop.objects.create(**validated_data)
        for svc in services:
            Service.objects.create(workshop=workshop, **svc)
        return workshop

    def update(self, instance, validated_data):
        services = validated_data.pop("services", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        # Полная замена набора услуг, если передан
        if services is not None:
            instance.services.all().delete()
            for svc in services:
                Service.objects.create(workshop=instance, **svc)
        return instance
