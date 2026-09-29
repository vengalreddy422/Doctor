from django import template
from appointments.services import calculate_fee

register = template.Library()

@register.simple_tag
def get_dynamic_fee(doctor, user):
    """
    Returns the dynamically calculated fee for the given doctor and user.
    If the user is not authenticated, returns the doctor's base fee.
    """
    if user and user.is_authenticated:
        return calculate_fee(user, doctor)
    return doctor.fee
