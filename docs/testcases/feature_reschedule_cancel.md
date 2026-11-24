# CareConnect Test Cases: Reschedule & Cancellation Business Rules (R1–R11, C1–C11)

**Document Reference**: `docs/testcases/feature_reschedule_cancel.md`  
**Execution Environment**: Isolated Cloud PostgreSQL (`careconnect_isolated_test` on Neon), Django 5.1.15, DRF, SimpleJWT, Python 3.14.7, React 18, Vite 6.4.3, Playwright 1.65.2.  
**Production DB Isolation**: Certified 100% isolated. Production DB (`doctor`) remained untouched. All 150 doctors, 540 schedules, and 6,300 slots seeded in `careconnect_isolated_test`.  
**Result Summary**: **22/22 Backend Pytest Tests PASSED** (0 failures, 331.94s runtime), **5/5 Frontend Playwright Tests PASSED**.

---

## 1. Master Verification & Traceability Table

| TC ID | Rule | Scenario | Steps | Expected | Actual | Pass/Fail | Fix Commit |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-R01** | **R1** | One reschedule per appointment per calendar day (Asia/Kolkata). Second attempt same day blocked with next allowed time. | 1. Patient reschedules appt to target slot 1.<br>2. Patient immediately attempts second reschedule to target slot 2. | 1. First attempt returns 200 OK, `reschedule_count=1`, `last_rescheduled_at` set.<br>2. Second attempt returns 400 Bad Request with message indicating next allowed time after midnight IST (00:00 IST). | Returns 400 Bad Request with clear message: *"Only one reschedule per appointment per calendar day is permitted. You can reschedule this appointment again after midnight (00:00 IST) on {date} at 00:00 IST."* | **PASS** | [`3af68ae`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R02** | **R2** | Rescheduling to the SAME slot is rejected (400). | Post `/api/appointments/{id}/reschedule/` with `new_slot_id == current_slot.id`. | 400 Bad Request: *"Cannot reschedule to the same slot"*. | Returns 400 Bad Request with: *"Cannot reschedule to the same slot. Please select a different date or time."* | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R03** | **R3** | Target slot validation: future, not blocked, not full (5/5), same doctor. | Post reschedule with: (a) past slot, (b) blocked slot, (c) full slot (5/5), (d) different doctor's slot. | Each scenario returns 400 Bad Request with specific error message. | (a) 400: *"Cannot reschedule to a past slot"*, (b) 400: *"temporarily blocked"*, (c) 400: *"completely booked (5 of 5)"*, (d) 400: *"Doctor change is not permitted"*. | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R04** | **R4** | 10-hour rule at exact boundaries: 9h59m rejected, 10h00m allowed, 10h01m allowed (Asia/Kolkata). | Test boundary slots at exact offsets: 9h59m (599m), 10h00m (600m), 10h01m (601m) against fixed reference time. | 9h59m rejected with 400 (<10h empty slot vacancy protection). 10h00m and 10h01m succeed with 200 OK. | 9h59m returned 400 (*"Rescheduling is only permitted up to 10 hours prior to consultation start time"*). 10h00m and 10h01m returned 200 OK. | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R05** | **R5** | Status restrictions: only pending/confirmed allowed; reject completed, expired, checked-in at OP, or cancelled. | Attempt reschedule on appt with: (a) completed, (b) cancelled, (c) expired, (d) in_consultation, (e) `op_checked_in=True`. | Each scenario rejected with 400 Bad Request. | Returns 400 Bad Request: *"Cannot reschedule an appointment where patient has already checked in at OP"* or status display error. | **PASS** | [`752395c`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R06** | **R6** | Permissions: Patient cannot reschedule another's (404/403). Admin CAN reschedule with override notes. Anonymous gets 401. | 1. Patient 2 attempts reschedule on Patient 1 appt.<br>2. Admin user reschedules Patient 1 appt.<br>3. Unauthenticated request. | 1. 404 Not Found (prevents IDOR enumeration).<br>2. 200 OK with `[Admin Rescheduled by admin@careconnect.com]` logged.<br>3. 401 Unauthorized. | 1. 404 Not Found.<br>2. 200 OK, notes appended.<br>3. 401 Unauthorized. | **PASS** | [`499e3f8`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R07** | **R7** | Prevent reschedule if patient already holds active booking in target slot. | Patient holds appt in slot A and slot B. Attempts reschedule of appt in slot A into slot B. | 400 Bad Request: Duplicate bookings in same slot not permitted. | Returns 400 Bad Request: *"You already hold an active appointment in this slot. Duplicate bookings in the same slot are not permitted."* | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R08** | **R8** | Atomic slot capacity swap: old slot decrements by 1, target slot increments by 1. | Reschedule appt from slot A (1 booked) to slot B (0 booked). | Slot A `booked_count` drops from 1 to 0. Slot B `booked_count` increases from 0 to 1. | Verified: Slot A count = 0, Slot B count = 1. Database transactions fully atomic. | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R09** | **R9** | Concurrency: (1) Two patients rescheduling into last seat of slot (1/2 filled). (2) Same appt submitted twice in parallel. | 2 parallel threads execute reschedule targeting last seat. 2 parallel threads submit identical appt reschedule. | Exactly one thread succeeds (200 OK), one fails (400 Bad Request). Final slot count does not exceed capacity. | Handled via PostgreSQL row-level locks (`select_for_update`). Exactly one thread succeeded (200 OK), one returned 400. Capacity strictly capped at 2. | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R10** | **R10** | Financial integrity: payment & receipt kept, no new charge, new slot determines refund tier afterwards. | 1. Reschedule appt.<br>2. Inspect `receipt_id`, `fee_charged`, and linked `Payment` record.<br>3. Compute cancellation refund tier. | Original receipt and fee preserved. Exactly one payment record linked. Cancellation tier evaluates against new slot time. | `receipt_id` and `fee_charged` unchanged; `Payment.objects.filter(appointment=appt).count() == 1`. Refund calculation uses new slot time. | **PASS** | [`682594e`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-R11** | **R11** | Reschedule email notification sent with old/new time; SMTP failure does not roll back reschedule. | 1. Reschedule with normal email mock.<br>2. Reschedule with SMTP exception raised. | 1. Confirmation email sent with old & new slot info.<br>2. Reschedule still succeeds (200 OK), DB changes persisted. | 1. Email dispatched.<br>2. Reschedule completed with 200 OK despite SMTP failure. | **PASS** | [`499e3f8`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-C01** | **C1** | Refund tier boundaries at exact ±1m offsets: 24h (100%), 12h-24h (75%), 2h-12h (50%), <2h (0%). | Evaluate refund at: 24h01m, 24h00m, 23h59m, 12h01m, 12h00m, 11h59m, 2h01m, 2h00m, 1h59m. Fee = ₹1000. | Exact whole paise arithmetic: >=24h (₹1000 refund, ₹0 cut), 12h-24h (₹750 refund, ₹250 cut), 2h-12h (₹500 refund, ₹500 cut), <2h (₹0 refund, ₹1000 cut). | All 9 boundaries matched exact paise expectations. No floating point rounding drift. | **PASS** | Base verified |
| **TC-C02** | **C2** | Cancel twice blocked (400); concurrent double-cancel prevented. | 1. Cancel appt once (200 OK).<br>2. Attempt cancel second time.<br>3. Parallel cancellation requests. | 1. Status='cancelled', refund initiated.<br>2. 400 Bad Request: *"already been cancelled"*, no second refund.<br>3. Exactly one succeeds. | 1. 200 OK.<br>2. 400 Bad Request.<br>3. Exactly one succeeded, preventing double refund. | **PASS** | Base verified |
| **TC-C03** | **C3** | Cannot cancel completed, expired, checked-in at OP, or already cancelled appointments. | Cancel appt with: (a) completed, (b) expired, (c) cancelled, (d) in_consultation, (e) `op_checked_in=True`. | 400 Bad Request for all scenarios. | Returns 400 Bad Request: *"Cannot cancel an appointment with status '...' or if patient has already checked in."* | **PASS** | [`752395c`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-C04** | **C4** | Unpaid / pending appointment cancellation: ₹0 refund, no Razorpay API call. | Cancel appointment in pending payment state (`status='pending'`, no Razorpay payment ID). | 200 OK, `refund_amount=Decimal('0.00')`, `refund_status='none'`, zero Razorpay refund API calls. | Returns 200 OK, refund is ₹0.00, mock Razorpay `refund.create` called 0 times. | **PASS** | [`499e3f8`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-C05** | **C5** | Paid appointment cancellation triggers Razorpay refund; gateway failure records status without rollback. | 1. Cancel paid appt (mocked Razorpay success).<br>2. Cancel paid appt (mocked Razorpay API exception). | 1. Razorpay `refund.create` called with exact paise, `refund_id` stored.<br>2. Cancellation succeeds, `refund_status='failed'`, cancellation is not lost. | 1. `refund_id='rfnd_mock_123'`, `refund_status='full'`.<br>2. Appt marked 'cancelled', `payment.refund_status='failed'`. | **PASS** | Base verified |
| **TC-C06** | **C6** | Slot seat is freed after cancellation. | Check `slot.booked_count()` before and after cancellation. | Count decrements by 1 (e.g. from 1 to 0). | Count dropped from 1 to 0. Slot becomes available for new patient bookings immediately. | **PASS** | Base verified |
| **TC-C07** | **C7** | Permissions: Patient cannot cancel another's (404). Admin CAN cancel other patient's appt. Anonymous gets 401. | 1. Patient 2 cancels Patient 1 appt.<br>2. Admin user cancels Patient 1 appt.<br>3. Unauthenticated request. | 1. 404 Not Found (IDOR prevention).<br>2. 200 OK, `cancelled_by='admin'`.<br>3. 401 Unauthorized. | 1. 404 Not Found.<br>2. 200 OK, `cancelled_by='admin'`.<br>3. 401 Unauthorized. | **PASS** | [`499e3f8`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-C08** | **C8** | Cancel after reschedule uses the NEW slot time for refund tier calculation. | Reschedule from slot 30h away to slot 5h away (Tier 3: 50%). Immediately cancel. | Refund calculated using 5h remaining (50% refund, 50% cut-off), not original 30h. | Refund was exactly 50% (₹500 on ₹1000 fee). | **PASS** | Base verified |
| **TC-C09** | **C9** | Cancelled appointment cannot be rescheduled; same slot can be rebooked by another patient afterwards. | 1. Attempt reschedule on cancelled appt.<br>2. Another patient books the freed slot. | 1. 400 Bad Request.<br>2. 201 Created (slot booking succeeds). | 1. 400 Bad Request.<br>2. 201 Created. Seat freed and rebooked cleanly. | **PASS** | Base verified |
| **TC-C10** | **C10** | Cancel preview endpoint matches actual cancel amounts. | Compare output of `/api/appointments/{id}/cancel-preview/` with actual cancel response. | Identical fee paid, deduction percentage, deduction amount, and net refund amount. | Preview and actual cancel amounts matched to the exact paise. | **PASS** | [`2c49d16`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-C11** | **C11** | Cancellation reason saved, notification email sent, whole paise rounding. | Cancel with reason string and fee with fractional paise (e.g. ₹750.50). | Reason saved in DB, notification sent, refund rounded to exact integer paise for Razorpay. | Reason persisted, email notification dispatched, whole paise refund passed to gateway. | **PASS** | Base verified |
| **TC-FE01** | **FE-UX** | Reschedule button disabled with clear badge/tooltip when <10h remain (R4). | Load My Appointments with appt 5.5h away. | Reschedule button disabled, displays `Reschedule Locked (< 10h)`, tooltip mentions 10-hour rule. | Verified via Playwright: button disabled, badge and tooltip rendered properly. | **PASS** | [`f2a8bfa`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-FE02** | **FE-UX** | Reschedule button disabled with clear badge when rescheduled today (R1). | Load My Appointments with appt rescheduled today. | Reschedule button disabled, displays `Rescheduled Today`, tooltip mentions calendar day quota. | Verified via Playwright: button disabled, badge and tooltip rendered properly. | **PASS** | [`f2a8bfa`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-FE03** | **FE-UX** | Target slot picker disables and greys out SAME slot (R2). | Open reschedule modal. Inspect slot picker options. | Current slot option has `disabled` attribute and `(Current Slot - Not selectable)` text. | Verified via Playwright: option disabled, label displayed. | **PASS** | [`f2a8bfa`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-FE04** | **FE-UX** | Full slots show 5/5 full and are unclickable (R3/R9). | Open reschedule modal on date with full slot (5/5). | Full slot option has `disabled` attribute and `(🔴 5/5 full - Unselectable)` text. | Verified via Playwright: option disabled, label displayed. | **PASS** | [`f2a8bfa`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |
| **TC-FE05** | **FE-UX** | Cancel modal displays RedBus refund breakdown and net refund before confirming. | Click "Cancel & Refund" on confirmed appt. | Modal shows tier breakdown, consultation fee paid, cash cut-off deduction, and net refund on confirm button. | Verified via Playwright: RedBus breakdown rendered, button shows `Confirm & Refund ₹1000.00`. | **PASS** | [`f2a8bfa`](file:///E:/PROJECTS/appointment_system_updated/appointment_system) |

---

## 2. Code Quotes & Implementation Evidence

### Rule R1: One Reschedule Per Calendar Day (Asia/Kolkata)
* **Model Enforcement**: [`backend/appointments/models.py:239-247`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/models.py#L239-L247)
  ```python
  if self.last_rescheduled_at:
      now_kolkata = timezone.now().astimezone(kolkata_tz)
      last_kolkata = self.last_rescheduled_at.astimezone(kolkata_tz)
      if now_kolkata.date() == last_kolkata.date():
          tomorrow_date = now_kolkata.date() + datetime.timedelta(days=1)
          allowed_at_str = f"{tomorrow_date} at 00:00 IST"
          return False, f"Only one reschedule per appointment per calendar day is permitted. You can reschedule this appointment again after midnight (00:00 IST) on {allowed_at_str}."
  ```
* **View Enforcement**: [`backend/appointments/views.py:590-595`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L590-L595)

### Rule R2: Same Slot Rejection
* **View Enforcement**: [`backend/appointments/views.py:539-543`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L539-L543)
  ```python
  if int(target_slot_id_int) == appointment.slot_id:
      return Response({
          "error": "Cannot reschedule to the same slot. Please select a different date or time."
      }, status=status.HTTP_400_BAD_REQUEST)
  ```

### Rule R3 & R7: Target Slot Validations & Duplicate Prevention
* **View Enforcement**: [`backend/appointments/views.py:575-587`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L575-L587)
  ```python
  if new_slot.is_past():
      return Response({"error": "Cannot reschedule to a past slot."}, status=status.HTTP_400_BAD_REQUEST)
  if new_slot.is_blocked:
      return Response({"error": "The selected slot is temporarily blocked by hospital administration. Please choose an active slot."}, status=status.HTTP_400_BAD_REQUEST)
  if new_slot.booked_count() >= new_slot.max_capacity:
      return Response({"error": f"The selected slot is completely booked ({new_slot.max_capacity} of {new_slot.max_capacity} appointments filled). Please choose another slot."}, status=status.HTTP_400_BAD_REQUEST)
  if new_slot.doctor_id != appointment.doctor_id:
      return Response({"error": "Target slot must belong to the same doctor. Doctor change is not permitted during reschedule."}, status=status.HTTP_400_BAD_REQUEST)

  if Appointment.objects.filter(patient=appointment.patient, slot=new_slot, status__in=['pending', 'confirmed']).exists():
      return Response({"error": "You already hold an active appointment in this slot. Duplicate bookings in the same slot are not permitted."}, status=status.HTTP_400_BAD_REQUEST)
  ```

### Rule R4: 10-Hour Boundary Rule
* **Model Enforcement**: [`backend/appointments/models.py:233-237`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/models.py#L233-L237)
  ```python
  hours_rem = self.get_hours_until_slot()
  if hours_rem < 10.0:
      hrs_display = max(0, round(hours_rem, 1))
      return False, f"Rescheduling is only permitted up to 10 hours prior to consultation start time (currently {hrs_display} hrs remaining). Empty slot vacancy protection applies."
  ```

### Rule R5 & C3: Check-in & Status Restrictions
* **Model Enforcement**: [`backend/appointments/models.py:228-230`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/models.py#L228-L230) & [`backend/appointments/models.py:313-316`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/models.py#L313-L316)
  ```python
  if self.op_checked_in or self.status == 'in_consultation':
      return False, "Cannot reschedule an appointment where patient has already checked in at OP."
  ```
  ```python
  @property
  def is_cancellable(self):
      if self.op_checked_in or self.status in ('completed', 'cancelled', 'expired', 'in_consultation'):
          return False
      return self.status in ('pending', 'confirmed')
  ```

### Rule R6 & C7: Admin Permissions & IDOR Protection
* **View Enforcement**: [`backend/appointments/views.py:401-410`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L401-L410) & [`backend/appointments/views.py:504-514`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L504-L514)
  ```python
  is_admin = request.user.role == 'admin' or request.user.is_staff
  appt_qs = Appointment.objects.select_for_update().select_related('slot', 'doctor', 'patient')
  if not is_admin:
      appt_qs = appt_qs.filter(patient=request.user)
  appointment = appt_qs.get(id=appointment_id)
  ```

### Rule R8 & R9: Concurrency & Atomic Swap
* **View Enforcement**: [`backend/appointments/views.py:545-595`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L545-L595)
  ```python
  with transaction.atomic():
      appointment = Appointment.objects.select_for_update().select_related('slot', 'doctor', 'patient').get(id=appointment_id)
      new_slot = Slot.objects.select_for_update().select_related('doctor').get(id=target_slot_id_int)
      ...
      appointment.slot = new_slot
      appointment.status = 'confirmed'
      appointment.reschedule_count = (appointment.reschedule_count or 0) + 1
      appointment.last_rescheduled_at = timezone.now()
      appointment.save(update_fields=['slot', 'status', 'reschedule_count', 'last_rescheduled_at', 'notes', 'updated_at'])
  ```

### Rule C4: Unpaid / Pending Appointment Cancellation
* **View Enforcement**: [`backend/appointments/views.py:425-446`](file:///E:/PROJECTS/appointment_system_updated/appointment_system/backend/appointments/views.py#L425-L446)
  ```python
  payment = Payment.objects.select_for_update().filter(appointment=appointment).first()
  has_paid = payment is not None and payment.status == 'paid' and bool(payment.razorpay_payment_id)

  if not has_paid:
      refund_info = {
          'hours_remaining': appointment.get_hours_until_slot(),
          'fee_paid': '0.00',
          'refund_percentage': 0,
          'deduction_percentage': 0,
          'deduction_amount': '0.00',
          'refund_amount': '0.00',
          'tier_label': 'Unpaid / No Refund Initiated',
          'tier_code': 'unpaid_none',
      }
      appointment.cancellation_fee = Decimal('0.00')
      appointment.refund_amount = Decimal('0.00')
      appointment.refund_status = 'none'
  ```

---

## 3. Missing or Incorrect Rules Identified and Fixed

1. **`reschedule_count` and `last_rescheduled_at` missing from Model Class**:
   - *Status*: **WRONG / INCOMPLETE**
   - *Issue*: Columns existed in the DB table via migration 0012, but were omitted from the Python `Appointment` model definition in `backend/appointments/models.py`. Calling `appointment.save()` caused crashes or ignored tracking.
   - *Fix*: Added both fields to `backend/appointments/models.py` and incorporated them into `check_reschedule_eligibility` and `save(update_fields=...)`.

2. **R1 Daily Calendar Quota Enforced**:
   - *Status*: **MISSING**
   - *Issue*: Code did not enforce Definition A ("One reschedule per appointment per calendar day in Asia/Kolkata; second attempt the same day blocked with next allowed time").
   - *Fix*: Implemented calendar day comparison in `Asia/Kolkata` timezone in `Appointment.check_reschedule_eligibility()`. If a reschedule occurs on day $D$, attempts until 00:00 IST of day $D+1$ are blocked with exact datetime guidance.

3. **R2 Target Slot Same as Current Slot Rejected**:
   - *Status*: **MISSING**
   - *Issue*: Rescheduling to the current slot was accepted without validation.
   - *Fix*: Added check in `RescheduleAppointmentView` returning 400 Bad Request if `new_slot_id == appointment.slot_id`.

4. **R3 Target Slot Validation (Same Doctor, Future, Unblocked, Not Full)**:
   - *Status*: **INCOMPLETE**
   - *Issue*: A patient could reschedule to a slot belonging to a different doctor or a blocked slot.
   - *Fix*: Added validations rejecting past slots, blocked slots, full slots (5/5), and cross-doctor slot changes.

5. **R5 & C3 OP Check-In Restriction**:
   - *Status*: **MISSING**
   - *Issue*: If a patient had physically checked in at the OP clinic (`op_checked_in=True`) or was `in_consultation`, they could still initiate a cancellation or reschedule from their phone.
   - *Fix*: Added check in both `check_reschedule_eligibility()` and `is_cancellable` blocking cancellations and reschedules once checked in at OP.

6. **R6 & C7 Admin Overrides with IDOR Prevention**:
   - *Status*: **WRONG / RESTRICTIVE**
   - *Issue*: Hospital admins could not reschedule or cancel appointments on behalf of patients via the standard endpoint without receiving 404, while unauthorized patients needed strict 404 IDOR masking.
   - *Fix*: Permitted admin/staff overrides with audit notes (`[Admin Rescheduled by ...]`) while preserving 404 IDOR masking for other patients.

7. **R7 Target Slot Duplicate Booking Prevention**:
   - *Status*: **MISSING**
   - *Issue*: A patient could reschedule into a slot where they already possessed an active booking, resulting in duplicate bookings for the same user.
   - *Fix*: Added query check rejecting target slot if patient already holds a `pending` or `confirmed` appointment in that slot.

8. **R11 Reschedule Email Notification & SMTP Failure Resilience**:
   - *Status*: **MISSING**
   - *Issue*: Rescheduling did not notify the patient via email, and any unhandled SMTP error could crash the transaction.
   - *Fix*: Added `send_reschedule_notification` in `appointments/notifications.py` and wrapped the notification call in a resilient `try/except` block.

9. **C4 Unpaid / Pending Appointment Cancellation Refund Crash**:
   - *Status*: **WRONG**
   - *Issue*: Cancelling an unpaid pending appointment attempted to calculate refund percentages against `fee_charged` and trigger Razorpay refund API, which failed.
   - *Fix*: Added `has_paid` check in `CancelAppointmentView`. Unpaid appointments cancel with ₹0 refund, `refund_status='none'`, and bypass Razorpay.

10. **Frontend Reschedule Modal & Slot Picker UX**:
    - *Status*: **MISSING / BROKEN UX**
    - *Issue*: Clicking "Reschedule" previously triggered a headless POST and navigated to `/doctors/{id}` with no slot selection UI.
    - *Fix*: Added full patient reschedule modal in `MyAppointmentsPage.jsx` with date selector, target slot picker with disabled SAME slot (`Current Slot - Not selectable`), disabled full slots (`🔴 5/5 full - Unselectable`), double-click spinner prevention, and in-place list updates.

---

## 4. Git Commit History for Fixes

| Commit | Message | Key Changes |
| :--- | :--- | :--- |
| `3af68ae` | `fix(appointments): enforce R1 one reschedule per appointment per calendar day` | Added `reschedule_count` and `last_rescheduled_at` to `Appointment` model; added IST calendar day quota check. |
| `682594e` | `fix(appointments): enforce R2, R3, R7 target slot validation on reschedule` | Enforced same slot rejection, same doctor check, capacity check, and duplicate booking prevention. |
| `752395c` | `fix(appointments): enforce OP check-in and in-consultation restrictions on reschedule and cancel (R5, C3)` | Blocked reschedule and cancel when `op_checked_in=True` or `status='in_consultation'`. |
| `2c49d16` | `fix(appointments): add cancellation preview URL alias <int:appointment_id>/cancel-preview/` | Added routing alias for cancellation preview. |
| `499e3f8` | `fix(appointments): enforce admin overrides, IDOR checks, unpaid zero-refund, and reschedule notifications (R6, R11, C4, C7)` | Admin override support, IDOR protection, ₹0 refund on unpaid cancel, and SMTP-resilient reschedule email. |
| `fce5a9a` | `test(appointments): add comprehensive test suite for all reschedule (R1-R11) and cancel (C1-C11) rules` | Created 22 isolated PostgreSQL test cases in `test_reschedule.py` and `test_cancel.py`. |
| `f2a8bfa` | `feat(frontend): add patient reschedule modal, slot status validation, and Playwright e2e test suite` | Implemented Patient Reschedule modal, slot disabled states, and Playwright E2E suite (`e2e/reschedule_cancel.spec.ts`). |
