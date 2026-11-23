# Feature C: Payments, Refunds & Coupons — QA Test Cases Specification

**Document Path**: `/docs/testcases/feature_C_payments_coupons.md`  
**Target Modules**: `backend/payments/`, `backend/appointments/services.py`, `backend/appointments/models.py` (Refunds & Coupons), Frontend Payment Integrations (`DoctorDetailPage.jsx`, `PaymentHistoryPage.jsx`, `InvoiceModal.jsx`, `api/client.js`)  
**Specification Level**: Pin-to-Pin Function-Wise Exhaustive QA Specification  

---

## 1. Verified Inventory & Code References (Feature C)

| Function / Endpoint / Component | Layer | File & Line Reference | Permission | Method / Trigger | Models / Entities Touched |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `calculate_fee` | Backend Engine | `appointments/services.py#L24-L52` | Internal | Helper Function | `Appointment`, `User`, `Doctor` |
| `Coupon.calculate_discount` | Model Logic | `appointments/models.py#L305-L318` | Internal | Model Method | `Coupon` |
| `AvailableCouponsView` (`/api/appointments/coupons/`) | Backend API | `appointments/views.py#L52-L142` | `IsAuthenticated` | `GET` | `Coupon`, `Appointment`, `Doctor` |
| `ValidateCouponView` (`/api/appointments/coupons/validate/`) | Backend API | `appointments/views.py#L145-L189` | `IsAuthenticated` | `POST` | `Coupon`, `Appointment`, `Doctor` |
| `CreateOrderView` (`/api/payments/create-order/<id>/`) | Backend API | `payments/views.py#L19-L56` | `IsAuthenticated` | `POST` | `Payment`, `Appointment`, Razorpay API |
| `VerifyPaymentView` (`/api/payments/verify/`) | Backend API | `payments/views.py#L58-L99` | `IsAuthenticated` | `POST` | `Payment`, `Appointment`, Cache |
| `RazorpayWebhookView` (`/api/payments/webhook/`) | Backend API | `payments/views.py#L128-L207` | `AllowAny` (HMAC Signed) | `POST` | `Payment`, `Appointment`, Cache |
| `MyPaymentHistoryView` (`/api/payments/history/`) | Backend API | `payments/views.py#L101-L126` | `IsAuthenticated` | `GET` | `Payment`, `Appointment` |
| `Appointment.calculate_cancellation_refund` | Model Logic | `appointments/models.py#L218-L260` | Internal | Model Method | `Appointment`, `Slot` |
| `CancelAppointmentView` (`/api/appointments/<id>/cancel/`) | Backend API | `appointments/views.py#L358-L438` | `IsAuthenticated` | `POST` | `Appointment`, `Payment`, Razorpay Refund API |
| `send_payment_confirmation` | Notification | `appointments/notifications.py#L15-L60` | Internal | Background Thread | `Appointment`, Brevo SMTP |
| `PaymentHistoryPage` | Frontend UI | `frontend/src/pages/PaymentHistoryPage.jsx#L1-L150` | `ProtectedRoute` | Component | Browser DOM |
| `InvoiceModal` | Frontend UI | `frontend/src/components/InvoiceModal.jsx#L1-L220` | `ProtectedRoute` | Modal Component | Window Print / PDF |

---

## 2. Test Cases Specification (Pin-to-Pin)

