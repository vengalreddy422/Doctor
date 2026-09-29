from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('doctors', '0002_doctor_afternoon_start_doctor_morning_start_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='doctor',
            name='hospital_name',
            field=models.CharField(
                blank=True,
                default='',
                help_text='Hospital / clinic where this doctor is available',
                max_length=200,
            ),
        ),
    ]
