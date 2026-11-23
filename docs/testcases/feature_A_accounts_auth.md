# Feature A: Accounts & Authentication — QA Test Cases Specification

**Document Path**: `/docs/testcases/feature_A_accounts_auth.md`  
**Target Module**: `backend/accounts/` & Frontend Auth Flow (`LoginPage.jsx`, `RegisterPage.jsx`, `VerifyOtpPage.jsx`, `AuthContext.jsx`, `api/client.js`)  
**Specification Level**: Pin-to-Pin Function-Wise Exhaustive QA Specification  

---

## 1. Verified Inventory & Code References (Feature A)

| Function / Endpoint / Component | Layer | File & Line Reference | Permission | Method / Trigger | Models / Entities Touched |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `generate_safe_username` | Backend Util | `accounts/views.py#L26-L37` | Internal | Helper function | `User` |
| `RegisterView` (`/api/accounts/register/`) | Backend API | `accounts/views.py#L40-L102` | `AllowAny` | `POST` | `User`, `OTP` |
| `VerifyOTPView` (`/api/accounts/verify-otp/`) | Backend API | `accounts/views.py#L105-L162` | `AllowAny` | `POST` | `User`, `OTP` |
| `ResendOTPView` (`/api/accounts/resend-otp/`) | Backend API | `accounts/views.py#L165-L188` | `AllowAny` | `POST` | `User`, `OTP` |
| `CancelRegistrationView` (`/api/accounts/cancel-registration/`) | Backend API | `accounts/views.py#L191-L208` | `AllowAny` | `POST` | `User`, `OTP` |
| `ForgotPasswordView` (`/api/accounts/forgot-password/`) | Backend API | `accounts/views.py#L211-L225` | `AllowAny` | `POST` | `User`, `OTP` |
| `ResetPasswordView` (`/api/accounts/reset-password/`) | Backend API | `accounts/views.py#L228-L260` | `AllowAny` | `POST` | `User`, `OTP` |
| `LoginView` (`/api/accounts/login/`) | Backend API | `accounts/views.py#L263-L368` | `AllowAny` | `POST` | `User`, `BlacklistedToken` |
| `LogoutView` (`/api/accounts/logout/`) | Backend API | `accounts/views.py#L371-L382` | `AllowAny` | `POST` | `OutstandingToken`, `BlacklistedToken` |
| `CurrentUserView` (`/api/accounts/me/`) | Backend API | `accounts/views.py#L385-L389` | `IsAuthenticated` | `GET` | `User` |
| `ProfileView` (`/api/accounts/profile/`) | Backend API | `accounts/views.py#L392-L408` | `IsAuthenticated` | `GET`, `PATCH` | `User` |
| `AdminPatientListView` (`/api/accounts/admin/patients/`) | Backend API | `accounts/views.py#L414-L428` | `IsHospitalOrAdminRole` | `GET` | `User` |
| `TokenRefreshView` (`/api/accounts/token/refresh/`) | Backend API | SimpleJWT (`accounts/urls.py#L21`) | `AllowAny` | `POST` | `OutstandingToken` |
| `FastCachedJWTAuthentication` | Backend Auth | `accounts/authentication.py#L5-L25` | Middleware / Auth | Request Handler | Django Cache (`LocMemCache`) |
| `send_otp_email` | Backend Util | `accounts/utils.py#L16-L65` | Internal | Thread Daemon | `OTP`, `Thread` |
| `send_email` | Backend Brevo | `accounts/brevo.py#L6-L49` | Internal | HTTP / SMTP | Brevo REST API / Django SMTP |
| `setup_hospital_accounts` | Management CLI| `accounts/management/commands/setup_hospital_accounts.py` | CLI / Root | Management Command | `Hospital`, `User`, `Doctor` |
| `User` model methods (`is_locked`, `remaining_lockout_seconds`) | Model Logic | `accounts/models.py#L39-L50` | Model | Python Method | `User` |
| `OTP` model methods (`is_expired`, `generate_code`) | Model Logic | `accounts/models.py#L65-L71` | Model | Python Method | `OTP` |
| `RegisterPage` | Frontend UI | `frontend/src/pages/RegisterPage.jsx#L1-L150` | Public | Component | Browser UI |
| `VerifyOtpPage` | Frontend UI | `frontend/src/pages/VerifyOtpPage.jsx#L1-L160` | Public | Component | Browser UI |
| `LoginPage` | Frontend UI | `frontend/src/pages/LoginPage.jsx#L1-L170` | Public | Component | Browser UI |
| `AuthContext` | Frontend State | `frontend/src/context/AuthContext.jsx#L1-L85` | Client-wide | React Context | `localStorage` |

