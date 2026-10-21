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
   submittedAt) that Make can ignore or use, and emailHtml: the
   finished welcome email (put only {emailHtml} in the Make email body).
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

/* ---------- WELCOME EMAIL (HTML) ----------
   Built here and sent to Make as "emailHtml". In the Make email module
   put ONLY the {emailHtml} pill in the Body (content type HTML).
   Images are hosted on the site: /images/email/*.jpg
   ----------------------------------------------- */

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const EMAIL_TEMPLATE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Welcome to North Crescent Facility Solutions</title>
<style>
@media only screen and (max-width:620px){
  .nc-pad{padding-left:22px !important;padding-right:22px !important;}
  .nc-out{padding-left:2px !important;padding-right:2px !important;}
  .nc-h1{font-size:18px !important;}
  .nc-mi{font-size:10px !important;letter-spacing:0 !important;}
  .nc-tag{letter-spacing:0 !important;font-size:12px !important;}
}
</style>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#f5f7fa;">Welcome to North Crescent! Your request is registered. Send us a few photos to complete your quote.</div>
<table width="100%" border="0" cellspacing="0" cellpadding="0" bgcolor="#f5f7fa" style="background:#f5f7fa;">
<tr><td align="center" class="nc-out" style="padding:28px 12px;">
<table width="640" border="0" cellspacing="0" cellpadding="0" style="width:100%;max-width:640px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #E5E7EB;font-family:Cambria,Georgia,'Times New Roman',serif;">

<tr><td align="center" bgcolor="#1E3A5F" style="background:#1E3A5F;padding:15px 24px;"><span class="nc-tag" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#ffffff;font-size:14px;font-weight:bold;letter-spacing:1.5px;line-height:1.5;">You&#8217;ve Worked Hard to Build Your Business. We&#8217;ll Work Hard to Care for It.</span></td></tr>
<tr><td height="5" bgcolor="#4A9B8C" style="height:5px;line-height:5px;font-size:0;background:#4A9B8C;">&nbsp;</td></tr>

<tr><td align="center" style="padding:26px 24px 12px 24px;"><a href="https://northcrescentcleaning.com/"><img src="https://northcrescentcleaning.com/images/email/email-banner.jpg" alt="North Crescent Facility Solutions Inc." width="592" style="display:block;width:100%;max-width:592px;height:auto;border:0;"></a></td></tr>

<tr><td align="center" style="padding:6px 10px 14px 10px;"><table role="presentation" width="100%" border="0" cellspacing="4" cellpadding="0"><tr><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/commercial-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">🏢<br>Commercial Cleaning</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/office-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">💼<br>Office Cleaning</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/janitorial-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">🧹<br>Janitorial Services</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/deep-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">✨<br>Deep Cleaning</a></td></tr><tr><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/airbnb-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">🛏️<br>Airbnb Cleaning</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/post-construction-cleaning-moncton" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">🏗️<br>Post-Construction</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/services" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">📋<br>Services</a></td><td width="25%" align="center" bgcolor="#4A9B8C" style="background:#4A9B8C;border-radius:8px;padding:12px 4px;"><a class="nc-mi" href="https://northcrescentcleaning.com/contact" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#ffffff;text-decoration:none;font-size:13px;font-weight:bold;line-height:18px;display:block;">✉️<br>Contact Us</a></td></tr></table></td></tr>

<tr><td align="center" class="nc-pad" style="padding:6px 40px 22px 40px;"><h1 class="nc-h1" style="margin:0;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;font-weight:300;color:#4A9B8C;letter-spacing:.5px;">LESS MONEY. BETTER QUALITY. PROFESSIONAL SERVICE.</h1></td></tr>
<tr><td height="5" bgcolor="#4A9B8C" style="height:5px;line-height:5px;font-size:0;background:#4A9B8C;">&nbsp;</td></tr>

<!-- WELCOME + BOOKING -->
<tr><td align="center" style="padding:30px 32px 6px;"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" width="54" height="54" bgcolor="#EAF2F8" style="width:54px;height:54px;border-radius:27px;background:#EAF2F8;font-family:Arial,Helvetica,sans-serif;font-size:26px;line-height:54px;color:#4A9B8C;font-weight:bold;">&#10003;</td></tr></table>
<h2 style="margin:16px 0 6px;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:27px;line-height:1.25;color:#1E3A5F;font-weight:bold;">Welcome, [[CLIENT_NAME]] &#128153;</h2>
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#5B6573;">Your request has been received.</p></td></tr>


