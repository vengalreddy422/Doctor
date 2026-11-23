# Feature C: Suspected Bugs, Edge Cases & Financial Vulnerabilities

**Document Path**: `/docs/testcases/feature_C_suspected_bugs.md`  
**Target Module**: Payments, Refunds & Coupons Engine  
**Author**: Senior QA & Systems Architect  
**Deliverable Type**: Architecture Security & Financial Integrity Analysis  

---

## 1. High-Priority Suspected Bugs & Integrity Vulnerabilities

### BUG-C01: Milestone Coupon Infinite Reuse Vulnerability
- **Severity**: High (Financial Leakage)
- **Location**: `backend/appointments/views.py#L164-L168` & `backend/appointments/models.py#L285-L321`
- **Observed Logic**:
  ```python
  if coupon.required_bookings > 0 and b_count < coupon.required_bookings:
      needed = coupon.required_bookings - b_count
      return Response({"error": f"This coupon unlocks at {coupon.required_bookings} bookings..."}, status=400)
  ```
- **Vulnerability**:
  - The model does **not** maintain a `CouponRedemption` or `UserCoupon` ledger linking a specific user's redemption to a specific booking milestone.
  - When a user completes 5 bookings, `b_count` is 5.
  - On their 6th booking, `b_count` is 6 (`6 >= 5`).
  - On their 7th booking, `b_count` is 7 (`7 >= 5`).
  - **Impact**: A patient who reaches 5 bookings can apply `MILESTONE5` repeatedly on every subsequent booking (6th, 7th, 8th, 9th) until they unlock `MILESTONE10`, instead of it being a one-time milestone perk.
- **Recommended Remedy**:
  Create a `CouponUsage` model (`user`, `coupon`, `appointment`, `used_at`) with a unique constraint `unique_together = ('user', 'coupon')` for milestone coupons, or check that `b_count == coupon.required_bookings` and mark the milestone redeemed.

---

### BUG-C02: Timezone Offsets in 4-Tier Cancellation Refund Calculation
- **Severity**: High (Financial Calculation Error)
- **Location**: `backend/appointments/models.py#L229-L235`
- **Observed Logic**:
  ```python
  slot_dt = timezone.make_aware(datetime.datetime.combine(self.slot.date, self.slot.start_time))
  now_dt = timezone.now()
  diff = slot_dt - now_dt
  ```
- **Vulnerability**:
  - `datetime.datetime.combine(self.slot.date, self.slot.start_time)` produces a naive datetime.
  - Calling `timezone.make_aware(naive_dt)` without specifying `timezone=zoneinfo.ZoneInfo("Asia/Kolkata")` uses Django's default timezone.
  - If a server worker runs in UTC, `slot_dt` is assumed to be UTC rather than IST (`Asia/Kolkata`).
  - **Impact**: Since IST is UTC+5:30, a 5.5 hour skew can incorrectly push a patient from Tier 1 (>24h) down into Tier 2 (12–24h) or Tier 3 (2–12h), unfairly deducting 25% to 50% from the patient's refund.
- **Recommended Remedy**:
  Explicitly bind the configured timezone:
  ```python
  tz = timezone.get_current_timezone()
  slot_dt = timezone.make_aware(datetime.datetime.combine(self.slot.date, self.slot.start_time), timezone=tz)
  ```

---

### BUG-C03: Concurrent Booking Race Condition in Alternating Dynamic Pricing (+5% / -5%)
- **Severity**: Medium (State Drift & User Confusion)
- **Location**: `backend/appointments/services.py#L36-L51`
- **Observed Logic**:
  ```python
  previous_appointments = Appointment.objects.filter(patient=patient).exclude(
      status__in=['cancelled', 'expired', 'rescheduled']
  )
  previous_count = previous_appointments.count()
  booking_number = previous_count + 1
  ```
