import threading
import traceback
from .brevo import send_email
from django.conf import settings
from .models import OTP


def _async_send_email_task(to_email, subject, html_content):
    try:
        send_email(to_email=to_email, subject=subject, html_content=html_content)
        print(f"[+] EMAIL SENT SUCCESSFULLY TO {to_email}")
    except Exception as e:
        print(f"[-] EMAIL DELIVERY FAILED FOR {to_email}: {e}")
        traceback.print_exc()


def send_otp_email(user, purpose='verify_email'):
    OTP.objects.filter(
        user=user,
        purpose=purpose,
        is_used=False
    ).update(is_used=True)

    otp = OTP.objects.create(
        user=user,
        code=OTP.generate_code(),
        purpose=purpose
    )

    subject = (
        "Your MediConnect password reset code"
        if purpose == "reset_password"
        else "Your MediConnect verification code"
    )

    message = f"Your OTP code is {otp.code}. It expires in 10 minutes."

    # Print OTP prominently in terminal for easy local testing & debugging
    print("\n" + "="*50)
    print(f"[*] [OTP NOTIFICATION]")
    print(f"    Recipient : {user.email}")
    print(f"    Purpose   : {purpose}")
    print(f"    OTP Code  : {otp.code}")
    print(f"    Expiry    : 10 minutes")
    print("="*50 + "\n")

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2563eb;">MediConnect</h2>
        <p style="font-size: 16px; color: #333;">{message}</p>
        <div style="background: #f3f4f6; padding: 15px; text-align: center; border-radius: 6px; font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1e40af;">
            {otp.code}
        </div>
        <p style="font-size: 13px; color: #6b7280; margin-top: 15px;">This OTP expires in <b>10 minutes</b>. If you did not request this code, please ignore this email.</p>
    </div>
    """

    # Dispatch email asynchronously in a daemon thread so registration/login responds instantly (< 150ms)
    email_thread = threading.Thread(
        target=_async_send_email_task,
        args=(user.email, subject, html_content),
        daemon=True
    )
    email_thread.start()

    return otp