"""
appointments/notifications.py
==============================
Notification services to send confirmation, warning, and reminder emails to patients.
Utilizes Django's core mail framework.
"""

from accounts.brevo import send_email
from django.conf import settings
from django.template.loader import render_to_string
from django.utils.html import strip_tags


def send_booking_confirmation(appointment):
    """Send email confirming that the appointment slot has been reserved (pending payment)."""
    if not settings.BREVO_API_KEY:
        return
        
    subject = f'Appointment Reserved: Dr. {appointment.doctor.name}'
    context = {
        'appointment': appointment,
        'patient': appointment.patient,
        'doctor': appointment.doctor,
        'slot': appointment.slot,
    }
    
    # We can write plain text email body directly or render template
    message_text = (
        f"Hello {appointment.patient.username},\n\n"
        f"Your appointment with Dr. {appointment.doctor.name} has been successfully reserved!\n\n"
        f"Details:\n"
        f"- Date: {appointment.slot.date}\n"
        f"- Time: {appointment.slot.start_time:%H:%M}" + (f" to {appointment.slot.end_time:%H:%M}" if appointment.slot.end_time else "") + "\n"
        f"- Fee: ₹{appointment.fee_charged}\n"
        f"- Receipt ID: {appointment.receipt_id}\n\n"
        f"Status: Pending Payment\n"
        f"Please complete your payment under 'My Appointments' in your dashboard to confirm your booking.\n\n"
        f"Best regards,\n"
        f"MediConnect Team"
    )
    
    try:
        send_email(
    to_email=appointment.patient.email,
    subject=subject,
    html_content=f"""
    <pre>{message_text}</pre>
    """
)
    except Exception as e:
        print(f"Failed to send booking confirmation email: {e}")


def send_payment_confirmation(appointment):
    """Send email after successful payment, marking booking as confirmed/upcoming."""
    if not settings.BREVO_API_KEY:
        return
        
    subject = f'Booking Confirmed: Dr. {appointment.doctor.name}'
    message_text = (
        f"Hello {appointment.patient.username},\n\n"
        f"Thank you for your payment. Your appointment with Dr. {appointment.doctor.name} is now CONFIRMED!\n\n"
        f"Details:\n"
        f"- Date: {appointment.slot.date}\n"
        f"- Time: {appointment.slot.start_time:%H:%M}" + (f" to {appointment.slot.end_time:%H:%M}" if appointment.slot.end_time else "") + "\n"
        f"- Status: Confirmed\n"
        f"- Receipt ID: {appointment.receipt_id}\n\n"
        f"You can view your digital receipt and download a copy in the payment history section of your dashboard.\n\n"
        f"Best regards,\n"
        f"MediConnect Team"
    )
    
    try:
        send_email(
    to_email=appointment.patient.email,
    subject=subject,
    html_content=f"""
    <pre>{message_text}</pre>
    """
)
    except Exception as e:
        print(f"Failed to send payment confirmation email: {e}")


