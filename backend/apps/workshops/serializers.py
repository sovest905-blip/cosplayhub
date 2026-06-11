from rest_framework import serializers
from .models import Workshop, Service

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "description", "price_from"]

class WorkshopSerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, required=False)
    is_owner = serializers.SerializerMethodField()
    is_pro = serializers.BooleanField(read_only=True)  # вычисляемое свойство модели
    reviews_count = serializers.IntegerField(source="reviews.count", read_only=True)
    photos = serializers.SerializerMethodField()
    class Meta:
        model = Workshop
        fields = ["id", "name", "type", "city", "about", "cover", "eta",
                  "rating", "orders_count", "reviews_count", "is_pro", "services",
                  "photos", "is_owner", "created_at"]
        read_only_fields = ["rating", "orders_count", "created_at"]

    def to_representation(self, instance):
        # Относительный URL обложки (/media/...): корректен и в браузере, и при SSR.
        data = super().to_representation(instance)
        data["cover"] = instance.cover.url if instance.cover else None
        return data

    def get_photos(self, obj):
        return [{"id": p.id, "url": p.image.url} for p in obj.photos.all()]

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
