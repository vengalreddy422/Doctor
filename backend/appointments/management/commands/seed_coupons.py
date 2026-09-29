from decimal import Decimal
from django.core.management.base import BaseCommand
from appointments.models import Coupon


DEFAULT_COUPONS = [
    {
        "code": "FIRSTCARE",
        "title": "First Booking Welcome Offer",
        "description": "20% OFF on your very first appointment booking!",
        "discount_type": "percentage",
        "discount_value": Decimal("20.00"),
        "coupon_type": "first_booking",
        "required_bookings": 0,
        "max_bookings": 0,
        "max_discount": Decimal("500.00"),
        "is_active": True,
    },
    {
        "code": "LOYALTY5",
        "title": "5-Bookings Milestone Reward",
        "description": "15% OFF for completing 5 appointment bookings!",
        "discount_type": "percentage",
        "discount_value": Decimal("15.00"),
        "coupon_type": "milestone",
        "required_bookings": 5,
        "max_bookings": None,
        "max_discount": Decimal("400.00"),
        "is_active": True,
    },
    {
        "code": "GOLD10",
        "title": "10-Bookings Gold Milestone",
        "description": "25% OFF exclusive reward after completing 10 bookings!",
        "discount_type": "percentage",
        "discount_value": Decimal("25.00"),
        "coupon_type": "milestone",
        "required_bookings": 10,
        "max_bookings": None,
        "max_discount": Decimal("600.00"),
        "is_active": True,
    },
    {
        "code": "PLATINUM15",
        "title": "15-Bookings Platinum Milestone",
        "description": "30% OFF premium care discount after completing 15 bookings!",
        "discount_type": "percentage",
        "discount_value": Decimal("30.00"),
        "coupon_type": "milestone",
        "required_bookings": 15,
        "max_bookings": None,
        "max_discount": Decimal("750.00"),
        "is_active": True,
    },
    {
        "code": "DIAMOND20",
        "title": "20-Bookings Diamond Milestone",
        "description": "35% OFF VIP patient discount after completing 20 bookings!",
        "discount_type": "percentage",
        "discount_value": Decimal("35.00"),
        "coupon_type": "milestone",
        "required_bookings": 20,
        "max_bookings": None,
        "max_discount": Decimal("1000.00"),
        "is_active": True,
    },
    {
        "code": "HEALTH10",
        "title": "CareConnect Health Wellness",
        "description": "10% OFF consultation fee on any doctor booking.",
        "discount_type": "percentage",
        "discount_value": Decimal("10.00"),
        "coupon_type": "general",
        "required_bookings": 0,
        "max_bookings": None,
        "max_discount": Decimal("250.00"),
        "is_active": True,
    },
]


class Command(BaseCommand):
    help = 'Seed initial and milestone coupons into database'

    def handle(self, *args, **kwargs):
        count = 0
        for item in DEFAULT_COUPONS:
            coupon, created = Coupon.objects.update_or_create(
                code=item["code"],
                defaults=item
            )
            if created:
                count += 1
                self.stdout.write(self.style.SUCCESS(f"Created coupon {coupon.code}"))
            else:
                self.stdout.write(f"Updated coupon {coupon.code}")
        self.stdout.write(self.style.SUCCESS(f"Coupons seeded successfully! Total new: {count}"))