---

## 2. Test Cases Specification (Pin-to-Pin)

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-ACC-001** | Patient registration happy path | Backend API | `accounts/views.py#L40` | Positive | `email`: "newpatient@test.com", `username`: "John Doe", `password`: "Secret1234!", `phone`: "+919876543210" | Send `POST /api/accounts/register/` | 201 Created; User created with `is_verified=False`; OTP row created in DB with `is_used=False`; email dispatched | Anonymous |
| **TC-ACC-002** | Registration missing mandatory fields | Backend API | `accounts/views.py#L47` | Negative | Missing `email` or `password` or `username` | Send `POST /api/accounts/register/` with empty values | 400 Bad Request; error message "Please fill in all required fields..." | Anonymous |
| **TC-ACC-003** | Registration with malformed email | Backend API | `accounts/views.py#L50` | Negative | `email`: "plainaddress", "missing@domain", "@nodomain.com" | Send `POST /api/accounts/register/` | 400 Bad Request; error "Please provide a valid email address..." | Anonymous |
| **TC-ACC-004** | Registration with short password boundary | Backend API | `accounts/views.py#L53` | Boundary | `password`: 7 chars ("Pass12!"), 8 chars ("Pass123!"), 128 chars | 7 chars returns 400 Bad Request; 8 and 128 chars accepted | Anonymous |
| **TC-ACC-005** | Registration with existing verified email | Backend API | `accounts/views.py#L65` | Negative | User with `email` exists and `is_verified=True` | Send `POST /api/accounts/register/` | 400 Bad Request; `already_registered=True`; suggests login | Anonymous |
| **TC-ACC-006** | Re-registration with unverified email | Backend API | `accounts/views.py#L71` | State/Seq | User exists with `is_verified=False` | Send `POST /api/accounts/register/` with updated password | 201 Created; updates user record and resets `otp_attempts=0`; generates fresh OTP | Anonymous |
| **TC-ACC-007** | Username generation collision handling | Backend Util | `accounts/views.py#L26` | State/Seq | "John Doe" registered twice with different emails | Call `generate_safe_username` sequentially | 1st returns "john_doe", 2nd returns "john_doe_<timestamp>" | System |
| **TC-ACC-008** | Verify OTP happy path | Backend API | `accounts/views.py#L105` | Positive | Unverified user, valid unused 6-digit OTP | Send `POST /api/accounts/verify-otp/` | 200 OK; `user.is_verified=True`; `otp.is_used=True`; `otp_attempts=0` | Anonymous |
| **TC-ACC-009** | Verify OTP incorrect code attempt 1 & 2 | Backend API | `accounts/views.py#L137` | Negative | Wrong code "000000" | Send `POST /api/accounts/verify-otp/` | 400 Bad Request; `remaining_attempts` decremented; `user.otp_attempts` increments | Anonymous |
| **TC-ACC-010** | Verify OTP 3rd failure triggers user rollback | Backend API | `accounts/views.py#L127` | State/Seq | User with `otp_attempts=2` enters wrong OTP 3rd time | Send `POST /api/accounts/verify-otp/` | 400 Bad Request; `rollback=True`; unverified `User` record completely deleted from DB | Anonymous |
| **TC-ACC-011** | Verify OTP on expired token (> 10 mins) | Backend API | `accounts/views.py#L132` | Boundary | OTP created 10m 01s ago | Send `POST /api/accounts/verify-otp/` | 400 Bad Request; `expired=True`; attempts decremented | Anonymous |
| **TC-ACC-012** | Verify OTP boundary: exactly 9m 59s | Backend API | `accounts/models.py#L65` | Boundary | OTP created 9m 59s ago | Send `POST /api/accounts/verify-otp/` with valid code | 200 OK; successfully verified before 10-minute expiry | Anonymous |
| **TC-ACC-013** | Verify OTP already verified account | Backend API | `accounts/views.py#L118` | State/Seq | User has `is_verified=True` | Send `POST /api/accounts/verify-otp/` | 200 OK message "Email is already verified..." | Anonymous |
| **TC-ACC-014** | Verify OTP on non-existent user | Backend API | `accounts/views.py#L112` | Negative | `email`: "unknown@test.com" | Send `POST /api/accounts/verify-otp/` | 404 Not Found; `not_found=True`, `rollback=True` | Anonymous |
| **TC-ACC-015** | Resend OTP resets attempts & invalidates old OTP | Backend API | `accounts/views.py#L165` | State/Seq | User has `otp_attempts=2`, old OTP unused | Send `POST /api/accounts/resend-otp/` | 200 OK; old OTP marked `is_used=True`; new OTP generated; `user.otp_attempts` reset to 0 | Anonymous |
| **TC-ACC-016** | Resend OTP non-existent email | Backend API | `accounts/views.py#L173` | Negative | `email`: "ghost@test.com" | Send `POST /api/accounts/resend-otp/` | 404 Not Found; `rollback=True` | Anonymous |
| **TC-ACC-017** | Cancel pending registration | Backend API | `accounts/views.py#L191` | Positive | Unverified user in DB | Send `POST /api/accounts/cancel-registration/` | 200 OK; `rollback=True`; unverified user deleted from DB | Anonymous |
| **TC-ACC-018** | Cancel registration for verified user rejected | Backend API | `accounts/views.py#L204` | Permission | Verified user (`is_verified=True`) | Send `POST /api/accounts/cancel-registration/` | 400 Bad Request; error "Cannot cancel an already verified active account" | Anonymous |
| **TC-ACC-019** | Forgot password dispatches reset OTP | Backend API | `accounts/views.py#L211` | Positive | Verified user with valid email | Send `POST /api/accounts/forgot-password/` | 200 OK; OTP created with `purpose='reset_password'`; email sent | Anonymous |
| **TC-ACC-020** | Forgot password non-existent email | Backend API | `accounts/views.py#L224` | Negative | Unregistered email | Send `POST /api/accounts/forgot-password/` | 404 Not Found; informative error message | Anonymous |
| **TC-ACC-021** | Reset password with valid OTP and new password | Backend API | `accounts/views.py#L228` | Positive | Active reset OTP; `new_password` 8+ chars | Send `POST /api/accounts/reset-password/` | 200 OK; password updated; `failed_login_attempts=0`; `lockout_until=None` | Anonymous |
| **TC-ACC-022** | Reset password with wrong or used OTP | Backend API | `accounts/views.py#L246` | Negative | Invalid OTP or `is_used=True` | Send `POST /api/accounts/reset-password/` | 400 Bad Request; error "Invalid verification code..." | Anonymous |
| **TC-ACC-023** | Reset password short password validation | Backend API | `accounts/views.py#L251` | Boundary | Valid OTP, but `new_password`: 7 chars | Send `POST /api/accounts/reset-password/` | 400 Bad Request; "Password must be at least 8 characters long" | Anonymous |
| **TC-ACC-024** | Login happy path (Patient) | Backend API | `accounts/views.py#L263` | Positive | Valid email & password; `is_verified=True` | Send `POST /api/accounts/login/` | 200 OK; returns `access`, `refresh` JWT tokens and `user` object | Patient |
| **TC-ACC-025** | Login via hospital slug / username | Backend API | `accounts/views.py#L278` | Positive | Staff user with `hospital_slug="apollo"` | Send `POST /api/accounts/login/` with `email="apollo"` | 200 OK; resolves hospital user and returns JWT | Hospital |
| **TC-ACC-026** | Login with unverified email blocked | Backend API | `accounts/views.py#L354` | State/Seq | Valid credentials, but `is_verified=False` | Send `POST /api/accounts/login/` | 403 Forbidden; `needs_verification=True`; fresh OTP auto-sent | Patient |
| **TC-ACC-027** | Login failed password attempts 1 & 2 | Backend API | `accounts/views.py#L340` | Negative | Valid email, wrong password | Send `POST /api/accounts/login/` | 401 Unauthorized; `remaining_attempts` returned (2, then 1) | Patient |
| **TC-ACC-028** | Login 3rd failure locks account for 5 minutes | Backend API | `accounts/views.py#L330` | State/Seq | 3 consecutive failed password attempts | Send `POST /api/accounts/login/` 3rd time | 429 Too Many Requests; `locked=True`; `remaining_seconds=300`; `lockout_until` set in DB | Patient |
| **TC-ACC-029** | Login attempt while account locked | Backend API | `accounts/views.py#L311` | Boundary | User has `lockout_until > now()` | Send `POST /api/accounts/login/` (even with correct password) | 429 Too Many Requests; request rejected immediately without DB password check | Patient |
| **TC-ACC-030** | Lockout expiration recovery: exactly 300s | Backend API | `accounts/views.py#L320` | Boundary | `lockout_until <= now()` | Send `POST /api/accounts/login/` with valid password | 200 OK; user granted access; `failed_login_attempts` reset to 0 | Patient |
| **TC-ACC-031** | Lockout recovery with wrong password | Backend API | `accounts/views.py#L320` | Negative | `lockout_until <= now()`; user types wrong password | Send `POST /api/accounts/login/` with wrong password | Immediate re-lockout: `failed_login_attempts` was set to 2, now becomes 3 -> locked again | Patient |
| **TC-ACC-032** | Forgot-password bypass of active lockout | Backend API | `accounts/views.py#L254` | State/Seq | Account locked (`lockout_until > now()`); patient resets password via OTP | Complete reset-password flow then call `login/` with new password | 200 OK; password reset clears `lockout_until` and `failed_login_attempts` | Patient |
| **TC-ACC-033** | FastCachedJWTAuthentication cache hit | Backend Auth | `accounts/authentication.py#L13` | Positive | Valid JWT token sent twice within 30s | Send two requests to `GET /api/accounts/me/` | 2nd request resolves user from `LocMemCache` (0 DB queries) | Patient |
| **TC-ACC-034** | FastCachedJWT: Deactivated user cached token | Backend Auth | `accounts/authentication.py#L15` | Security | User authenticated, token cached; Admin sets `user.is_active=False` in DB | Within 60s, user sends authenticated request with valid JWT | **Vulnerability**: `FastCachedJWTAuthentication` checks `getattr(cached_user, 'is_active', True)` on the *cached* instance, serving request until 60s cache TTL expires! | Deactivated User |
| **TC-ACC-035** | FastCachedJWT: Role change cached token | Backend Auth | `accounts/authentication.py#L15` | Security | Admin demotes `user.role='admin'` to `'patient'` | Within 60s, demoted user accesses `/api/doctors/admin/` | **Vulnerability**: User retains admin access for up to 60s because cached User object holds old role | Demoted User |
| **TC-ACC-036** | JWT Token Refresh happy path | Backend API | `accounts/urls.py#L21` | Positive | Valid unexpired `refresh` token | Send `POST /api/accounts/token/refresh/` | 200 OK; returns new `access` token | Authenticated |
| **TC-ACC-037** | JWT Token Refresh with blacklisted / expired token | Backend API | `accounts/urls.py#L21` | State/Seq | Used refresh token (after rotation) or expired token | Send `POST /api/accounts/token/refresh/` | 401 Unauthorized; token is blacklisted | Client SPA |
| **TC-ACC-038** | User Logout blacklists refresh token | Backend API | `accounts/views.py#L371` | Positive | Active `refresh` token passed in request body | Send `POST /api/accounts/logout/` | 200 OK; refresh token added to `BlacklistedToken`; subsequent refresh calls fail | Authenticated |
| **TC-ACC-039** | Current user profile (`/api/accounts/me/`) | Backend API | `accounts/views.py#L385` | Positive | Valid JWT Bearer token in headers | Send `GET /api/accounts/me/` | 200 OK; returns serialized user profile with `total_bookings` | Patient |
| **TC-ACC-040** | Current user without auth token | Backend API | `accounts/views.py#L385` | Permission | Request sent without `Authorization` header | Send `GET /api/accounts/me/` | 401 Unauthorized; `Authentication credentials were not provided` | Anonymous |
| **TC-ACC-041** | Update profile fields (phone, gender, birthday, address) | Backend API | `accounts/views.py#L398` | Positive | Valid profile payload | Send `PATCH /api/accounts/profile/` | 200 OK; profile updated in DB; returns updated user | Patient |
| **TC-ACC-042** | Update profile image upload | Backend API | `accounts/views.py#L393` | Positive | Multipart form upload with image file (< 10MB) | Send `PATCH /api/accounts/profile/` with `profile_image` | 200 OK; saves file to Cloudinary / storage; `profile_image_url` populated | Patient |
| **TC-ACC-043** | Profile update cannot tamper with role or hospital | Backend API | `accounts/serializers.py#L63` | Security | Request payload includes `role="admin"` or `hospital_slug="hack"` | Send `PATCH /api/accounts/profile/` | 200 OK; but `role` and `hospital_slug` remain unchanged (read-only fields) | Patient |
| **TC-ACC-044** | Admin patient list accessed by Admin | Backend API | `accounts/views.py#L414` | Positive | Admin JWT token | Send `GET /api/accounts/admin/patients/` | 200 OK; paginated list of registered patients | Admin |
| **TC-ACC-045** | Admin patient list accessed by Hospital Staff | Backend API | `accounts/views.py#L414` | Positive | Hospital staff JWT token (`IsHospitalOrAdminRole`) | Send `GET /api/accounts/admin/patients/` | 200 OK; access granted to hospital manager | Hospital |
| **TC-ACC-046** | Admin patient list accessed by Patient | Backend API | `accounts/views.py#L414` | Permission | Regular Patient JWT token | Send `GET /api/accounts/admin/patients/` | 403 Forbidden; "You do not have permission to perform this action." | Patient |
| **TC-ACC-047** | Admin patient list unauthenticated | Backend API | `accounts/views.py#L414` | Permission | No auth token | Send `GET /api/accounts/admin/patients/` | 401 Unauthorized | Anonymous |
| **TC-ACC-048** | Brevo email background thread failure handling | Backend Util | `accounts/utils.py#L9` | Dependency | Brevo API key invalid or network unreachable | Trigger registration / OTP dispatch | System does not crash; exception logged in `_async_send_email_task`; HTTP 201 still returns | System |
| **TC-ACC-049** | Daemon thread email loss on process termination | Backend Util | `accounts/utils.py#L58` | Dependency | Registration creates daemon thread, process killed immediately | Trigger registration under sudden container stop | Daemon thread terminated without delivery; OTP exists in DB but user never receives email | System |
| **TC-ACC-050** | `setup_hospital_accounts` default credentials strength | Management CLI| `setup_hospital_accounts.py#L19` | Security | Run `setup_hospital_accounts` management command | Inspect created staff users | Default password is predictable `"hospital@123"`; flagged as security risk | Admin CLI |
| **TC-ACC-051** | `setup_hospital_accounts` re-run password reset | Management CLI| `setup_hospital_accounts.py#L78` | State/Seq | Hospital manager changes password; Admin re-runs command | CLI command executed on production server | **Risk**: `user.set_password(default_password)` unconditionally overwrites manager's password! | Admin CLI |
| **TC-ACC-052** | Frontend Login: Lockout countdown timer render | Frontend UI | `LoginPage.jsx#L24` | UI | API returns HTTP 429 with `remaining_seconds=300` | Inspect LoginPage DOM | Lockout alert rendered; countdown timer decrements every second; submit button disabled | Public / Patient |
| **TC-ACC-053** | Frontend Verify OTP: 6-box auto-focus & paste | Frontend UI | `VerifyOtpPage.jsx#L34` | UI | User pastes 6-digit code "123456" into 1st box | Paste clipboard data | Digits distributed across all 6 input boxes; auto-submits form | Public / Patient |
| **TC-ACC-054** | Frontend Verify OTP: 30-second resend countdown | Frontend UI | `VerifyOtpPage.jsx#L43` | UI | VerifyOtpPage mounted | Observe "Resend Code" button | Button disabled with countdown `30s...0s`; unlocks when 0 reached | Public / Patient |
| **TC-ACC-055** | Frontend Verify OTP: Rollback navigation | Frontend UI | `VerifyOtpPage.jsx#L71` | UI | 3rd failed OTP returns `rollback=True` | Submit 3rd wrong OTP | Red alert displayed; unverified session cleared; redirects to `/register` after timeout | Public / Patient |
| **TC-ACC-056** | Frontend Axios Interceptor: 401 Token Refresh | Frontend API | `api/client.js#L26` | State/Seq | Access token expires (401); valid `refresh_token` in `localStorage` | Any protected API call triggered | Axios intercepts 401, calls `/accounts/token/refresh/`, updates token, and replays request | Authenticated |
| **TC-ACC-057** | Frontend Axios Interceptor: Refresh failure redirect | Frontend API | `api/client.js#L40` | State/Seq | Both access and refresh tokens expired | API call returns 401, refresh also returns 401 | `localStorage` cleared (`access_token`, `refresh_token`, `user`); redirects to `/login` | Expired User |

