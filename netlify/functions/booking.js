/* =========================================================
   NORTH CRESCENT — BOOKING FORM HANDLER (Netlify Function)
   File: /netlify/functions/booking.js
   Endpoint: /.netlify/functions/booking

   1. Verifies the Cloudflare Turnstile token
   2. Validates the booking fields on the server
   3. Forwards a clean payload to the Make webhook

   Environment variables (Netlify → Site settings → Environment):
     TURNSTILE_SECRET_KEY        same secret as the contact form
     MAKE_BOOKING_WEBHOOK_URL    NEW webhook from the booking scenario
   ========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const clean = (value, max = 500) =>
  String(value ?? "").trim().slice(0, max);

const json = (statusCode, body) => ({
  statusCode,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body)
});

exports.handler = async (event) => {

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method Not Allowed" });
  }

  try {

    const data = JSON.parse(event.body || "{}");

    /* ---------- TURNSTILE ---------- */

    const token = data["cf-turnstile-response"];

    if (!token) {
      return json(403, { error: "Missing security check" });
    }

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          secret: process.env.TURNSTILE_SECRET_KEY,
          response: token
        })
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return json(403, { error: "Turnstile validation failed" });
    }

    /* ---------- VALIDATE BOOKING ---------- */

    const booking = {
      formType: "booking",
      serviceType: clean(data.serviceType, 80),
      serviceDate: clean(data.serviceDate, 10),
      timeSlot: clean(data.timeSlot, 40),
      timeLabel: clean(data.timeLabel, 60),
      clientName: clean(data.clientName, 120),
      email: clean(data.email, 254),
      phoneNumber: clean(data.phoneNumber, 40),
      serviceAddress: clean(data.serviceAddress, 250),
      notes: clean(data.notes, 1000),
      pageUrl: clean(data.pageUrl, 300),
      submittedAt: new Date().toISOString()
    };

    const missing =
      !booking.serviceType ||
      !DATE_PATTERN.test(booking.serviceDate) ||
      !booking.timeSlot ||
      !booking.clientName ||
      !EMAIL_PATTERN.test(booking.email) ||
      (booking.phoneNumber.match(/\d/g) || []).length < 10 ||
      !booking.serviceAddress;

    if (missing) {
      return json(400, { error: "Invalid booking data" });
    }

    /* ---------- SEND TO MAKE ---------- */

    const makeResponse = await fetch(process.env.MAKE_BOOKING_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking)
    });

    if (!makeResponse.ok) {
      return json(502, { error: "Could not deliver the booking" });
    }

    return json(200, { success: true });

  } catch (error) {

    return json(500, { error: "Server error" });

  }
};