<tr><td class="nc-pad" style="padding:18px 40px 6px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:2px;color:#4A9B8C;font-weight:bold;padding-bottom:10px;">YOUR REQUEST SUMMARY</div><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">SERVICE</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;"><strong>[[SERVICE]]</strong></td></tr><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">ADDRESS</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;">[[ADDRESS]]</td></tr><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">FREQUENCY</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;">[[FREQUENCY]]</td></tr><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">TIME</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;">[[TIME]]</td></tr><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">CONTACT</td><td valign="top" style="padding:11px 14px;border-bottom:1px solid #E5E7EB;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;">[[PHONE]]<br>[[EMAIL]]</td></tr><tr><td width="34%" valign="top" bgcolor="#F8FAFC" style="background:#F8FAFC;padding:11px 14px;font-family:Arial,Helvetica,sans-serif;font-size:12px;letter-spacing:1px;color:#6B7280;font-weight:bold;">ABOUT YOUR SPACE</td><td valign="top" style="padding:11px 14px;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#1E3A5F;">[[NOTES]]</td></tr></table></td></tr>

<!-- WELCOME LETTER -->
<tr><td class="nc-pad" style="padding:30px 40px 36px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.85;color:#1E3A5F;">
<p style="margin:0 0 22px 0;">At North Crescent, we know that every space represents something important: your home, your business, your dreams, or the place where you build your future. That&#39;s why our commitment goes beyond keeping it clean and well-maintained. We work with dedication, responsibility, and attention to every detail so you can enjoy an environment that inspires confidence, brings you peace of mind, and allows you to focus on what truly matters to you.</p>
<p style="margin:0 0 12px 0;"><strong>&#127969; Let&#39;s complete your personalized quote for [[SERVICE]]!</strong></p>
<p style="margin:0 0 16px 0;">To help us better understand your property&#39;s needs and provide you with the most accurate and competitive quote possible, we invite you to share a few photos or a short video of the areas you&#39;d like us to service.</p>
<p style="margin:0 0 10px 0;"><strong>&#128248; You can send your photos or video through either of these convenient channels:</strong></p>
<p style="margin:0 0 8px 0;">&#128231; <strong>Email:</strong> Simply reply to this email.</p>
<p style="margin:0 0 16px 0;">&#128241; <strong>Text Message or WhatsApp:</strong> <a href="sms:+14288880542" style="color:#1E3A5F;text-decoration:underline;">+1 (428) 888-0542</a></p>
<p style="margin:0 0 16px 0;">Our team will carefully review the information you provide to better understand your needs and prepare a quote tailored to your property and service requirements.</p>
<p style="margin:0 0 12px 0;"><strong>&#128153; Your space deserves care. You deserve peace of mind.</strong></p>
<p style="margin:0 0 16px 0;">At North Crescent, we are committed to providing reliable service, professional attention, and a personalized experience from the very beginning.</p>
<p style="margin:0 0 16px 0;">Thank you for considering us. We look forward to earning your trust and making a positive difference in your space.</p>
<p style="margin:0 0 6px 0;"><strong>North Crescent Facility Solutions Inc.</strong></p>
<p style="margin:0;"><em>We take care of your spaces, so you can focus on your success and well-being.</em></p>
</td></tr>

<tr><td align="center" style="padding:0 0 4px 0;"><table border="0" cellspacing="0" cellpadding="0"><tr><td align="center" bgcolor="#4A9B8C" style="background:#4A9B8C;border-radius:10px;"><a href="sms:+14288880542" style="display:inline-block;padding:14px 30px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">&#128241; Send Photos by Text</a></td></tr></table></td></tr>
<tr><td height="30" style="height:30px;line-height:30px;font-size:0;">&nbsp;</td></tr>
<tr><td height="5" bgcolor="#4A9B8C" style="height:5px;line-height:5px;font-size:0;background:#4A9B8C;">&nbsp;</td></tr>

