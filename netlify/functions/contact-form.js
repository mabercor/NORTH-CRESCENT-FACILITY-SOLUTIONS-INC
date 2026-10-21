/* =========================================================
   NORTH CRESCENT — CONTACT FORM HANDLER (Netlify Function)
   File: /netlify/functions/contact-form.js
   Endpoint: /.netlify/functions/contact-form

   1. Quietly drops bot submissions (honeypot)
   2. Verifies the Cloudflare Turnstile token
   3. Validates the fields on the server
   4. Forwards a clean payload to the Make webhook and
      only answers "success" if Make really accepted it

   Environment variables (Netlify → Site settings → Environment):
     TURNSTILE_SECRET_KEY    Turnstile secret
     MAKE_WEBHOOK_URL        webhook of the contact scenario

   The field names are the same ones the Make scenario already
   receives, plus a few extras (frequencyLabel, pageUrl,
   submittedAt) that Make can ignore or use.
   ========================================================= */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const LINK_PATTERN = /(https?:\/\/|www\.)\S+/gi;

const clean = (value, max = 500) =>
  String(value ?? "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim().slice(0, max);

const digitCount = (value) => (String(value).match(/\d/g) || []).length;

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

    /* ---------- HONEYPOT ---------- */
    /* Answer "success" so bots learn nothing, but send nothing */

    if (clean(data.website, 200)) {
      return json(200, { success: true });
    }

    /* ---------- TURNSTILE ---------- */

    const token = clean(data["cf-turnstile-response"], 2048);

    if (!token) {
      return json(403, { error: "Missing security check" });
    }

    const verifyBody = new URLSearchParams({
      secret: process.env.TURNSTILE_SECRET_KEY || "",
      response: token
    });

    const clientIp = event.headers && event.headers["x-nf-client-connection-ip"];
    if (clientIp) verifyBody.set("remoteip", clientIp);

    const verifyResponse = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: verifyBody
      }
    );

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      return json(403, { error: "Turnstile validation failed" });
    }

    /* ---------- VALIDATE + CLEAN ---------- */

    const request = {
      formType: "contact",
      clientName: clean(data.clientName, 120),
      emailAddress: clean(data.emailAddress, 254),
      phoneNumber: clean(data.phoneNumber, 40),
      serviceAddress: clean(data.serviceAddress, 250),
      city: clean(data.city, 100),
      province: clean(data.province, 40),
      postalCode: clean(data.postalCode, 20),
      serviceType: clean(data.serviceType, 80),
      visitsPerMonth: clean(data.visitsPerMonth, 20),
      frequencyLabel: clean(data.frequencyLabel, 60),
      recurringVisits: clean(data.recurringVisits, 120),
      timeSlot: clean(data.timeSlot, 40),
      squareFootage: clean(data.squareFootage, 10).replace(/[^\d.]/g, ""),
      operationalSummary: clean(data.operationalSummary, 2000),
      pageUrl: clean(data.pageUrl, 300),
      submittedAt: new Date().toISOString()
    };

    if (request.clientName.length < 2) {
      return json(400, { error: "Please enter your full name." });
    }

    if (!EMAIL_PATTERN.test(request.emailAddress)) {
      return json(400, { error: "Please enter a valid email address." });
    }

    if (digitCount(request.phoneNumber) < 10) {
      return json(400, { error: "Please enter a phone number with area code." });
    }

    if (request.serviceAddress.length < 6) {
      return json(400, { error: "Please enter the service address." });
    }

    if (!request.serviceType) {
      return json(400, { error: "Please choose a service." });
    }

    if (request.operationalSummary.length < 10) {
      return json(400, { error: "Please tell us a little about your space." });
    }

    if ((request.operationalSummary.match(LINK_PATTERN) || []).length > 1) {
      return json(400, { error: "Please remove the web links from your message." });
    }

    /* ---------- SEND TO MAKE ---------- */

    if (!process.env.MAKE_WEBHOOK_URL) {
      console.error("MAKE_WEBHOOK_URL is not set");
      return json(500, { error: "Server error" });
    }

    const makeResponse = await fetch(process.env.MAKE_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request)
    });

    if (!makeResponse.ok) {
      console.error("Make rejected the request:", makeResponse.status);
      return json(502, { error: "Could not deliver the request" });
    }

    return json(200, { success: true });

  } catch (error) {

    /* Details stay in the Netlify log, never in the response */
    console.error("contact-form error:", error);
    return json(500, { error: "Server error" });

  }
};