def send_cancellation_notification(appointment, refund_info=None):
    """
    Send cancellation confirmation and RedBus-style refund breakdown to the patient.
    """
    if not settings.BREVO_API_KEY:
        return

    patient_name = appointment.patient_name or appointment.patient.username
    doctor_name = appointment.doctor.name
    specialization = appointment.doctor.specialization
    hospital_name = appointment.doctor.hospital_name or (appointment.doctor.hospital.name if appointment.doctor.hospital else 'CareConnect Hospital')
    clinic_address = appointment.doctor.clinic_address or ''
    subject = f'Appointment Cancellation & Refund Summary: Dr. {doctor_name} ({appointment.receipt_id})'

    refund_amt = appointment.refund_amount if appointment.refund_amount is not None else (refund_info.get('refund_amount') if refund_info else appointment.fee_charged)
    deduct_amt = appointment.cancellation_fee if appointment.cancellation_fee is not None else (refund_info.get('deduction_amount') if refund_info else '0.00')
    tier_label = refund_info.get('tier_label') if refund_info else 'Cancellation Policy Applied'
    reason = appointment.cancellation_reason or 'Patient schedule change'

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800; color: #f87171;">Appointment Cancelled</h2>
            <p style="margin: 0; font-size: 13px; color: #94a3b8;">Receipt / Booking ID: <strong>{appointment.receipt_id}</strong></p>
        </div>
        
        <div style="padding: 24px;">
            <p style="margin-top: 0;">Dear <strong>{patient_name}</strong>,</p>
            <p>Your appointment consultation with <strong>Dr. {doctor_name}</strong> has been cancelled as requested.</p>

            <div style="background: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; padding: 16px; margin: 20px 0;">
                <h4 style="margin: 0 0 12px; font-size: 14px; text-transform: uppercase; color: #475569; letter-spacing: 0.05em;">Cancelled Appointment Details</h4>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td style="padding: 6px 0; font-weight: 600;">Dr. {doctor_name} ({specialization})</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Hospital / Clinic:</td><td style="padding: 6px 0; font-weight: 600;">{hospital_name}</td></tr>
                    {f'<tr><td style="padding: 6px 0; color: #64748b;">Location:</td><td style="padding: 6px 0;">{clinic_address}</td></tr>' if clinic_address else ''}
                    <tr><td style="padding: 6px 0; color: #64748b;">Scheduled Date:</td><td style="padding: 6px 0; font-weight: 600;">{appointment.slot.date} ({appointment.slot.start_time:%H:%M})</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Cancellation Reason:</td><td style="padding: 6px 0;">{reason}</td></tr>
                </table>
            </div>

            <!-- Refund Calculation Breakdown Box -->
            <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 18px; margin: 20px 0;">
                <h4 style="margin: 0 0 8px; color: #166534; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">💰 RedBus-Style Refund Calculation Breakdown</h4>
                <p style="margin: 0 0 12px; font-size: 12px; color: #15803d;"><strong>Applied Policy:</strong> {tier_label}</p>
                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <tr><td style="padding: 5px 0; color: #374151;">Total Consultation Fee Paid:</td><td style="padding: 5px 0; text-align: right; font-weight: 600;">₹{appointment.fee_charged}</td></tr>
                    <tr><td style="padding: 5px 0; color: #dc2626;">Cash Cut-off Deduction:</td><td style="padding: 5px 0; text-align: right; color: #dc2626; font-weight: 600;">- ₹{deduct_amt}</td></tr>
                    <tr style="border-top: 1.5px dashed #86efac;"><td style="padding: 10px 0 0; font-size: 16px; font-weight: 800; color: #166534;">Net Refund Credited:</td><td style="padding: 10px 0 0; text-align: right; font-size: 18px; font-weight: 800; color: #166534;">₹{refund_amt}</td></tr>
                </table>
            </div>

            <p style="font-size: 13px; color: #64748b;">
                Refunds are automatically processed to your original payment method. If you need any assistance or wish to re-schedule, you can visit your <a href="http://localhost:5173/my-appointments" style="color: #0284c7; font-weight: 700;">Patient Portal</a>.
            </p>
            <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Warm regards,<br/>
                <strong>{hospital_name}</strong> & the CareConnect Healthcare Support Team
            </p>
        </div>
    </div>
    """

    try:
        send_email(
            to_email=appointment.patient.email,
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        print(f"Failed sending cancellation confirmation email: {e}")


def send_admin_slot_cancellation_email(appointment, slot, reason="Doctor Medical Emergency / Administrative Scheduling", is_auto_rescheduled=False, new_slot=None):
    """
    Send polite apology notification to patient when admin or hospital management cancels or auto-reschedules their slot.
    """
    if not settings.BREVO_API_KEY:
        return

    patient_name = appointment.patient_name or appointment.patient.username
    doctor_name = appointment.doctor.name
    specialization = appointment.doctor.specialization
    hospital_name = appointment.doctor.hospital_name or (appointment.doctor.hospital.name if appointment.doctor.hospital else 'CareConnect Hospital')
    time_str = f"{slot.start_time:%H:%M}" + (f"–{slot.end_time:%H:%M}" if slot.end_time else "")

    if is_auto_rescheduled and new_slot:
        subject = f'Important: Consultation Rescheduled by {hospital_name} — Dr. {doctor_name}'
        new_time_str = f"{new_slot.start_time:%H:%M}" + (f"–{new_slot.end_time:%H:%M}" if new_slot.end_time else "")

        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800;">Consultation Automatically Rescheduled</h2>
                <p style="margin: 0; font-size: 13px; color: #e0f2fe;">{hospital_name} Administrative Care Update</p>
            </div>
            
            <div style="padding: 24px;">
                <p style="margin-top: 0;">Dear <strong>{patient_name}</strong>,</p>
                <p style="color: #334155;">
                    Please accept our sincere apologies. Due to unforeseen circumstances (<strong>{reason}</strong>), <strong>Dr. {doctor_name}</strong> is unable to take consultations at the original time.
                </p>
                <p style="color: #334155;">
                    To ensure your healthcare is not delayed, our hospital administration has automatically prioritized and shifted your appointment to the doctor's next active slot:
                </p>

                <!-- Shift Table -->
                <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <div style="margin-bottom: 8px;">
                        <span style="font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 700;">Previous Schedule:</span>
                        <div style="color: #dc2626; text-decoration: line-through; font-weight: 600;">{slot.date} at {time_str}</div>
                    </div>
                    <div>
                        <span style="font-size: 12px; color: #0369a1; text-transform: uppercase; font-weight: 700;">✨ New Confirmed Schedule:</span>
                        <div style="font-size: 16px; color: #0369a1; font-weight: 800;">{new_slot.date} at {new_time_str}</div>
                    </div>
                </div>

                <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                    <tr><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td style="padding: 6px 0; font-weight: 600;">Dr. {doctor_name} ({specialization})</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Hospital:</td><td style="padding: 6px 0; font-weight: 600;">{hospital_name}</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Patient:</td><td style="padding: 6px 0; font-weight: 600;">{patient_name} ({appointment.patient_relation or 'Self'})</td></tr>
                    <tr><td style="padding: 6px 0; color: #64748b;">Receipt ID:</td><td style="padding: 6px 0; font-weight: 600;">{appointment.receipt_id}</td></tr>
                </table>

                <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; color: #475569;">
                    <strong>Patient Flexibility Note:</strong> If this new time does not suit you, you may reschedule to another date or request an instant 100% full refund with ₹0 deductions directly from your <a href="http://localhost:5173/my-appointments" style="color: #0284c7; font-weight: 700;">Patient Dashboard</a>.
                </div>

                <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    We deeply regret this disruption to your day and thank you for your understanding.<br/>
                    Warm regards,<br/>
                    <strong>Administration Office, {hospital_name}</strong>
                </p>
            </div>
        </div>
        """
    else:
        subject = f'Sincere Apologies: Slot Cancelled by {hospital_name} (100% Full Refund) — Dr. {doctor_name}'

        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800;">Notice of Slot Cancellation & Full Refund</h2>
                <p style="margin: 0; font-size: 13px; color: #fecaca;">{hospital_name} Emergency Administration Notice</p>
            </div>
            
            <div style="padding: 24px;">
                <p style="margin-top: 0;">Dear <strong>{patient_name}</strong>,</p>
                <p style="color: #334155;">
                    We deeply regret to inform you that the consultation schedule for <strong>Dr. {doctor_name}</strong> at <strong>{hospital_name}</strong> on <strong>{slot.date} ({time_str})</strong> has been cancelled.
                </p>
                
                <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 16px; margin: 18px 0; border-radius: 6px;">
                    <p style="margin: 0; color: #991b1b; font-size: 13px;"><strong>Hospital Reason:</strong> {reason}</p>
                </div>

                <!-- 100% Full Refund Guarantee -->
                <div style="background: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; padding: 16px; margin: 20px 0;">
                    <div style="font-size: 13px; font-weight: 700; color: #166534; text-transform: uppercase;">🛡️ 100% Full Refund Guarantee</div>
                    <p style="margin: 4px 0 0; font-size: 14px; color: #15803d;">
                        Because this cancellation was initiated by hospital administration, you will not be charged any fees. A <strong>100% full refund of ₹{appointment.fee_charged}</strong> (zero deduction) has been credited back to your payment source.
                    </p>
                </div>

                <p style="font-size: 13px; color: #334155;">
                    We sincerely apologize for the inconvenience this may have caused to your healthcare plans. You may easily rebook an alternate slot on the <a href="http://localhost:5173/my-appointments" style="color: #0284c7; font-weight: 700;">Patient Portal</a>.
                </p>

                <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                    With heartfelt apologies,<br/>
                    <strong>Patient Care & Medical Administration</strong><br/>
                    {hospital_name}
                </p>
            </div>
        </div>
        """

    try:
        send_email(
            to_email=appointment.patient.email,
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        print(f"Failed sending admin slot cancellation email: {e}")


def send_admin_reschedule_email(appointment, old_slot_info=None, reason="Administrative Reschedule"):
    """Send confirmation email to patient after admin/hospital reschedules their appointment."""
    if not settings.BREVO_API_KEY:
        return

    patient_name = appointment.patient_name or appointment.patient.username
    doctor_name = appointment.doctor.name
    specialization = appointment.doctor.specialization
    hospital_name = appointment.doctor.hospital_name or (appointment.doctor.hospital.name if appointment.doctor.hospital else 'CareConnect Hospital')
    new_time_str = f"{appointment.slot.start_time:%H:%M}" + (f"–{appointment.slot.end_time:%H:%M}" if appointment.slot.end_time else "")
    subject = f'Appointment Rescheduled: Dr. {doctor_name} ({hospital_name})'

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); color: #ffffff; padding: 24px; text-align: center;">
            <h2 style="margin: 0 0 6px; font-size: 20px; font-weight: 800;">Consultation Rescheduled</h2>
            <p style="margin: 0; font-size: 13px; color: #e0f2fe;">{hospital_name} Administrative Care Update</p>
        </div>
        
        <div style="padding: 24px;">
            <p style="margin-top: 0;">Dear <strong>{patient_name}</strong>,</p>
            <p>Your appointment with <strong>Dr. {doctor_name}</strong> at <strong>{hospital_name}</strong> has been updated.</p>

            <div style="background: #eff6ff; border-left: 4px solid #0284c7; padding: 14px 16px; margin: 18px 0; border-radius: 6px;">
                <p style="margin: 0; color: #1e40af; font-size: 14px;"><strong>Updated Schedule:</strong> {appointment.slot.date} at {new_time_str}</p>
                {f'<p style="margin: 4px 0 0; color: #64748b; font-size: 12px;">Previous time: {old_slot_info}</p>' if old_slot_info else ''}
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                <tr><td style="padding: 6px 0; color: #64748b;">Doctor:</td><td style="padding: 6px 0; font-weight: 600;">Dr. {doctor_name} ({specialization})</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Hospital:</td><td style="padding: 6px 0; font-weight: 600;">{hospital_name}</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Patient:</td><td style="padding: 6px 0; font-weight: 600;">{patient_name} ({appointment.patient_relation or 'Self'})</td></tr>
                <tr><td style="padding: 6px 0; color: #64748b;">Receipt ID:</td><td style="padding: 6px 0; font-weight: 600;">{appointment.receipt_id}</td></tr>
            </table>

            <p style="font-size: 13px; color: #64748b;">You can view and manage your appointment anytime on the <a href="http://localhost:5173/my-appointments" style="color: #0284c7; font-weight: 700;">Patient Dashboard</a>.</p>
            <p style="font-size: 13px; color: #64748b; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
                Warm regards,<br/>
                <strong>Administration & Care Team</strong><br/>
                {hospital_name}
            </p>
        </div>
    </div>
    """

    try:
        send_email(
            to_email=appointment.patient.email,
            subject=subject,
            html_content=html_content
        )
    except Exception as e:
        print(f"Failed to send admin reschedule email: {e}")