<!-- OFFER IMAGE -->
<tr><td align="center" style="padding:30px 30px 24px 30px;"><a href="https://northcrescentcleaning.com/"><img src="https://res.cloudinary.com/diqkvbbsr/image/upload/v1787012512/cleanin-Property-Management-nb_gcdasi.png" alt="Property management cleaning services in New Brunswick" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:12px;"></a></td></tr>

<!-- CONNECT -->
<tr><td align="center" style="padding:4px 24px 34px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;letter-spacing:2px;color:#4A9B8C;margin-bottom:16px;">CONNECT WITH NORTH CRESCENT</div>
<table role="presentation" width="100%" border="0" cellspacing="6" cellpadding="0"><tr><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:14px 4px;"><a href="https://northcrescentcleaning.com" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:14px;font-weight:bold;display:block;line-height:20px;">🌐<br>Website</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:14px 4px;"><a href="mailto:info@northcrescentcleaning.com" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:14px;font-weight:bold;display:block;line-height:20px;">✉️<br>Email</a></td><td width="25%" align="center" bgcolor="#F4F8FA" style="background:#F4F8FA;border:1px solid #DCE7EC;border-radius:8px;padding:14px 4px;"><a href="tel:+14288880542" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#1E3A5F;text-decoration:none;font-size:14px;font-weight:bold;display:block;line-height:20px;">📞<br>Phone</a></td><td width="25%" align="center" bgcolor="#4A9B8C" style="background:#4A9B8C;border-radius:8px;padding:14px 4px;"><a href="https://www.facebook.com/profile.php?id=61590535282882" style="font-family:Cambria,Georgia,'Times New Roman',serif;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;display:block;line-height:20px;">🌍<br>Social</a></td></tr></table>
<div style="margin-top:18px;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:17px;"><a href="https://www.linkedin.com/company/north-crescent-facility-solutions-inc/" style="color:#1E3A5F;text-decoration:none;font-weight:bold;">LinkedIn</a> &nbsp;|&nbsp; <a href="https://www.instagram.com/northcrescentcleaning/" style="color:#1E3A5F;text-decoration:none;font-weight:bold;">Instagram</a> &nbsp;|&nbsp; <a href="https://www.facebook.com/profile.php?id=61590535282882" style="color:#1E3A5F;text-decoration:none;font-weight:bold;">Facebook</a></div></td></tr>
<tr><td height="5" bgcolor="#4A9B8C" style="height:5px;line-height:5px;font-size:0;background:#4A9B8C;">&nbsp;</td></tr>