- **Vulnerability**:
  - `calculate_fee` performs a non-locked `.count()` query.
  - If a patient initiates two bookings simultaneously in two browser tabs or rapid double-clicks, both requests read the same `previous_count` (e.g. 0). Both are treated as booking #1 and charged the +5% surge rate.
  - Conversely, price shown on `DoctorDetailPage.jsx` is dynamic: if a user opens a doctor page showing a -5% loyalty fee, but another pending appointment of theirs expires or is cancelled before they click "Book", their fee changes unexpectedly upon checkout.
- **Recommended Remedy**:
  Display the base fee clearly alongside the dynamic adjustment tag ("Loyalty Discount applied" or "Surge Rate") and lock patient appointment state during booking creation with `select_for_update()`.

---

### BUG-C04: Lack of Idempotency Key in Razorpay Gateway Refund Invocation
- **Severity**: High (Potential Duplicate Gateway Deductions)
- **Location**: `backend/appointments/views.py#L425-L435`
- **Observed Logic**:
  ```python
  if Decimal(refund_info['refund_amount']) > Decimal('0.00'):
      try:
          refund_res = client.payment.refund(
              payment.razorpay_payment_id,
              {'amount': int(Decimal(refund_info['refund_amount']) * 100)}
          )
  ```
- **Vulnerability**:
  - `client.payment.refund(...)` does not pass Razorpay's recommended `idempotency_key` header or verify `payment.refund_status == 'processed'` under row-level lock prior to dispatch.
  - If network lag causes the client to retry cancellation, or if an admin simultaneously initiates a manual refund from the admin ledger, Razorpay may process two separate refund transactions on the merchant account for the same appointment.
- **Recommended Remedy**:
  Pass a deterministic idempotency key derived from the appointment ID:
  ```python
  client.payment.refund(
      payment.razorpay_payment_id,
      {
          'amount': int(Decimal(refund_info['refund_amount']) * 100),
          'notes': {'appointment_id': str(appointment.id)},
      },
      headers={'X-Razorpay-Idempotency-Key': f"refund_appt_{appointment.id}"}
  )
  ```

---

### BUG-C05: Potential Paise Truncation Error on Fractional Coupon Calculations
- **Severity**: Low (Micro-Accounting Discrepancy)
- **Location**: `backend/appointments/views.py#L32` & `backend/appointments/models.py#L309`
- **Observed Logic**:
  ```python
  amount_paise = int(appointment.fee_charged * 100)
  ```
- **Vulnerability**:
  - If a coupon has a percentage discount (e.g. 15% or 33.33%), the resulting `discount_value` or `final_fee` might have sub-paise fractional decimals if not rigorously quantized at every calculation stage before multiplying by 100.
  - If `appointment.fee_charged` is `Decimal('524.995')`, multiplying by 100 gives `52499.5`, and `int(...)` truncates to `52499` paise (₹524.99), losing half a paisa compared to standard bankers' rounding.
- **Recommended Remedy**:
  Ensure all discounts and fee calculations call `.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)` prior to saving `fee_charged` to the database.

---

## 2. Summary Matrix of Discovered Edge Cases

| Risk ID | Component | Trigger Condition | Potential Impact | Status |
|---|---|---|---|---|
| **BUG-C01** | Coupons Engine | Patient has completed >= 5 bookings and continues booking | Infinite 20% discount on every subsequent booking | Open / Documented |
| **BUG-C02** | Refund Engine | Server running in UTC while user slots are in IST | 5.5-hour timing skew demoting full refunds to 25%-50% deductions | Open / Documented |
| **BUG-C03** | Dynamic Pricing | Simultaneous booking requests from multiple tabs | Race condition in odd/even alternating fee count | Open / Documented |
| **BUG-C04** | Payment Refund | Double cancellation click or concurrent admin refund | Duplicate refund requests to Razorpay gateway | Open / Documented |
| **BUG-C05** | Paise Conversion | Percentage coupon calculation without strict quantization | 1-paise variance between Razorpay order and DB record | Open / Documented |
