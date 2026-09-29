import requests
from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def send_email(to_email, subject, html_content):
    """
    Deliver transactional email using Brevo REST API (preferred for instant delivery),
    with automatic fallback to Django standard email backend.
    """
    brevo_api_key = getattr(settings, 'BREVO_API_KEY', '').strip('"\'')

    if brevo_api_key:
        try:
            url = "https://api.brevo.com/v3/smtp/email"
            headers = {
                "api-key": brevo_api_key,
                "Content-Type": "application/json",
                "Accept": "application/json"
            }
            payload = {
                "sender": {
                    "name": "MediConnect",
                    "email": "vengalreddy2005@gmail.com"
                },
                "to": [{"email": to_email}],
                "subject": subject,
                "htmlContent": html_content
            }
            response = requests.post(url, json=payload, headers=headers, timeout=10)
            if response.status_code in (200, 201, 202):
                data = response.json()
                print(f"[+] Brevo REST API: Email sent to {to_email} (Message ID: {data.get('messageId')})")
                return True
            else:
                print(f"[-] Brevo API returned {response.status_code}: {response.text}")
        except Exception as e:
            print(f"[-] Brevo API error: {e}, falling back to SMTP...")

    # Fallback to Django SMTP backend
    msg = EmailMultiAlternatives(
        subject=subject,
        body="",
        from_email=settings.DEFAULT_FROM_EMAIL,
        to=[to_email],
    )
    msg.attach_alternative(html_content, "text/html")
    msg.send()
    return True