<!-- SERVICES -->
<tr><td align="center" class="nc-pad" style="padding:30px 40px 6px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:bold;letter-spacing:2px;color:#4A9B8C;margin-bottom:10px;">HOW CAN WE SUPPORT YOUR ORGANIZATION?</div><h2 style="margin:0;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;color:#1E3A5F;">Professional Facility Solutions</h2></td></tr>
<tr><td class="nc-pad" style="padding:22px 32px 10px;"><table width="100%" border="0" cellspacing="0" cellpadding="0"><tr><td style="padding:0 0 16px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">🏢 Commercial Cleaning</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1E3A5F;"><p style="margin:0 0 12px 0;">Professional facility solutions that help your organization maintain safe, efficient, and welcoming environments where employees perform at their best, customers feel confident, and daily operations run smoothly.</p><p style="margin:0 0 12px 0;">We understand that your facilities reflect your organization&#39;s standards and reputation. That&#39;s why we deliver tailored solutions that strengthen your operations while providing the peace of mind that comes from having a trusted strategic partner by your side.</p><p style="margin:0 0 12px 0;">We create clean, healthy, and welcoming environments that enhance productivity, inspire confidence, and elevate the experience of every employee, customer, and visitor.</p></div></td></tr></table></td></tr><tr><td style="padding:0 0 16px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">🧹 Janitorial Services</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1E3A5F;"><p style="margin:0 0 12px 0;">More than a cleaning service, we develop professional facility maintenance solutions that support the daily operations of commercial facilities, office buildings, residential properties, and multi-unit communities. Our approach strengthens operational standards and gives you the peace of mind of knowing your facilities are always in trusted hands.</p><p style="margin:0 0 12px 0;">Every solution we provide is tailored to your property&#39;s unique needs, helping you maintain safe, professional, and welcoming environments where businesses thrive, residents feel comfortable, and visitors leave with a positive impression.</p></div></td></tr></table></td></tr><tr><td style="padding:0 0 16px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">🏨 Airbnb &amp; Short-Term Rental Cleaning</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1E3A5F;"><p style="margin:0 0 12px 0;">More than cleaning between stays, we provide comprehensive operational support designed to help your property perform at its best. From linen management and inventory coordination to quality inspections and maintenance support, we help protect your investment while giving you the confidence and peace of mind that every guest will arrive to a property that&#39;s truly ready.</p><p style="margin:0 0 12px 0;">Every turnover is managed with consistency, attention to detail, and a commitment to delivering an exceptional guest experience.</p></div></td></tr></table></td></tr><tr><td style="padding:0 0 16px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">🏗️ Post-Construction Cleaning</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1E3A5F;"><p style="margin:0 0 12px 0;">Every successful project deserves a flawless final presentation. At North Crescent Facility Solutions Inc., we understand that post-construction cleaning isn&#39;t simply the final step&mdash;it&#39;s part of the client experience and a reflection of your workmanship.</p><p style="margin:0 0 12px 0;">That&#39;s why we take the time to understand your project, your schedule, and your quality expectations before developing professional post-construction solutions that help you deliver clean, polished, and move-in-ready spaces.</p><p style="margin:0 0 12px 0;">Because when every detail reflects excellence, your reputation grows, your clients gain confidence, and your project is remembered for all the right reasons.</p></div></td></tr></table></td></tr><tr><td style="padding:0 0 16px 0;"><table width="100%" border="0" cellspacing="0" cellpadding="0" style="border:1px solid #E5E7EB;border-radius:12px;"><tr><td style="padding:20px 22px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">🏠 Residential Cleaning</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#1E3A5F;"><p style="margin:0 0 12px 0;">We create healthier, cleaner, and more comfortable homes through professional residential cleaning delivered by trained, trusted, and reliable professionals. Our goal is to give you the confidence and peace of mind of knowing your home and your family&#39;s wellbeing are always in caring hands.</p><p style="margin:0 0 12px 0;">Every visit is guided by professionalism, attention to detail, and a genuine commitment to creating a home where you can relax, recharge, and enjoy life&#39;s most important moments.</p></div></td></tr></table></td></tr></table></td></tr>

<tr><td align="center" style="padding:10px 30px 24px 30px;"><a href="https://northcrescentcleaning.com/"><img src="https://northcrescentcleaning.com/images/email/email-services.jpg" alt="Professional cleaning services" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:12px;"></a></td></tr>

<!-- WHY -->
<tr><td class="nc-pad" style="padding:0 32px 24px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAFC" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:16px;"><tr><td align="center" style="padding:34px 28px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;color:#4A9B8C;margin-bottom:14px;">WHY NORTH CRESCENT?</div><h3 style="margin:0 0 16px 0;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;line-height:1.5;font-weight:300;color:#1E3A5F;">North Crescent delivers professional, reliable cleaning with qualified teams, attention to detail and competitive pricing. Less money. Better quality. Professional service.</h3><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#5B6573;">Every organization is unique, and so is every solution we deliver. By understanding your goals, supporting your operations, and caring for your facilities with professionalism and purpose, we help create environments where people perform better, customers feel confident, and businesses continue to grow.</p></td></tr></table></td></tr>

<tr><td class="nc-pad" style="padding:0 32px 30px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="border:1px solid #E5E7EB;border-radius:16px;"><tr><td width="33%" valign="top" align="center" style="padding:24px 12px;border-right:1px solid #E5E7EB;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">Tailored Solutions</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6B7280;">Every recommendation is developed around your operational needs.</div></td><td width="33%" valign="top" align="center" style="padding:24px 12px;border-right:1px solid #E5E7EB;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">Reliable Partnership</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6B7280;">Professional communication, dependable service, and long-term support.</div></td><td width="33%" valign="top" align="center" style="padding:24px 12px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;color:#4A9B8C;margin-bottom:10px;">Peace of Mind</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.7;color:#6B7280;">Operate confidently knowing your facility is in trusted hands.</div></td></tr></table></td></tr>