---

## 3. Suspected Bugs & Security Risks in Feature A (Accounts & Auth)

During code inspection of `accounts/`, the following **5 security and implementation issues** were identified:

### 1. `FastCachedJWTAuthentication` Stale User & Role Desynchronization
- **File & Line**: `backend/accounts/authentication.py#L13-L25`
- **Issue**: Authenticated `User` objects are stored in cache for 60 seconds (`cache.set(f"jwt_user_inst_{user_id}", user, timeout=60)`).
- **Security Impact**:
  - If a user is deactivated (`is_active = False`) by an admin, the cached user in memory is still returned because `cached_user.is_active` on the frozen cached object remains `True`.
  - If an admin demotes a user from `admin` to `patient`, the cached instance retains `role = 'admin'` for up to 60 seconds, granting unauthorized access to admin endpoints.
  - In a multi-worker environment (Gunicorn with multiple workers using default local-memory cache `LocMemCache`), cache invalidation is process-isolated and non-shared.

### 2. `setup_hospital_accounts` Unconditionally Resets Hospital Passwords on Re-run
- **File & Line**: `backend/accounts/management/commands/setup_hospital_accounts.py#L78-L80`
- **Code**:
  ```python
  user.set_password(default_password)  # default_password = "hospital@123"
  user.save()
  ```
