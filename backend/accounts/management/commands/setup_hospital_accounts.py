import re
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from doctors.models import Doctor, Hospital

User = get_user_model()


def clean_hospital_slug(hospital_name):
    """Generate clean, lowercase username slug from hospital name."""
    if not hospital_name:
        return 'careconnect'
    # Remove special characters, keep letters and digits
    slug = re.sub(r'[^a-zA-Z0-9]', '', hospital_name.lower())
    if not slug:
        slug = 'hospital'
    return slug[:30]


def ensure_hospital_entity_and_account(hospital_name, default_password="hospital@123", address="", phone="", email="", maps_url="", city=""):
    """Ensure dynamic Hospital record and staff user account exist."""
    if not hospital_name or not hospital_name.strip():
        hospital_name = "CareConnect General Hospital"

    hospital_name = hospital_name.strip()
    slug = clean_hospital_slug(hospital_name)
    user_email = email or f"{slug}@hospital.mediconnect.com"

    # 1. Create or get dynamic Hospital entity
    hospital_obj, created = Hospital.objects.get_or_create(
        name__iexact=hospital_name,
        defaults={
            'name': hospital_name,
            'slug': slug,
            'address': address or f"{hospital_name} Campus, Medical Enclave",
            'contact_phone': phone or "+91 80 4000 5000",
            'contact_email': user_email,
            'city': city or "Bangalore",
            'google_maps_url': maps_url,
            'is_active': True,
        }
    )
    if not created and not hospital_obj.slug:
        hospital_obj.slug = slug
        hospital_obj.save()

    # 2. Link affiliated doctors to this Hospital entity
    Doctor.objects.filter(hospital_name__iexact=hospital_name).update(hospital=hospital_obj)

    # 3. Create or update hospital staff User account
    user = User.objects.filter(role='hospital', hospital=hospital_obj).first()
    if not user:
        user = User.objects.filter(username=slug).first()
    if not user:
        user = User.objects.filter(email=user_email).first()

    if not user:
        user = User.objects.create_user(
            username=slug,
            email=user_email,
            password=default_password,
            role='hospital',
            hospital=hospital_obj,
            hospital_name=hospital_obj.name,
            hospital_slug=hospital_obj.slug,
            is_verified=True,
            is_active=True,
            first_name=hospital_obj.name[:30],
        )
    else:
        user.role = 'hospital'
        user.hospital = hospital_obj
        user.hospital_name = hospital_obj.name
        user.hospital_slug = hospital_obj.slug
        user.is_verified = True
        user.is_active = True
        user.set_password(default_password)
        user.save()

    return hospital_obj, user


class Command(BaseCommand):
    help = "Automatically provision dynamic Hospital entities and management accounts with default password 'hospital@123'"

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE("Synchronizing dynamic hospital facilities and accounts..."))
        
        # Discover all hospital names from doctors
        doc_hospitals = Doctor.objects.exclude(hospital_name__isnull=True).exclude(hospital_name='').values_list('hospital_name', flat=True).distinct()
        hospital_list = list(doc_hospitals)

        if not hospital_list:
            hospital_list = ["CareConnect General Hospital", "Apollo Speciality Hospital", "Fortis Hospital", "Manipal Hospital"]

        created_count = 0
        for h_name in hospital_list:
            # Check if doctor has address or phone
            sample_doc = Doctor.objects.filter(hospital_name=h_name).first()
            addr = sample_doc.clinic_address if sample_doc else ""
            phone = sample_doc.contact_number if sample_doc else ""
            email = sample_doc.contact_email if sample_doc else ""
            maps = sample_doc.google_maps_url if sample_doc else ""

            h_obj, user = ensure_hospital_entity_and_account(
                h_name,
                address=addr,
                phone=phone,
                email=email,
                maps_url=maps
            )
            self.stdout.write(self.style.SUCCESS(f"  [OK] Hospital: '{h_obj.name}' -> Username: '{user.username}' | Password: 'hospital@123' | Doctors: {h_obj.doctors.count()}"))
            created_count += 1

        self.stdout.write(self.style.SUCCESS(f"\nSuccessfully configured {created_count} dynamic hospital facilities & accounts!"))