<!-- CLOSING -->
<tr><td class="nc-pad" style="padding:0 32px 30px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#F8FAFC" style="background:#F8FAFC;border:1px solid #E5E7EB;border-radius:16px;"><tr><td align="center" style="padding:36px 28px;"><div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:bold;letter-spacing:2px;color:#4A9B8C;margin-bottom:14px;">LET&#39;S START THE CONVERSATION</div><h3 style="margin:0 0 16px 0;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:24px;line-height:1.35;font-weight:300;color:#1E3A5F;">We Look Forward to Learning More About Your Business</h3><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#5B6573;">We would welcome the opportunity to learn more about your organization and explore how North Crescent Facility Solutions Inc. can help strengthen your daily operations through professional, reliable, and tailored facility solutions.</p></td></tr></table></td></tr>

<!-- SIGNATURE -->
<tr><td align="center" style="padding:0 40px 30px;"><div style="width:80px;height:5px;background:#4A9B8C;border-radius:30px;margin:0 auto 22px auto;font-size:0;line-height:0;">&nbsp;</div><h2 style="margin:0;font-family:Cambria,Georgia,'Times New Roman',serif;font-size:28px;font-weight:300;color:#4A9B8C;">North Crescent Facility Solutions Inc.</h2><p style="margin:14px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#5B6573;">We take care of your spaces, so you can focus on your success&mdash;with the confidence and peace of mind that everything is in trusted hands.</p></td></tr>

<tr><td align="center" style="padding:10px 30px 24px 30px;"><a href="https://northcrescentcleaning.com/"><img src="https://northcrescentcleaning.com/images/email/email-property.jpg" alt="Property management support services" width="580" style="display:block;width:100%;max-width:580px;height:auto;border:0;border-radius:12px;"></a></td></tr>

<!-- FOOTER -->
<tr><td align="center" bgcolor="#1E3A5F" style="background:#1E3A5F;padding:40px 28px 34px;"><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:20px;font-weight:bold;letter-spacing:2px;color:#ffffff;text-transform:uppercase;margin-bottom:10px;">North Crescent Facility Solutions Inc.</div><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:15px;color:#ffffff;margin-bottom:14px;">Professional Facility Solutions</div><div style="font-family:Cambria,Georgia,'Times New Roman',serif;font-size:13px;line-height:22px;color:#EAF2F8;">Proudly Serving Moncton &bull; Dieppe &bull; Riverview &bull; Shediac &bull; Surrounding Communities</div><div style="width:80px;height:2px;background:#4A9B8C;margin:22px auto;font-size:0;line-height:0;">&nbsp;</div><div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:22px;color:#C7D8E7;">Need to change something? Reply to this email or call <a href="tel:+14288880542" style="color:#ffffff;text-decoration:underline;">+1 (428) 888-0542</a> and mention your name.<br><br>&copy; 2026 North Crescent Facility Solutions Inc.<br>All Rights Reserved.</div></td></tr>

</table>
</td></tr>
</table>
</body>
</html>
`;

const buildWelcomeEmail = (request) => {
  const address = [request.serviceAddress, request.city, request.province, request.postalCode]
    .filter(Boolean).join(", ");
  const frequency = [request.frequencyLabel || request.visitsPerMonth, request.recurringVisits]
    .filter(Boolean).join(" — ");
  const notes = [
    request.squareFootage ? "Approx. size: " + request.squareFootage + " sq ft" : "",
    request.operationalSummary
  ].filter(Boolean).join("\n");

  const values = {
    CLIENT_NAME: escapeHtml(request.clientName),
    SERVICE: escapeHtml(request.serviceType),
    ADDRESS: escapeHtml(address),
    FREQUENCY: escapeHtml(frequency || "Not specified"),
    TIME: escapeHtml(request.timeSlot || "Not specified"),
    PHONE: escapeHtml(request.phoneNumber),
    EMAIL: escapeHtml(request.emailAddress),
    NOTES: notes ? escapeHtml(notes).replace(/\r?\n/g, "<br>") : "Not provided"
  };

  return EMAIL_TEMPLATE.replace(/\[\[([A-Z_]+)\]\]/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? values[key] : match
  );
};

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
      body: JSON.stringify({ ...request, emailHtml: buildWelcomeEmail(request) })
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
