from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import Doctor, DoctorSchedule, Holiday, WEEKDAY_CHOICES


# ---------------------------------------------------------------------------
# Inlines for Doctor admin
# ---------------------------------------------------------------------------
class DoctorScheduleInline(admin.TabularInline):
    """
    Inline table on the Doctor edit page.
    Admin sees: Day | Start Time | End Time | Duration | Active
    Can add multiple blocks per day (e.g. morning + afternoon).
    """
    model = DoctorSchedule
    extra = 2
    fields = ('day_of_week', 'start_time', 'end_time', 'is_active')
    show_change_link = False


class HolidayInline(admin.TabularInline):
    """Inline to add blocked/holiday dates directly on the Doctor page."""
    model = Holiday
    extra = 1
    fields = ('date', 'reason')


# ---------------------------------------------------------------------------
# DoctorAdmin
# ---------------------------------------------------------------------------
@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    inlines = [DoctorScheduleInline, HolidayInline]

    # ------------------------------------------------------------------
    # List view
    # ------------------------------------------------------------------
    list_display = (
        'name', 'specialization', 'hospital_name',
        'schedule_summary', 'fee', 'rating_display',
        'experience_years', 'is_active',
    )
    list_filter = ('specialization', 'is_active')
    search_fields = ('name', 'specialization', 'hospital_name')
    list_editable = ('is_active',)

    # ------------------------------------------------------------------
    # Detail / edit form — grouped into logical fieldsets
    # ------------------------------------------------------------------
    fieldsets = (
        ('👤 Basic Information', {
            'fields': ('name', 'specialization', 'qualification',
                       'experience_years', 'image', 'bio'),
        }),
        ('🏥 Hospital, Location & Contact', {
            'fields': ('hospital_name', 'clinic_address', 'contact_number',
                       'contact_email', 'google_maps_url', 'is_active'),
        }),
        ('💰 Consultation', {
            'fields': ('fee',),
        }),
        ('⭐ Ratings', {
            'fields': ('rating', 'total_reviews'),
            'classes': ('collapse',),
        }),
        ('🕐 Legacy Fields (read-only)', {
            'fields': ('available_days',),
            'classes': ('collapse',),
            'description': (
                'These fields are superseded by the Schedule Blocks above. '
                'available_days is auto-synced from active schedule entries.'
            ),
        }),
    )

    readonly_fields = ('available_days',)

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------
    @admin.display(description='Weekly Schedule')
    def schedule_summary(self, obj):
        schedules = obj.schedules.filter(is_active=True).order_by('day_of_week', 'start_time')
        if not schedules:
            return mark_safe('<span style="color:#999;">— No schedule —</span>')
        day_map = dict(WEEKDAY_CHOICES)
        badges = []
        for s in schedules:
            day = day_map.get(s.day_of_week, s.day_of_week)[:3]
            badges.append(
                f'<span style="background:#ECFDF5;color:#065F46;border:1px solid #A7F3D0;'
                f'border-radius:4px;padding:1px 6px;font-size:11px;margin-right:3px;">'
                f'{day} {s.start_time:%H:%M}–{s.end_time:%H:%M}</span>'
            )
        return mark_safe(' '.join(badges))

    @admin.display(description='Rating')
    def rating_display(self, obj):
        stars = '★' * int(obj.rating) + '☆' * (5 - int(obj.rating))
        return f'{stars} ({obj.rating})'


# ---------------------------------------------------------------------------
# Standalone Holiday admin (for global holidays)
# ---------------------------------------------------------------------------
@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ('date', 'doctor', 'reason')
    list_filter = ('date', 'doctor')
    search_fields = ('reason',)
    date_hierarchy = 'date'


# ---------------------------------------------------------------------------
# DoctorSchedule standalone admin (optional browsing)
# ---------------------------------------------------------------------------
@admin.register(DoctorSchedule)
class DoctorScheduleAdmin(admin.ModelAdmin):
    list_display = ('doctor', 'day_of_week', 'start_time', 'end_time',
                    'is_active')
    list_filter = ('day_of_week', 'is_active', 'doctor')
    search_fields = ('doctor__name',)