### 2.1 Dynamic Fee Calculation (`calculate_fee`)

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-001** | First booking dynamic surge pricing (+5%) | Backend Engine | `appointments/services.py#L46` | Positive | Patient with 0 previous non-cancelled bookings. Doctor fee: ₹500.00 | Call `calculate_fee(patient, doctor)` | Returns ₹525.00 (+5% surcharge on booking #1); rounded to 2 decimal places | Patient |
| **TC-PAY-002** | Second booking loyalty discount (-5%) | Backend Engine | `appointments/services.py#L50` | Positive | Patient with 1 active/confirmed booking. Doctor fee: ₹500.00 | Call `calculate_fee(patient, doctor)` | Returns ₹475.00 (-5% discount on booking #2); rounded to 2 decimal places | Patient |
| **TC-PAY-003** | Third booking dynamic surge (+5%) | Backend Engine | `appointments/services.py#L46` | Positive | Patient with 2 active/confirmed bookings. Doctor fee: ₹1000.00 | Call `calculate_fee(patient, doctor)` | Returns ₹1050.00 (+5% surcharge on booking #3) | Patient |
| **TC-PAY-004** | Cancelled/expired appointments excluded from count | Backend Engine | `appointments/services.py#L39` | State/Seq | Patient has 2 cancelled appointments, 0 confirmed appointments | Call `calculate_fee(patient, doctor)` | Treated as booking #1; returns +5% fee (₹525.00), not booking #3 | Patient |
| **TC-PAY-005** | Rescheduled appointment count exclusion | Backend Engine | `appointments/services.py#L39` | State/Seq | Patient has 1 rescheduled appointment record in DB | Call `calculate_fee(patient, doctor)` | Rescheduled appointment excluded from previous count; returns correct alternating index | Patient |
| **TC-PAY-006** | Boundary: Free doctor consultation (₹0.00) | Backend Engine | `appointments/services.py#L47` | Boundary | Doctor with `fee=0.00` | Call `calculate_fee(patient, doctor)` | Returns ₹0.00 for both odd and even booking numbers; no divide-by-zero or negative fees | Patient |
| **TC-PAY-007** | Boundary: High fee with fractional paise rounding | Backend Engine | `appointments/services.py#L47` | Boundary | Doctor fee: ₹333.33 | Call `calculate_fee(patient, doctor)` | Odd: 333.33 * 1.05 = 350.00 (quantized to Decimal('0.01')); Even: 333.33 * 0.95 = 316.66 | Patient |

---

### 2.2 Coupon Validation & Milestone Offers

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-008** | Available coupons listing returns eligible discounts | Backend API | `appointments/views.py#L52` | Positive | Authenticated patient with 0 bookings | Send `GET /api/appointments/coupons/` | 200 OK; lists `FIRSTCARE` (20% off) as `eligible=True`, milestone coupons as locked | Patient |
| **TC-PAY-009** | First booking coupon (`FIRSTCARE`) valid on 1st booking | Backend API | `appointments/views.py#L162` | Positive | Patient with 0 bookings, doctor fee ₹500 | Send `POST /api/appointments/coupons/validate/` with `code="FIRSTCARE"` | 200 OK; `valid=True`; discount: ₹105.00 (20% of ₹525); `final_fee`: ₹420.00 | Patient |
| **TC-PAY-010** | First booking coupon rejected on 2nd booking | Backend API | `appointments/views.py#L163` | State/Seq | Patient has 1 completed booking | Send `POST /api/appointments/coupons/validate/` with `code="FIRSTCARE"` | 400 Bad Request; error "This coupon is only valid for your very 1st booking." | Patient |
| **TC-PAY-011** | Milestone coupon (`MILESTONE5`) locked before 5 bookings | Backend API | `appointments/views.py#L164` | State/Seq | Patient has 3 completed bookings (`required_bookings=5`) | Send `POST /api/appointments/coupons/validate/` with `code="MILESTONE5"` | 400 Bad Request; error "This coupon unlocks at 5 bookings. You have 3 (2 more needed)." | Patient |
| **TC-PAY-012** | Milestone coupon (`MILESTONE5`) unlocks on exactly 5th booking | Backend API | `appointments/views.py#L164` | Boundary | Patient has 5 completed bookings | Send `POST /api/appointments/coupons/validate/` with `code="MILESTONE5"` | 200 OK; `valid=True`; discount applied successfully | Patient |
| **TC-PAY-013** | Percentage coupon discount cap enforcement (`max_discount`) | Model Logic | `appointments/models.py#L313` | Boundary | Coupon with 50% discount, `max_discount=200.00`. Doctor fee ₹1000.00 | Call `coupon.calculate_discount(Decimal('1000.00'))` | Returns capped discount of ₹200.00 (not 500.00) | Patient |
| **TC-PAY-014** | Flat discount exceeding total fee capped at 0 | Model Logic | `appointments/models.py#L318` | Boundary | Coupon with flat ₹500.00 off. Doctor fee ₹300.00 | Call `coupon.calculate_discount(Decimal('300.00'))` | Returns ₹300.00; `final_fee` computed as `max(0, 300 - 300) = ₹0.00`; never negative | Patient |
| **TC-PAY-015** | Inactive coupon code rejected | Backend API | `appointments/views.py#L156` | Negative | Coupon exists in DB with `is_active=False` | Send `POST /api/appointments/coupons/validate/` | 400 Bad Request; "Invalid or inactive coupon code" | Patient |
| **TC-PAY-016** | Non-existent coupon code rejected | Backend API | `appointments/views.py#L156` | Negative | `code="BOGUSCODE999"` | Send `POST /api/appointments/coupons/validate/` | 400 Bad Request; "Invalid or inactive coupon code" | Patient |
| **TC-PAY-017** | Case-insensitivity and whitespace trimming on coupon input | Backend API | `appointments/views.py#L149` | Boundary | `code="  firstcare  "` | Send `POST /api/appointments/coupons/validate/` | 200 OK; input stripped and uppercased to `FIRSTCARE` | Patient |
| **TC-PAY-018** | Stacking prevention: single coupon per appointment | Backend API | `appointments/views.py#L195` | State/Seq | Booking request sends array or second coupon | Send `POST /api/appointments/book/` | Serializer only accepts single string `coupon_code`; multiple coupons rejected | Patient |

---

### 2.3 Razorpay Order Creation (`CreateOrderView`)

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-019** | Razorpay order creation happy path | Backend API | `payments/views.py#L19` | Positive | Patient has pending appointment #123 (`fee_charged=525.00`) | Send `POST /api/payments/create-order/123/` | 200 OK; returns `order_id` ("order_..."), `amount`: 52500 (in paise), `currency`: "INR", `key`; `Payment` record created with status `'created'` | Patient |
| **TC-PAY-020** | Order creation for non-existent appointment | Backend API | `payments/views.py#L26` | Negative | `appointment_id=999999` | Send `POST /api/payments/create-order/999999/` | 404 Not Found; error "Appointment not found" | Patient |
| **TC-PAY-021** | IDOR: Patient A attempts order creation for Patient B's appointment | Backend API | `payments/views.py#L25` | Permission | Appointment #456 belongs to Patient B; Patient A requests order | Send `POST /api/payments/create-order/456/` as Patient A | 404 Not Found (filtered by `patient=request.user`); Patient A cannot access Patient B's billing | Patient A |
| **TC-PAY-022** | Unauthenticated order creation rejected | Backend API | `payments/views.py#L21` | Permission | Anonymous request without JWT | Send `POST /api/payments/create-order/123/` | 401 Unauthorized | Anonymous |
| **TC-PAY-023** | Prevent duplicate order creation on already paid appointment | Backend API | `payments/views.py#L29` | State/Seq | Appointment already has associated payment with status `'paid'` | Send `POST /api/payments/create-order/123/` | 400 Bad Request; error "Already paid" | Patient |
| **TC-PAY-024** | Gateway downtime / Razorpay API failure simulation | Backend API | `payments/views.py#L34` | Failure/Dep | Mock `client.order.create` raises `razorpay.errors.ServerError` | Send `POST /api/payments/create-order/123/` | 500 or handled gateway error; no corrupted `Payment` row created | Patient |
| **TC-PAY-025** | Idempotent order re-initiation on unpaid appointment | Backend API | `payments/views.py#L40` | State/Seq | Appointment previously had an order created but user re-opened modal | Send `POST /api/payments/create-order/123/` again | 200 OK; `Payment.objects.update_or_create` safely updates existing payment row with fresh `order_id` | Patient |

---

### 2.4 Payment Verification (`VerifyPaymentView`)

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-026** | Payment verification happy path with valid HMAC signature | Backend API | `payments/views.py#L58` | Positive | Real/Mocked valid Razorpay signature for `order_id` + `payment_id` | Send `POST /api/payments/verify/` | 200 OK; `payment.status` becomes `'paid'`; `appointment.status` becomes `'confirmed'`; email confirmation triggered | Patient |
| **TC-PAY-027** | Payment verification with forged/tampered signature | Backend API | `payments/views.py#L78` | Negative | `razorpay_signature="bad_forged_hash_value"` | Send `POST /api/payments/verify/` | 400 Bad Request; "Payment verification failed"; `payment.status` marked `'failed'`; appointment remains unconfirmed | Patient |
| **TC-PAY-028** | Missing signature or payment_id in verification payload | Backend API | `payments/views.py#L64` | Negative | Payload missing `razorpay_signature` field | Send `POST /api/payments/verify/` | 400 Bad Request; serializer validation error | Patient |
| **TC-PAY-029** | Verification against mismatched order_id | Backend API | `payments/views.py#L68` | Negative | Valid signature for Order X, but sent with Order Y in payload | Send `POST /api/payments/verify/` | 400 Bad Request; signature mismatch detected | Patient |
| **TC-PAY-030** | IDOR: Patient A attempts verification on Patient B's payment record | Backend API | `payments/views.py#L68` | Permission | Order belongs to Patient B; Patient A submits verification token | Send `POST /api/payments/verify/` as Patient A | 404 Not Found (filtered by `patient=request.user`) | Patient A |
| **TC-PAY-031** | Verification invalidates slot and dashboard caches | Backend API | `payments/views.py#L92` | State/Seq | Payment verified successfully | Check Django `cache` | Cache cleared so Admin and Hospital slot capacity monitors reflect `1/5` booked count immediately | System |
| **TC-PAY-032** | Double verification idempotency (repeated call) | Backend API | `payments/views.py#L85` | State/Seq | User double-clicks or client retries verification after success | Send `POST /api/payments/verify/` a second time | 200 OK; returns success without duplicate appointment creation or duplicate email triggers | Patient |

---

### 2.5 Razorpay Webhooks (`RazorpayWebhookView`)

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-033** | Webhook: `payment.captured` confirmation when user closed browser | Backend API | `payments/views.py#L153` | Positive | Appointment pending; valid `X-Razorpay-Signature` with `payment.captured` event | Send `POST /api/payments/webhook/` | 200 OK; `payment.status='paid'`; `appointment.status='confirmed'`; confirmation email sent | Razorpay / System |
| **TC-PAY-034** | Webhook: Missing `X-Razorpay-Signature` header rejected | Backend API | `payments/views.py#L134` | Permission | Webhook POST without `X-Razorpay-Signature` header | Send `POST /api/payments/webhook/` | 400 Bad Request; "Missing webhook signature" | Anonymous |
| **TC-PAY-035** | Webhook: Invalid / tampered HMAC signature rejected | Backend API | `payments/views.py#L142` | Negative | Webhook POST with invalid signature header | Send `POST /api/payments/webhook/` | 400 Bad Request; "Invalid webhook signature"; event rejected | Anonymous |
| **TC-PAY-036** | Webhook: Idempotent handling of duplicate `payment.captured` event | Backend API | `payments/views.py#L162` | State/Seq | Payment and appointment already confirmed | Send identical `payment.captured` webhook again | 200 OK with `status: "already_processed"`; no duplicate emails or DB updates | Razorpay / System |
| **TC-PAY-037** | Webhook: `payment.failed` event handling | Backend API | `payments/views.py#L182` | State/Seq | Valid webhook for `payment.failed` event | Send `POST /api/payments/webhook/` | 200 OK; `payment.status` updated to `'failed'`; appointment remains pending or marked cancelled | Razorpay / System |
| **TC-PAY-038** | Webhook: `refund.processed` event handling | Backend API | `payments/views.py#L193` | State/Seq | Valid webhook for `refund.processed` event with `payment_id` and `refund_id` | Send `POST /api/payments/webhook/` | 200 OK; `payment.status` updated to `'refunded'`; `razorpay_refund_id` stored | Razorpay / System |
| **TC-PAY-039** | Webhook: Malformed non-JSON payload rejected | Backend API | `payments/views.py#L146` | Negative | Raw string or broken JSON body | Send `POST /api/payments/webhook/` | 400 Bad Request; "Invalid JSON body" | Razorpay / System |

---

### 2.6 RedBus-Style 4-Tier Cancellation Refund & Razorpay Gateway Refund

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-040** | Tier 1 refund (> 24 hours): 100% full refund | Model Logic | `appointments/models.py#L238` | Positive | Appointment slot is 48 hours away. Fee paid: ₹600.00 | Call `appointment.calculate_cancellation_refund()` | Returns `refund_amount=600.00`, `deduction_amount=0.00`, `tier_code='tier_1_full'` | Patient |
| **TC-PAY-041** | Tier 1 boundary: Exactly 24h 00m 01s remaining | Model Logic | `appointments/models.py#L238` | Boundary | Slot datetime is exactly 24 hours + 1 second ahead of `now` | Call `calculate_cancellation_refund()` | Evaluates as Tier 1: 100% refund, ₹0.00 deduction | Patient |
| **TC-PAY-042** | Tier 2 boundary: Exactly 23h 59m 59s remaining | Model Logic | `appointments/models.py#L243` | Boundary | Slot datetime is 23h 59m 59s ahead of `now` | Call `calculate_cancellation_refund()` | Evaluates as Tier 2: 75% refund, 25% deduction | Patient |
| **TC-PAY-043** | Tier 2 refund (12 to 24 hours): 75% refund | Model Logic | `appointments/models.py#L243` | Positive | Appointment slot is 18 hours away. Fee paid: ₹800.00 | Call `calculate_cancellation_refund()` | Returns `refund_amount=600.00`, `deduction_amount=200.00` | Patient |
| **TC-PAY-044** | Tier 3 boundary: Exactly 11h 59m 59s remaining | Model Logic | `appointments/models.py#L248` | Boundary | Slot datetime is 11h 59m 59s ahead of `now` | Call `calculate_cancellation_refund()` | Evaluates as Tier 3: 50% refund, 50% deduction | Patient |
| **TC-PAY-045** | Tier 3 refund (2 to 12 hours): 50% short-notice refund | Model Logic | `appointments/models.py#L248` | Positive | Appointment slot is 6 hours away. Fee paid: ₹500.00 | Call `calculate_cancellation_refund()` | Returns `refund_amount=250.00`, `deduction_amount=250.00` | Patient |
| **TC-PAY-046** | Tier 4 boundary: Exactly 1h 59m 59s remaining | Model Logic | `appointments/models.py#L253` | Boundary | Slot datetime is 1h 59m 59s ahead of `now` | Call `calculate_cancellation_refund()` | Evaluates as Tier 4: 0% refund, 100% non-refundable deduction | Patient |
| **TC-PAY-047** | Tier 4 refund (< 2 hours or past slot): 0% non-refundable | Model Logic | `appointments/models.py#L253` | Boundary | Appointment slot is 30 minutes away. Fee paid: ₹500.00 | Call `calculate_cancellation_refund()` | Returns `refund_amount=0.00`, `deduction_amount=500.00`, `tier_code='tier_4_non_refundable'` | Patient |
| **TC-PAY-048** | Cancel triggers Razorpay refund API for positive refund amount | Backend API | `appointments/views.py#L425` | Positive | Paid appointment cancelled in Tier 1 (`refund_amount=525.00`) | Send `POST /api/appointments/<id>/cancel/` | `client.payment.refund` invoked with 52500 paise; `payment.razorpay_refund_id` stored; `payment.refund_status='processed'` | Patient |
| **TC-PAY-049** | Cancel appointment with Tier 4 (₹0 refund) does NOT call Razorpay | Backend API | `appointments/views.py#L422` | Boundary | Paid appointment cancelled in Tier 4 (`refund_amount=0.00`) | Send `POST /api/appointments/<id>/cancel/` | `client.payment.refund` is NOT invoked; `payment.status` remains paid or marked unrefunded | Patient |
| **TC-PAY-050** | Graceful degradation on Razorpay refund API downtime | Backend API | `appointments/views.py#L430` | Failure/Dep | Mock `client.payment.refund` raises `razorpay.errors.GatewayError` | Send `POST /api/appointments/<id>/cancel/` | Cancellation succeeds with 200 OK; `payment.refund_status='failed'`; booking is NOT reverted back to active | Patient |
| **TC-PAY-051** | IDOR: Patient A attempts to cancel Patient B's paid appointment | Backend API | `appointments/views.py#L393` | Permission | Appointment belongs to Patient B | Send `POST /api/appointments/<id>/cancel/` as Patient A | 404 Not Found or 403 Forbidden; Patient A cannot trigger refund on Patient B's payment | Patient A |

---

### 2.7 Payment History, Ledger & Invoices

| TC ID | Test Name | Layer | File & Line | Type | Input / Precondition | Test Steps | Expected Result | Role Tested |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-PAY-052** | Patient payment history lists own payments | Backend API | `payments/views.py#L101` | Positive | Patient with 3 payments (1 paid, 1 refunded, 1 failed) | Send `GET /api/payments/history/` | 200 OK; returns 3 records with doctor details, formatted amounts, and statuses | Patient |
| **TC-PAY-053** | Patient payment history isolation (data privacy) | Backend API | `payments/views.py#L111` | Permission | Patient A queries payment history | Inspect response object list | Contains strictly records where `patient=request.user`; never includes other patients' records | Patient |
| **TC-PAY-054** | Hospital staff payment ledger scoped to hospital | Backend API | `payments/views.py` | Permission | Hospital Staff logged in for "Apollo Hospital" | Send `GET /api/payments/hospital-ledger/` | 200 OK; only payments for Apollo Hospital doctors are returned | Hospital Staff |
| **TC-PAY-055** | Hospital staff cannot view another hospital's payment ledger | Backend API | `payments/views.py` | Permission | Apollo Staff requests Yashoda Hospital payments | Inspect query results | Records filtered strictly to staff user's associated hospital | Hospital Staff |
| **TC-PAY-056** | Invoice Modal renders complete GST breakdown | Frontend UI | `InvoiceModal.jsx#L45` | UI | Patient clicks "Invoice" on confirmed appointment | View rendered modal | Displays Invoice #, Date, Doctor Name, Hospital Address, Base Fee, Discount, GST/Tax, and Net Paid in INR | Patient |
| **TC-PAY-057** | Invoice print trigger invokes window.print | Frontend UI | `InvoiceModal.jsx#L110` | UI | Click "Print Invoice" button inside modal | Verify browser event | Triggers `window.print()` with clean print media stylesheet (hides sidebar/buttons) | Patient |
