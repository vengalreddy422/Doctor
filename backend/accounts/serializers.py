from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ('email', 'username', 'password', 'phone')

    def create(self, validated_data):
        return User.objects.create_user(
            email=validated_data['email'],
            username=validated_data['username'],
            phone=validated_data.get('phone', ''),
            password=validated_data['password'],
            is_active=True,
            is_verified=False,
        )


class UserSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()
    total_bookings = serializers.SerializerMethodField()
    date_joined_formatted = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'role', 'hospital_name', 'hospital_slug', 'phone', 'is_verified', 'gender', 'birthday',
            'address', 'profile_image', 'profile_image_url', 'date_joined', 'date_joined_formatted', 'total_bookings'
        )
        read_only_fields = ('role', 'hospital_name', 'hospital_slug', 'is_verified', 'profile_image_url', 'date_joined', 'date_joined_formatted', 'total_bookings')

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None

    def get_total_bookings(self, obj):
        return obj.appointments.count() if hasattr(obj, 'appointments') else 0

    def get_date_joined_formatted(self, obj):
        if obj.date_joined:
            return obj.date_joined.strftime('%b %d, %Y')
        return ''



class ProfileSerializer(serializers.ModelSerializer):
    profile_image_url = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'phone', 'gender', 'birthday', 'address', 'profile_image', 'profile_image_url'
        )
        read_only_fields = ('id', 'email', 'username', 'profile_image_url')

    def get_profile_image_url(self, obj):
        if obj.profile_image:
            return obj.profile_image.url
        return None


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)


class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    code = serializers.CharField(max_length=6)
    new_password = serializers.CharField(min_length=8)
