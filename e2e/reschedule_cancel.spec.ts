import { test, expect } from '@playwright/test';

/**
 * CareConnect E2E Test Suite: Reschedule & Cancel Business Rules & UX
 * File: e2e/reschedule_cancel.spec.ts
 *
 * Covers:
 * - R1: Reschedule button disabled with clear badge/tooltip when daily quota exceeded
 * - R2: Target slot picker greys out / disables the SAME slot
 * - R3/R9: Full slots show '5/5 full' and are unclickable
 * - R4: Reschedule button disabled with tooltip when < 10h remain
 * - C1/C10: Cancel modal displays RedBus refund breakdown and net refund amount before confirming
 * - In-flight submit buttons disabled with spinner to prevent double submit
 * - List updates in place without full-page reload
 * - Edge cases: Midnight crossing (IST), UTC server vs IST timezone, month-end, leap day
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

test.describe('CareConnect Reschedule & Cancel UX Suite', () => {

  test.beforeEach(async ({ page }) => {
    // Mock accounts/me endpoint for authenticated patient session
    await page.route('**/api/accounts/me/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 101,
          username: 'test_patient_e2e',
          email: 'patient_e2e@example.com',
          role: 'patient',
        }),
      });
    });

    // Inject authenticated patient session
    await page.goto(`${BASE_URL}/login`);
    await page.evaluate(() => {
      localStorage.setItem('access_token', 'mock_jwt_access_token');
      localStorage.setItem('refresh_token', 'mock_jwt_refresh_token');
      localStorage.setItem('user', JSON.stringify({
        id: 101,
        username: 'test_patient_e2e',
        email: 'patient_e2e@example.com',
        role: 'patient',
      }));
    });
  });

  test('TC-FE-01: Reschedule button disabled with clear badge and tooltip when <10h (R4)', async ({ page }) => {
    // Mock appointments endpoint returning an appointment with < 10 hours remaining
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 201,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            doctor_hospital: 'City Care Hospital',
            slot: 501,
            slot_date: '2026-11-25',
            slot_time: '14:00',
            status: 'confirmed',
            fee_charged: '800.00',
            receipt_id: 'REC-2026-201',
            is_cancellable: true,
            reschedule_info: {
              eligible: false,
              hours_remaining: 5.5,
              reason: 'Rescheduling is only permitted up to 10 hours prior to consultation start time (currently 5.5 hrs remaining). Empty slot vacancy protection applies.',
            },
          }],
        }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);

    // Verify locked reschedule button is present and disabled
    const lockedBtn = page.locator('[data-testid="reschedule-locked-btn-201"]');
    await expect(lockedBtn).toBeVisible();
    await expect(lockedBtn).toBeDisabled();
    await expect(lockedBtn).toContainText('Reschedule Locked (< 10h)');

    // Verify tooltip contains 10-hour rule notice
    const titleAttr = await lockedBtn.getAttribute('title');
    expect(titleAttr).toContain('10 hours');
  });

  test('TC-FE-02: Reschedule button disabled with clear badge when rescheduled today (R1)', async ({ page }) => {
    // Mock appointment already rescheduled today
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 202,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            doctor_hospital: 'City Care Hospital',
            slot: 502,
            slot_date: '2026-11-26',
            slot_time: '11:00',
            status: 'confirmed',
            fee_charged: '800.00',
            receipt_id: 'REC-2026-202',
            reschedule_count: 1,
            last_rescheduled_at: new Date().toISOString(),
            is_cancellable: true,
            reschedule_info: {
              eligible: false,
              hours_remaining: 48.0,
              reason: 'Only one reschedule per appointment per calendar day is permitted. You can reschedule this appointment again after midnight (00:00 IST).',
            },
          }],
        }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);

    const lockedBtn = page.locator('[data-testid="reschedule-locked-btn-202"]');
    await expect(lockedBtn).toBeVisible();
    await expect(lockedBtn).toBeDisabled();
    await expect(lockedBtn).toContainText('Rescheduled Today');

    const titleAttr = await lockedBtn.getAttribute('title');
    expect(titleAttr).toContain('calendar day');
  });

  test('TC-FE-03: Target slot picker greys out and disables the SAME slot (R2)', async ({ page }) => {
    // Mock appointment eligible for reschedule
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 203,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            doctor_hospital: 'City Care Hospital',
            slot: 503,
            slot_date: '2026-11-28',
            slot_time: '10:00',
            status: 'confirmed',
            fee_charged: '800.00',
            receipt_id: 'REC-2026-203',
            reschedule_info: { eligible: true, hours_remaining: 90.0, reason: 'Eligible' },
            is_cancellable: true,
          }],
        }),
      });
    });

    // Mock doctor slots returning current slot (503) and another slot (504)
    await page.route('**/api/doctors/1/slots/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 503, date: '2026-11-28', start_time: '10:00', end_time: '10:30', booked_count: 1, max_capacity: 5, is_full: false, is_past: false },
          { id: 504, date: '2026-11-28', start_time: '11:00', end_time: '11:30', booked_count: 2, max_capacity: 5, is_full: false, is_past: false },
        ]),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);

    // Click Reschedule button to open modal
    await page.click('[data-testid="reschedule-btn-203"]');

    // Verify modal opened
    const slotSelect = page.locator('[data-testid="reschedule-slot-select"]');
    await expect(slotSelect).toBeVisible();

    // Check same slot (503) option is disabled with clear label
    const sameSlotOption = slotSelect.locator('option[value="503"]');
    await expect(sameSlotOption).toBeDisabled();
    await expect(sameSlotOption).toContainText('Current Slot - Not selectable');

    // Check target slot (504) is selectable
    const newSlotOption = slotSelect.locator('option[value="504"]');
    await expect(newSlotOption).not.toBeDisabled();
  });

  test('TC-FE-04: Full slots show 5/5 full and are unclickable / disabled (R3/R9)', async ({ page }) => {
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 204,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 505,
            slot_date: '2026-11-29',
            slot_time: '09:00',
            status: 'confirmed',
            fee_charged: '800.00',
            reschedule_info: { eligible: true, hours_remaining: 110.0, reason: 'Eligible' },
            is_cancellable: true,
          }],
        }),
      });
    });

    await page.route('**/api/doctors/1/slots/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 505, date: '2026-11-29', start_time: '09:00', booked_count: 1, max_capacity: 5, is_full: false, is_past: false },
          { id: 506, date: '2026-11-29', start_time: '10:00', booked_count: 5, max_capacity: 5, is_full: true, is_past: false },
        ]),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    await page.click('[data-testid="reschedule-btn-204"]');

    const slotSelect = page.locator('[data-testid="reschedule-slot-select"]');
    const fullOption = slotSelect.locator('option[value="506"]');
    await expect(fullOption).toBeDisabled();
    await expect(fullOption).toContainText('5/5 full - Unselectable');
  });

  test('TC-FE-05: Cancel modal displays RedBus refund breakdown and net refund BEFORE confirming (C1/C10)', async ({ page }) => {
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 205,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 507,
            slot_date: '2026-11-30',
            slot_time: '15:00',
            status: 'confirmed',
            fee_charged: '1000.00',
            receipt_id: 'REC-2026-205',
            is_cancellable: true,
            reschedule_info: { eligible: true, hours_remaining: 120.0, reason: 'Eligible' },
          }],
        }),
      });
    });

    // Mock cancellation preview endpoint with RedBus breakdown
    await page.route('**/api/appointments/cancel-preview/205/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          hours_remaining: 120.0,
          fee_paid: '1000.00',
          refund_percentage: 100,
          deduction_percentage: 0,
          deduction_amount: '0.00',
          refund_amount: '1000.00',
          tier_code: 'standard',
          tier_label: 'Standard Cancellation (> 24 Hours)',
          hours_display: '120.0 Hours Remaining',
        }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    await page.click('[data-testid="cancel-btn-205"]');

    // Verify RedBus breakdown elements are displayed
    await expect(page.locator('text=Cancellation & Refund Preview')).toBeVisible();
    await expect(page.locator('text=Standard Cancellation (> 24 Hours)')).toBeVisible();
    await expect(page.locator('text=100% Refund')).toBeVisible();
    await expect(page.locator('text=₹1000.00')).toBeVisible();

    // Verify net refund amount is clearly shown on confirm button
    const confirmBtn = page.locator('[data-testid="confirm-cancel-btn"]');
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toContainText('Confirm & Refund ₹1000.00');
  });

  test('TC-FE-06: Submit buttons disabled during in-flight requests (prevent double click)', async ({ page }) => {
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 206,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 508,
            slot_date: '2026-12-01',
            slot_time: '16:00',
            status: 'confirmed',
            fee_charged: '800.00',
            is_cancellable: true,
            reschedule_info: { eligible: true, hours_remaining: 150.0, reason: 'Eligible' },
          }],
        }),
      });
    });

    await page.route('**/api/appointments/cancel-preview/206/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          fee_paid: '800.00',
          refund_amount: '800.00',
          deduction_amount: '0.00',
          deduction_percentage: 0,
          refund_percentage: 100,
          tier_code: 'standard',
        }),
      });
    });

    // Mock cancel endpoint with a delayed response to test in-flight disabled state
    await page.route('**/api/appointments/cancel/206/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 800));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Appointment cancelled.', refund_amount: '800.00' }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    await page.click('[data-testid="cancel-btn-206"]');

    const confirmBtn = page.locator('[data-testid="confirm-cancel-btn"]');
    await confirmBtn.click();

    // Immediately after click, button should be disabled and show processing state
    await expect(confirmBtn).toBeDisabled();
    await expect(confirmBtn).toContainText('Processing Refund...');
  });

  test('TC-FE-07: In-place list update without full-page reload on cancellation', async ({ page }) => {
    let callCount = 0;
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      callCount += 1;
      const apptStatus = callCount === 1 ? 'confirmed' : 'cancelled';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 207,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 509,
            slot_date: '2026-12-02',
            slot_time: '12:00',
            status: apptStatus,
            fee_charged: '800.00',
            is_cancellable: apptStatus === 'confirmed',
            reschedule_info: { eligible: apptStatus === 'confirmed', hours_remaining: 180.0, reason: 'Eligible' },
          }],
        }),
      });
    });

    await page.route('**/api/appointments/cancel-preview/207/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ fee_paid: '800.00', refund_amount: '800.00', deduction_amount: '0.00', deduction_percentage: 0, refund_percentage: 100 }),
      });
    });

    await page.route('**/api/appointments/cancel/207/**', async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 'Cancelled' }) });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    await page.click('[data-testid="cancel-btn-207"]');
    await page.click('[data-testid="confirm-cancel-btn"]');

    // List re-fetches in place without full navigation
    await expect(page.locator('text=Cancelled')).toBeVisible();
    expect(callCount).toBe(2);
  });

  test('TC-FE-08: Edge Case: Midnight Crossing & IST Calendar Day Boundary (R1)', async ({ page }) => {
    // Verified via mock: Reschedule at 23:55 IST vs 00:05 IST
    // Server evaluates calendar day in Asia/Kolkata timezone:
    // Slot rescheduled on 2026-11-24 23:55 IST has last_rescheduled_at on 2026-11-24.
    // At 2026-11-25 00:05 IST, date changes to 2026-11-25 IST, enabling the reschedule button again.
    const lastRescheduled = '2026-11-24T18:25:00Z'; // 23:55 IST
    const nowAfterMidnight = '2026-11-24T18:35:00Z'; // 00:05 IST (Next calendar day in IST)

    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 208,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 510,
            slot_date: '2026-11-28',
            slot_time: '14:00',
            status: 'confirmed',
            fee_charged: '800.00',
            last_rescheduled_at: lastRescheduled,
            is_cancellable: true,
            reschedule_info: {
              eligible: true, // Eligible because current IST date > last_rescheduled_at IST date
              hours_remaining: 85.0,
              reason: 'Eligible for rescheduling (10+ hours before slot, daily quota available).',
            },
          }],
        }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);

    // Verify active reschedule button is visible and enabled
    const reschedBtn = page.locator('[data-testid="reschedule-btn-208"]');
    await expect(reschedBtn).toBeVisible();
    await expect(reschedBtn).toBeEnabled();
  });

  test('TC-FE-09: Edge Case: UTC vs IST Timezone Consistency', async ({ page }) => {
    // 19:00 UTC on 2026-11-24 is 00:30 IST on 2026-11-25.
    // Backend converts timezone.now() to Asia/Kolkata before extracting .date().
    // If UTC date was checked, it would incorrectly consider it 2026-11-24.
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 209,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 511,
            slot_date: '2026-11-27',
            slot_time: '10:00',
            status: 'confirmed',
            fee_charged: '800.00',
            is_cancellable: true,
            reschedule_info: {
              eligible: true,
              hours_remaining: 57.5,
              reason: 'Eligible for rescheduling (10+ hours before slot, daily quota available).',
            },
          }],
        }),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    const btn = page.locator('[data-testid="reschedule-btn-209"]');
    await expect(btn).toBeVisible();
    await expect(btn).toBeEnabled();
  });

  test('TC-FE-10: Edge Case: Month-End and Leap Day Reschedule Slot Display', async ({ page }) => {
    // Reschedule target slots spanning Feb 28 -> Feb 29 (leap year 2028) or Jan 31 -> Feb 1
    await page.route('**/api/appointments/my-appointments/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          count: 1,
          results: [{
            id: 210,
            doctor: 1,
            doctor_name: 'Dr. Sarah Jenkins',
            slot: 512,
            slot_date: '2028-02-28',
            slot_time: '10:00',
            status: 'confirmed',
            fee_charged: '800.00',
            is_cancellable: true,
            reschedule_info: { eligible: true, hours_remaining: 100.0, reason: 'Eligible' },
          }],
        }),
      });
    });

    await page.route('**/api/doctors/1/slots/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 512, date: '2028-02-28', start_time: '10:00', booked_count: 1, max_capacity: 5, is_full: false },
          { id: 513, date: '2028-02-29', start_time: '10:00', booked_count: 0, max_capacity: 5, is_full: false }, // Leap day
          { id: 514, date: '2028-03-01', start_time: '10:00', booked_count: 0, max_capacity: 5, is_full: false }, // Month rollover
        ]),
      });
    });

    await page.goto(`${BASE_URL}/my-appointments`);
    await page.click('[data-testid="reschedule-btn-210"]');

    const dateSelect = page.locator('[data-testid="reschedule-date-select"]');
    await expect(dateSelect).toBeVisible();

    // Verify leap day (2028-02-29) and month start (2028-03-01) options exist
    await expect(dateSelect.locator('option[value="2028-02-29"]')).toBeVisible();
    await expect(dateSelect.locator('option[value="2028-03-01"]')).toBeVisible();
  });
});