- **Operational Impact**: Whenever an admin or deployment pipeline runs `setup_hospital_accounts`, all existing hospital managers who configured their own secure passwords have their passwords silently reverted back to `"hospital@123"`.

### 3. Weak Default Password in Provisioning Command
- **File & Line**: `backend/accounts/management/commands/setup_hospital_accounts.py#L19`
- **Issue**: Hardcoded default password `"hospital@123"` is provisioned across all hospitals without enforcing a mandatory password change on first login.

### 4. Daemon Thread Email Loss on Worker Termination
- **File & Line**: `backend/accounts/utils.py#L58-L64`
- **Code**:
  ```python
  email_thread = threading.Thread(
      target=_async_send_email_task,
      args=(user.email, subject, html_content),
      daemon=True
  )
  email_thread.start()
  ```
- **Reliability Impact**: Marking email threads as `daemon=True` causes Python to immediately terminate them without waiting if the main process/worker recycles or exits (e.g., Gunicorn worker restart or autoscaling scale-down). Transactional OTP emails will be silently dropped.

### 5. No Rate Limiting / Throttling on Public Auth Endpoints
- **File & Line**: `backend/config/settings.py#L193-L198` & `backend/accounts/views.py`
- **Issue**: Neither `DEFAULT_THROTTLE_CLASSES` nor `DEFAULT_THROTTLE_RATES` is configured in `settings.REST_FRAMEWORK`. While `LoginView` has an application-level 3-attempt counter, endpoints like `/api/accounts/register/`, `/api/accounts/resend-otp/`, and `/api/accounts/forgot-password/` have no rate limits and can be spammed to flood Brevo SMTP quotas or conduct email-bombing attacks.

---

## Confirmation Before Proceeding to Feature C (Payments)

Feature A test cases and security risk analysis have been saved to `/docs/testcases/feature_A_accounts_auth.md`.

Per your instructions, the next batch in order is **Feature C: Payments and Coupons** (Razorpay order creation, signature verification, webhook analysis, failed payments, ledger, dynamic pricing, and coupon stacking).

**Please confirm if you are ready for Feature C.**
