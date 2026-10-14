#!/usr/bin/env bash
# Exit on error
set -o errexit

pip install -r requirements.txt

# Collect static files for WhiteNoise
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate

# Automatically seed doctors & schedules if the database has no doctors yet
python -c "import os, django; os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings'); django.setup(); from doctors.models import Doctor; from django.core.management import call_command; Doctor.objects.exists() or call_command('seed_doctors')"
