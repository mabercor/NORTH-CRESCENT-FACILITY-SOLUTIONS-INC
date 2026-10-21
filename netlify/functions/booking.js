/* =========================================================
   NORTH CRESCENT — BOOKING FORM HANDLER (Netlify Function)
   File: /netlify/functions/booking.js
   Endpoint: /.netlify/functions/booking

   1. Verifies the Cloudflare Turnstile token
   2. Validates the booking fields on the server
   3. Forwards a clean payload to the Make webhook, including the
      ready-made confirmation email HTML (emailPart1/2/3)

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

/* ---------- CONFIRMATION EMAIL (HTML) ----------
   The finished HTML is cut in 3 pieces (emailPart1/2/3) at the two
   places Make has to fill. In the Make email body, put in this order:
     {emailPart1} {Airtable Booking ID} {emailPart2} {AI text} {emailPart3}
   ----------------------------------------------- */

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatLongDate = (isoDate) => {
  const date = new Date(isoDate + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    timeZone: "UTC"
  });
};

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Booking received – North Crescent Facility Solutions</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f5f7fa;">Your booking has been received. Here is your summary.</div>
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f7fa">
<tr><td align="center" style="padding:24px 12px;">
<table width="600" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #E5E7EB;"><tr><td align="center" bgcolor="#1E3A5F" style="background:#1E3A5F;padding:34px 24px 26px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:26px;line-height:1.15;letter-spacing:2px;color:#ffffff;font-weight:bold;">NORTH CRESCENT</div><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:13px;letter-spacing:3px;color:#C7D8E7;margin-top:6px;">FACILITY SOLUTIONS INC.</div><div style="width:70px;height:3px;background:#4A9B8C;margin:16px auto 14px;font-size:0;line-height:0;">&nbsp;</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#ffffff;">RELIABLE &nbsp;&bull;&nbsp; STRUCTURED &nbsp;&bull;&nbsp; PROFESSIONAL</div></td></tr><tr><td align="center" style="padding:36px 32px 8px;"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" width="54" height="54" bgcolor="#EAF2F8" style="width:54px;height:54px;border-radius:27px;background:#EAF2F8;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:54px;color:#4A9B8C;font-weight:bold;">&#10003;</td></tr></table><h1 style="margin:18px 0 6px;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#1E3A5F;font-weight:bold;">Welcome, [[CLIENT_NAME]]</h1><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#5B6573;">Your booking has been received and registered.</p></td></tr><tr><td align="center" style="padding:18px 32px 6px;"><table border="0" cellspacing="0" cellpadding="0" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:12px;"><tr><td align="center" style="padding:14px 34px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:2px;color:#6B7280;">BOOKING NUMBER</div><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:30px;line-height:1.2;color:#1E3A5F;font-weight:bold;margin-top:4px;">[[BOOKING_ID]]</div></td></tr></table></td></tr><tr><td style="padding:22px 36px 6px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#374151;">[[AI_MESSAGE]]</td></tr><tr><td style="padding:20px 32px 6px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#4A9B8C;font-weight:bold;padding-bottom:10px;">YOUR BOOKING SUMMARY</div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">SERVICE</td><td valign="top" style="padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#1E3A5F;font-weight:bold;">[[SERVICE]]</td></tr><tr><td valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">DATE</td><td valign="top" style="padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#374151;">[[DATE]]</td></tr><tr><td valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">TIME</td><td valign="top" style="padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#374151;">[[TIME]]</td></tr><tr><td valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">ADDRESS</td><td valign="top" style="padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#374151;">[[ADDRESS]]</td></tr><tr><td valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">CONTACT</td><td valign="top" style="padding:12px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#374151;">[[PHONE]]<br>[[EMAIL]]</td></tr><tr><td valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">PROPERTY DETAILS</td><td valign="top" style="padding:12px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;">[[NOTES]]</td></tr></table></td></tr><tr><td style="padding:26px 32px 6px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#4A9B8C;font-weight:bold;padding-bottom:12px;">WHAT HAPPENS NEXT</div><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td width="38" valign="top" style="padding-bottom:14px;"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" width="28" height="28" bgcolor="#1E3A5F" style="width:28px;height:28px;border-radius:14px;background:#1E3A5F;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;line-height:28px;">1</td></tr></table></td><td valign="top" style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;"><strong style="color:#1E3A5F;">We review your request.</strong> Our team checks the details and your schedule.</td></tr><tr><td valign="top" style="padding-bottom:14px;"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" width="28" height="28" bgcolor="#1E3A5F" style="width:28px;height:28px;border-radius:14px;background:#1E3A5F;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;line-height:28px;">2</td></tr></table></td><td valign="top" style="padding-bottom:14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;"><strong style="color:#1E3A5F;">We contact you.</strong> We will reach out shortly to confirm final details.</td></tr><tr><td valign="top"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" width="28" height="28" bgcolor="#4A9B8C" style="width:28px;height:28px;border-radius:14px;background:#4A9B8C;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;line-height:28px;">3</td></tr></table></td><td valign="top" style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#374151;"><strong style="color:#1E3A5F;">We take care of the rest.</strong> Our professional team arrives ready to work.</td></tr></table></td></tr><tr><td align="center" style="padding:26px 32px 8px;"><p style="margin:0 0 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#5B6573;">Need to change something? Reply to this email or call us, and mention your booking number.</p><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="#4A9B8C" style="background:#4A9B8C;border-radius:10px;"><a href="tel:+14288880542" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">Call +1 (428) 888-0542</a></td></tr></table></td></tr><tr><td align="center" style="padding:26px 32px 30px;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:16px;line-height:1.6;color:#1E3A5F;">Thank you for trusting us.<br><strong>The North Crescent Team</strong></td></tr><tr><td align="center" bgcolor="#1E3A5F" style="background:#1E3A5F;padding:24px 24px 26px;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.9;color:#C7D8E7;"><strong style="color:#ffffff;letter-spacing:1px;">NORTH CRESCENT FACILITY SOLUTIONS INC.</strong><br>Moncton, New Brunswick<br><a href="https://northcrescentcleaning.com" style="color:#ffffff;text-decoration:none;">northcrescentcleaning.com</a> &nbsp;|&nbsp;<a href="mailto:info@northcrescentcleaning.com" style="color:#ffffff;text-decoration:none;">info@northcrescentcleaning.com</a><br><a href="tel:+14288880542" style="color:#ffffff;text-decoration:none;">+1 (428) 888-0542</a><br><a href="https://www.linkedin.com/company/north-crescent-facility-solutions-inc/" style="color:#9FD3C7;text-decoration:none;">LinkedIn</a> &nbsp;|&nbsp;<a href="https://www.instagram.com/northcrescentcleaning/" style="color:#9FD3C7;text-decoration:none;">Instagram</a> &nbsp;|&nbsp;<a href="https://www.facebook.com/profile.php?id=61590535282882" style="color:#9FD3C7;text-decoration:none;">Facebook</a></td></tr>
</table>
</td></tr>
</table>
</body>
</html>
`;

const buildConfirmationEmail = (booking) => {
  const values = {
    CLIENT_NAME: escapeHtml(booking.clientName),
    SERVICE: escapeHtml(booking.serviceType),
    DATE: escapeHtml(formatLongDate(booking.serviceDate)),
    TIME: escapeHtml(booking.timeLabel || booking.timeSlot),
    ADDRESS: escapeHtml(booking.serviceAddress),
    PHONE: escapeHtml(booking.phoneNumber),
    EMAIL: escapeHtml(booking.email),
    NOTES: booking.notes
      ? escapeHtml(booking.notes).replace(/\r?\n/g, "<br>")
      : "Not provided"
  };

  const html = EMAIL_TEMPLATE.replace(/\[\[([A-Z_]+)\]\]/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );

  const idMarker = "[[BOOKING_ID]]";
  const aiMarker = "[[AI_MESSAGE]]";
  const idAt = html.indexOf(idMarker);
  const aiAt = html.indexOf(aiMarker);

  return {
    emailPart1: html.slice(0, idAt),
    emailPart2: html.slice(idAt + idMarker.length, aiAt),
    emailPart3: html.slice(aiAt + aiMarker.length)
  };
};

/* ---------- CALENDAR TIMES ----------
   timeSlot looks like "12:00-16:00" or "08:00-12:00-next-day".
   Returns local start/end ("YYYY-MM-DDTHH:MM:00") for the calendar event. */

const buildEventTimes = (booking) => {
  const match = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})(-next-day)?$/.exec(booking.timeSlot);
  if (!match) return {};

  const [, sh, sm, eh, em, nextDay] = match;
  const base = new Date(booking.serviceDate + "T00:00:00Z");
  if (nextDay) base.setUTCDate(base.getUTCDate() + 1);
  const day = base.toISOString().slice(0, 10);

  return {
    eventStart: `${day}T${sh}:${sm}:00`,
    eventEnd: `${day}T${eh}:${em}:00`,
    eventTimeZone: "America/Moncton"
  };
};

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
      body: JSON.stringify({
        ...booking,
        ...buildEventTimes(booking),
        ...buildConfirmationEmail(booking)
      })
    });

    if (!makeResponse.ok) {
      return json(502, { error: "Could not deliver the booking" });
    }

    return json(200, { success: true });

  } catch (error) {

    return json(500, { error: "Server error" });

  }
};
