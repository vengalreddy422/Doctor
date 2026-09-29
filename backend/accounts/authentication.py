from rest_framework_simplejwt.authentication import JWTAuthentication
from django.core.cache import cache


class FastCachedJWTAuthentication(JWTAuthentication):
    """
    High-performance JWT Authentication:
    Caches the authenticated user object in high-speed memory for 60 seconds
    to prevent remote database queries on every authenticated API call.
    """
    def get_user(self, validated_token):
        user_id = validated_token.get('user_id')
        if not user_id:
            return super().get_user(validated_token)

        cache_key = f"jwt_user_inst_{user_id}"
        cached_user = cache.get(cache_key)
        if cached_user is not None and getattr(cached_user, 'is_active', True):
            return cached_user

        user = super().get_user(validated_token)
        if user and user.is_active:
            cache.set(cache_key, user, timeout=60)
        return user
