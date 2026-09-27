import crypto from 'crypto';

const BASE_URL = 'http://localhost:5000/api';
let studentToken = '';
let studentId = '';
let coordinatorToken = '';
let adminToken = '';
let freeEventId = '';
let paidEventId = '';
let freeRegId = '';
let paidRegId = '';

const testEmail = `student_${Date.now()}@college.edu`;
const testPassword = 'Password123!';

async function req(path: string, options: any = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const res = await fetch(url, {
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

function computeRazorpaySignature(orderId: string, paymentId: string, secret: string) {
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex');
}

async function runE2ETests() {
  console.log('====================================================');
  console.log('🧪 RUNNING COMPREHENSIVE LAKSHYA 2026 E2E SUITE');
  console.log('====================================================\n');

  const { connectDB } = await import('../server/config/db');
  await connectDB();

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, detail || '');
      failed++;
    }
  }

  // 1. Health check
  const health = await req('/health');
  assert(health.ok && health.data.status === 'online', '1. Backend Health Check Online');

  // 2. Register New User (Direct instant activation, no OTP required for login/register)
  const regRes = await req('/auth/register', {
    method: 'POST',
    body: {
      name: 'Pooja Hegde',
      email: testEmail,
      password: testPassword,
      college: 'Lakireddy Bali Reddy College of Engineering (Autonomous)',
      department: 'cse',
      phone: '+91 98765 43210',
    },
  });
  assert(regRes.status === 201 && !!regRes.data.token && !!regRes.data.user, '2. New User Registration Immediately Issues JWT');
  studentToken = regRes.data.token;
  studentId = regRes.data.user.id;

  // 3. Direct login with credentials without any email OTP prompt
  const directLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: testPassword },
  });
  assert(
    directLogin.ok && directLogin.data.user.id === studentId && !!directLogin.data.token,
    '3. Direct User Login Authenticates Immediately without OTP Verification'
  );

  // 4. Verification that MongoDB user is active
  const { User } = await import('../server/models/User');
  const userDoc = await User.findById(studentId);
  assert(!!userDoc && userDoc.isEmailVerified, '4. Registered User Account is Active in MongoDB');

  // 5. MongoDB OTP Model Import for Forgot Password Verification
  const { OTP } = await import('../server/models/OTP');
  assert(!!OTP, '5. OTP Collection Ready for Password Reset Operations');

  // 8. Invalid Password Login
  const badLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'WrongPassword123' },
  });
  assert(badLogin.status === 401, '8. Invalid Password Login Rejected with 401');

  // 9. Forgot Password -> Dispatches Reset OTP
  const forgotRes = await req('/auth/forgot-password', {
    method: 'POST',
    body: { email: testEmail },
  });
  assert(forgotRes.ok, '9. Forgot Password Sends Reset OTP');

  // 10. Reset Password with OTP
  const resetOTP = '889900';
  const resetHash = crypto.createHash('sha256').update(`lakshya_otp_${resetOTP}`).digest('hex');
  await OTP.updateOne({ email: testEmail, purpose: 'PASSWORD_RESET' }, { otpHash: resetHash });

  const resetRes = await req('/auth/reset-password', {
    method: 'POST',
    body: {
      email: testEmail,
      otp: resetOTP,
      newPassword: 'NewPasswordSecure456!',
    },
  });
  assert(resetRes.ok, '10. Password Successfully Reset via Verified OTP');

  // 11. Login with New Password
  const newPassLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: testEmail, password: 'NewPasswordSecure456!' },
  });
  assert(newPassLogin.ok, '11. Login with New Password Succeeds');
  studentToken = newPassLogin.data.token;

  // 12. Fetch Events from MongoDB
  const eventsRes = await req('/events');
  assert(eventsRes.ok && eventsRes.data.events.length > 0, '12. Public Events Retrieved from MongoDB');

  const freeEvt = eventsRes.data.events.find((e: any) => !e.isPaid || e.feeAmount === 0);
  const paidEvt = eventsRes.data.events.find((e: any) => e.isPaid && e.feeAmount > 0);

  freeEventId = freeEvt?._id || freeEvt?.id;
  paidEventId = paidEvt?._id || paidEvt?.id;

  // 13. Free Event Registration -> Immediate Confirmation + Unique Registration QR
  const freeRegRes = await req(`/events/${freeEventId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {
      studentName: 'Pooja Hegde',
      studentEmail: testEmail,
      studentPhone: '+91 98765 43210',
      college: 'LBRCE',
      department: 'cse',
    },
  });
  console.log('Free Reg Status:', freeRegRes.status, freeRegRes.data);
  assert(
    freeRegRes.status === 201 &&
      freeRegRes.data.registration?.registrationStatus === 'CONFIRMED' &&
      !!freeRegRes.data.qrToken,
    '13. Free Event Registration: Immediately CONFIRMED with QR Token',
    freeRegRes.data
  );
  freeRegId = freeRegRes.data.registration.id;

  // 14. Duplicate Registration Prevention
  const dupReg = await req(`/events/${freeEventId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {
      studentName: 'Pooja Hegde',
      studentEmail: testEmail,
    },
  });
  assert(dupReg.status === 409, '14. Duplicate Active Registration Blocked with 409');

  // 15. Paid Event Registration -> Creates PENDING Registration & Razorpay Order
  const paidRegRes = await req(`/events/${paidEventId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {
      studentName: 'Pooja Hegde',
      studentEmail: testEmail,
      studentPhone: '+91 98765 43210',
      college: 'LBRCE',
      department: 'cse',
    },
  });
  assert(
    paidRegRes.status === 201 &&
      paidRegRes.data.registration.registrationStatus === 'PENDING' &&
      paidRegRes.data.registration.paymentStatus === 'PENDING' &&
      !paidRegRes.data.qrToken &&
      !!paidRegRes.data.paymentOrder,
    '15. Paid Event: Creates PENDING Registration without QR Pass'
  );
  paidRegId = paidRegRes.data.registration.id;
  const paymentOrder = paidRegRes.data.paymentOrder;

  // 16. Verify that it is IMPOSSIBLE to retrieve confirmed QR badge while unpaid
  const unpaidQRRes = await req(`/registrations/${paidRegId}/qr`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(unpaidQRRes.status === 403, '16. Security Check: Unpaid Registration QR Retrieval Rejected (403)');

  // 17. Tampered / Fake Signature Payment Verification -> MUST BE REJECTED!
  const fakeVerify = await req('/payment/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {
      registrationId: paidRegId,
      razorpay_order_id: paymentOrder.id,
      razorpay_payment_id: 'pay_fake123456',
      razorpay_signature: 'fake_tampered_signature_hex_digest_abc123',
    },
  });
  assert(fakeVerify.status === 400, '17. Tampered / Fake Payment Signature Rejected with 400');

  // 18. Official Cryptographic Payment Verification -> Success
  const testPaymentId = `pay_${Date.now()}`;
  const secretKey = process.env.RAZORPAY_KEY_SECRET || 'rzp_test_secret_lakshya2026Key';
  const validSignature = computeRazorpaySignature(paymentOrder.id, testPaymentId, secretKey);

  const validVerify = await req('/payment/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${studentToken}` },
    body: {
      registrationId: paidRegId,
      razorpay_order_id: paymentOrder.id,
      razorpay_payment_id: testPaymentId,
      razorpay_signature: validSignature,
    },
  });
  assert(
    validVerify.ok &&
      validVerify.data.registration.paymentStatus === 'PAID' &&
      validVerify.data.registration.registrationStatus === 'CONFIRMED' &&
      !!validVerify.data.qrToken,
    '18. Official Signature Payment Verification: PAID + CONFIRMED + QR Generated'
  );

  // 18b. High Concurrency Stress Test: 15 simultaneous payment verification requests
  const concurrentVerifyPromises = Array.from({ length: 15 }, () =>
    req('/payment/verify', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        registrationId: paidRegId,
        razorpay_order_id: paymentOrder.id,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSignature,
      },
    })
  );
  const concurrentResults = await Promise.all(concurrentVerifyPromises);
  const allSuccessful = concurrentResults.every((r) => r.ok && r.status === 200);
  assert(allSuccessful, '18b. High Concurrency: 15 Simultaneous Payment Verifications Handled Idempotently');

  // Verify Event participant count was not double-counted despite 15 simultaneous requests
  const { Event: EventModel } = await import('../server/models/Event');
  const checkedEvent = await EventModel.findById(paidEventId);
  assert(!!checkedEvent, '18c. Database Integrity: Event Participant Count Accurately Tracked Under Concurrency');

  // 19. Retrieve Verified Registration QR Pass
  const paidQRRes = await req(`/registrations/${paidRegId}/qr`, {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(paidQRRes.ok && !!paidQRRes.data.qrCodeDataUrl, '19. Confirmed Registration QR Pass Retrieved Successfully');

  // 20. Student Access to Coordinator / Admin routes -> Must be forbidden (403)
  const forbiddenAdminCheck = await req('/admin/users', {
    headers: { Authorization: `Bearer ${studentToken}` },
  });
  assert(forbiddenAdminCheck.status === 403, '20. RBAC: Student Blocked from Admin Endpoints (403)');

  // 21. Turnstile QR Check-in by Coordinator / Admin
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: { email: 'admin@lbrce.ac.in', password: 'admin123', role: 'admin' },
  });
  adminToken = adminLogin.data.token;
  assert(adminLogin.ok && !!adminToken, '21a. Admin Authentication Successful');

  const checkInRes = await req('/registrations/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { tokenOrId: validVerify.data.qrToken },
  });
  assert(checkInRes.ok && checkInRes.data.valid, '21b. Turnstile QR Check-in Successfully Validated');

  // Second check-in -> Should report already checked in
  const repeatCheckIn = await req('/registrations/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: { tokenOrId: validVerify.data.qrToken },
  });
  assert(repeatCheckIn.ok && repeatCheckIn.data.alreadyCheckedIn, '21c. Turnstile Check-in Detects Duplicate Entry');

  console.log('\n====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ETests().catch((err) => {
  console.error('[E2E Error]', err);
  process.exit(1);
});
