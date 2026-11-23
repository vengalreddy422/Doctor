# CareConnect Production Deployment & Security Checklist

This document details all deployment steps, database migrations, third-party webhook configurations, cache settings, and security actions required to deploy the latest CareConnect enhancements to staging and production environments.

---

## 1. Environment Variables Configuration

Set these environment variables in your deployment platform (e.g., Render, Railway, AWS ECS, or Docker Compose):

| Variable | Description | Source / Dashboard | Production Recommendation |
| :--- | :--- | :--- | :--- |
| `DATABASE_URL` | Neon PostgreSQL connection string | Neon Console | `postgresql://user:pass@ep-xyz.aws.neon.tech/careconnect?sslmode=require` |
| `SECRET_KEY` | Django cryptographic secret | Django Key Generator | 50+ char random string, never committed to git |
| `DEBUG` | Django debug flag | System config | `False` |
| `ALLOWED_HOSTS` | Allowed domain names | Domain registrar | `api.careconnect.health,careconnect.health` |
| `CORS_ALLOWED_ORIGINS` | Permitted frontend origins | Frontend host | `https://careconnect.health,https://admin.careconnect.health` |
| `RAZORPAY_KEY_ID` | Razorpay API Key ID | Razorpay Dashboard -> API Keys | `rzp_live_...` |
| `RAZORPAY_KEY_SECRET` | Razorpay API Secret | Razorpay Dashboard -> API Keys | Live secret string |
| `RAZORPAY_WEBHOOK_SECRET` | Secret for verifying webhook HMAC | Razorpay Dashboard -> Webhooks | Dedicated 32+ character webhook secret |
| `BREVO_API_KEY` | Brevo Transactional SMTP API Key | Brevo Dashboard -> SMTP & API Keys | `xkeysib-...` |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary storage bucket | Cloudinary Console | Production cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API Key | Cloudinary Console | Production API Key |
| `CLOUDINARY_API_SECRET` | Cloudinary API Secret | Cloudinary Console | Production API Secret |
| `REDIS_URL` | Redis instance URL for cache/throttling | Upstash / Redis Cloud | `redis://default:pass@redis-host:6379/0` |

---

## 2. Database Migrations Execution Order

Run database migrations against the production PostgreSQL instance before restarting application workers:

```bash
python manage.py migrate
```

### Applied Migrations Summary:
1. **`accounts.0005_user_must_change_password`**:
   - Adds boolean field `must_change_password` to `User` (defaults to `False`).
   - Ensures hospital staff accounts seeded via management command are forced to set their own password upon first login.
2. **`payments.0003_payment_razorpay_refund_id`**:
   - Adds `razorpay_refund_id` (CharField) to `Payment` model.
3. **`payments.0004_payment_updated_at`**:
   - Adds `updated_at` (DateTimeField auto_now=True) to `Payment` model, fixing the crash in `CancelAppointmentView`.
4. **`payments.0005_payment_refund_status`**:
   - Adds `refund_status` (pending, processed, failed) and `refund_error` (TextField) to `Payment` for transaction idempotency and gateway audit logs.
5. **`appointments.0011_couponusage`**:
   - Adds `CouponUsage` model with unique constraint `(coupon, patient)` to prevent repeat redemptions of milestone loyalty coupons across sessions.

---

## 3. Razorpay Webhook Configuration

To prevent appointments from remaining stuck in `pending` if patients close the browser window or experience network disconnection before the frontend redirect:

1. Log in to the **Razorpay Dashboard**:
   - Navigate to **Settings** -> **Webhooks**.
   - Click **Add New Webhook**.
2. **Webhook URL**:
   ```
   https://api.careconnect.health/api/payments/webhook/
   ```
3. **Secret**:
   - Generate a strong secret (or copy from password manager).
   - Add this value to environment variable: `RAZORPAY_WEBHOOK_SECRET`.
4. **Active Events to Subscribe**:
   - [x] `payment.captured` *(Triggers booking status transition `pending` -> `confirmed` and dispatches booking confirmation email)*
   - [x] `payment.failed` *(Records payment failure state on the ledger)*
   - [x] `refund.processed` *(Syncs asynchronous refund confirmations from banking partner gateways)*
5. **Alert Email**:
   - Configure alerts to: `devops@careconnect.health`.

---

## 4. Production Cache Backend Recommendation (Throttling & Concurrency)

In `config/settings.py`, the default cache is configured as `LocMemCache`. While suitable for single-process local development, **multi-worker production deployments (e.g. Gunicorn / Uvicorn with 4+ workers) must use Redis**.

### Why Redis is Required:
- **Rate Limiting / Throttling**: DRF throttles (`anon`, `user`, `auth_register`, `auth_otp`, `auth_login`) store hit counters in the cache. With `LocMemCache`, each Gunicorn worker maintains separate memory, allowing attackers to multiply allowable request limits by the number of workers.
- **FastCachedJWTAuthentication**: Blacklist and user authentication token caches must be synchronized across all processes.

### Production Redis Configuration snippet (`backend/config/settings.py`):
```python
if os.environ.get('REDIS_URL'):
    CACHES = {
        "default": {
            "BACKEND": "django_redis.cache.RedisCache",
            "LOCATION": os.environ.get('REDIS_URL'),
            "OPTIONS": {
                "CLIENT_CLASS": "django_redis.client.DefaultClient",
                "CONNECTION_POOL_KWARGS": {"max_connections": 50},
            }
        }
    }
```

---

## 5. Existing Hospital Accounts: One-Time Password Reset Script

The management command `setup_hospital_accounts` has been updated to never overwrite existing hospital passwords and set `must_change_password=True` on creation.

For existing hospital staff accounts previously generated with default hardcoded passwords, execute the one-time remediation script via Django shell:

```bash
python manage.py shell
```

```python
from accounts.models import User

# Flag all existing hospital staff accounts to force a secure password change on their next login
hospitals = User.objects.filter(role='hospital')
count = 0
for h in hospitals:
    h.must_change_password = True
    h.save(update_fields=['must_change_password'])
    count += 1

print(f"Successfully flagged {count} hospital staff accounts for mandatory password update.")
```

When hospital staff log in, `/api/auth/login/` returns `must_change_password: true`. The frontend immediately directs them to the Change Password screen before permitting access to hospital queue management.

---

## 6. Pre-Flight Verification Commands

Before opening traffic to users:
```bash
# 1. Run full test suite with test database
$env:ENV_FILE = '.env.test'; python manage.py test accounts payments appointments doctors

# 2. Check for missing migrations
python manage.py makemigrations --check --dry-run

# 3. Verify static assets collection
python manage.py collectstatic --noinput

# 4. Probe system health endpoint
curl -s https://api.careconnect.health/api/health/
```
