// ─────────────────────────────────────────────────────────────
//  GeeksforGeeks Mailer — professional Brevo email templates
// ─────────────────────────────────────────────────────────────

function otpCode() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

const LOGO_SVG = `
  <table cellpadding="0" cellspacing="0" border="0">
    <tr>
      <td style="width:40px;height:40px;border-radius:8px;background:#2f8d46;text-align:center;vertical-align:middle;">
        <span style="color:#fff;font-size:22px;font-weight:900;font-family:Arial,sans-serif;">G</span>
      </td>
      <td style="padding-left:10px;vertical-align:middle;">
        <span style="font-size:18px;font-weight:900;color:#2f8d46;font-family:Arial,sans-serif;letter-spacing:-0.5px;">GeeksforGeeks</span>
      </td>
    </tr>
  </table>`

const SOCIAL_ROW = `
  <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 0;">
    <tr>
      <td style="padding:0 6px;">
        <a href="https://facebook.com/geeksforgeeks.org" style="display:inline-block;width:32px;height:32px;background:#1877f2;border-radius:50%;text-align:center;line-height:32px;">
          <span style="color:#fff;font-size:14px;font-weight:700;font-family:Arial;">f</span>
        </a>
      </td>
      <td style="padding:0 6px;">
        <a href="https://instagram.com/geeks_for_geeks" style="display:inline-block;width:32px;height:32px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);border-radius:50%;text-align:center;line-height:32px;">
          <span style="color:#fff;font-size:12px;font-family:Arial;">✦</span>
        </a>
      </td>
      <td style="padding:0 6px;">
        <a href="https://youtube.com/geeksforgeeks" style="display:inline-block;width:32px;height:32px;background:#ff0000;border-radius:50%;text-align:center;line-height:32px;">
          <span style="color:#fff;font-size:12px;font-family:Arial;">▶</span>
        </a>
      </td>
    </tr>
  </table>`

function emailShell({ preheader = '', body = '' } = {}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>GeeksforGeeks</title>
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#f4f6fb;">${preheader}</div>` : ''}
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f6fb;padding:24px 16px;">
  <tr>
    <td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">

        <!-- HEADER -->
        <tr>
          <td style="background:#fff;padding:24px 32px 16px;border-bottom:1px solid #f0f0f0;">
            ${LOGO_SVG}
          </td>
        </tr>

        <!-- BODY -->
        <tr>
          <td style="padding:28px 32px 24px;">
            ${body}
          </td>
        </tr>

        <!-- EXPLORE STRIP -->
        <tr>
          <td style="background:#f8fdf9;border-top:1px solid #e8f5eb;border-bottom:1px solid #e8f5eb;padding:18px 32px;text-align:center;">
            <p style="margin:0 0 12px;font-size:13px;color:#6b7280;">Explore the unlimited learning opportunities:</p>
            <table cellpadding="0" cellspacing="0" border="0" align="center">
              <tr>
                <td style="padding:0 6px;">
                  <a href="http://localhost:5173/courses" style="display:inline-block;background:#2f8d46;color:#fff;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;">Courses</a>
                </td>
                <td style="padding:0 6px;">
                  <a href="http://localhost:5173/practice" style="display:inline-block;background:#fff;color:#2f8d46;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #2f8d46;">Practice</a>
                </td>
                <td style="padding:0 6px;">
                  <a href="http://localhost:5173/learn" style="display:inline-block;background:#fff;color:#2f8d46;padding:8px 18px;border-radius:999px;font-size:13px;font-weight:700;text-decoration:none;border:1px solid #2f8d46;">Tutorials</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- FOOTER -->
        <tr>
          <td style="padding:20px 32px;text-align:center;">
            <p style="margin:0 0 6px;font-size:13px;color:#6b7280;">
              We hope we can help you in achieving your career goals and that you level up your skills one coding problem a day!
            </p>
            <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">
              If you have any queries, you can write to us at
              <a href="mailto:courses@geekpath.dev" style="color:#2f8d46;">courses@geekpath.dev</a>
            </p>
            <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">
              <a href="http://localhost:5173/dashboard" style="color:#2f8d46;text-decoration:none;">See My Profile</a>
              &nbsp;|&nbsp;
              <a href="http://localhost:5173/profile" style="color:#2f8d46;text-decoration:none;">Edit My Profile</a>
            </p>
            ${SOCIAL_ROW}
            <p style="margin:16px 0 0;font-size:11px;color:#c0c0c0;">
              Write to us: <a href="mailto:courses@geekpath.dev" style="color:#9ca3af;">courses@geekpath.dev</a>
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}

// ── VERIFY EMAIL ─────────────────────────────────────────────
function verifyTemplate({ name, otp, verifyUrl }) {
  return emailShell({
    preheader: `Hi ${name}, please verify your GeeksforGeeks account to get started.`,
    body: `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111;letter-spacing:-0.5px;">Verify Your Email</h2>
      <p style="margin:0 0 18px;font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 8px;font-size:14px;color:#374151;">
        Thank you for registering. Your account details are:
      </p>
      <table cellpadding="0" cellspacing="0" border="0" style="background:#f8fdf9;border:1px solid #e8f5eb;border-radius:10px;padding:14px 18px;margin:0 0 20px;width:100%;">
        <tr><td style="font-size:13px;color:#6b7280;padding:3px 0;"><strong style="color:#111;">Username:</strong> ${name}</td></tr>
      </table>
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">
        Please use this code to verify your email address:
      </p>
      <div style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:12px;padding:18px;text-align:center;margin:0 0 20px;">
        <div style="letter-spacing:10px;font-size:32px;font-weight:900;color:#166534;font-variant-numeric:tabular-nums;">${otp}</div>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">This code expires in <strong>10 minutes</strong></p>
      </div>
      ${verifyUrl ? `
      <p style="margin:0 0 12px;font-size:14px;color:#374151;">Or click the button below to verify directly:</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
        <tr>
          <td style="background:#2f8d46;border-radius:8px;">
            <a href="${verifyUrl}" style="display:inline-block;padding:13px 28px;color:#fff;font-size:15px;font-weight:700;text-decoration:none;">Verify Email</a>
          </td>
        </tr>
      </table>` : ''}
      <p style="margin:0;font-size:12px;color:#9ca3af;">If you did not create an account, you can safely ignore this email.</p>
    `,
  })
}

// ── PASSWORD RESET ────────────────────────────────────────────
function resetTemplate({ name, otp }) {
  return emailShell({
    preheader: `Reset your GeeksforGeeks password — your code is inside.`,
    body: `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111;letter-spacing:-0.5px;">Reset Your Password</h2>
      <p style="margin:0 0 18px;font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        We received a request to reset the password for your GeeksforGeeks account.
        Use the code below to set a new password. It expires in <strong>10 minutes</strong>.
      </p>
      <div style="background:#fff8f0;border:2px solid #fed7aa;border-radius:12px;padding:18px;text-align:center;margin:0 0 20px;">
        <div style="letter-spacing:10px;font-size:32px;font-weight:900;color:#c2410c;font-variant-numeric:tabular-nums;">${otp}</div>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Password reset code · expires in 10 minutes</p>
      </div>
      <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:12px 16px;margin:0 0 18px;">
        <p style="margin:0;font-size:13px;color:#991b1b;">
          🔒 If you did not request a password reset, please ignore this email. Your password will remain unchanged.
        </p>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">For security, this link can only be used once.</p>
    `,
  })
}

// ── 2FA SIGN-IN ───────────────────────────────────────────────
function twoFaTemplate({ name, otp }) {
  return emailShell({
    preheader: `Your GeeksforGeeks sign-in verification code: ${otp}`,
    body: `
      <h2 style="margin:0 0 6px;font-size:22px;font-weight:800;color:#111;letter-spacing:-0.5px;">Sign-In Verification</h2>
      <p style="margin:0 0 18px;font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 16px;font-size:14px;color:#374151;">
        Someone (hopefully you!) just tried to sign in to your GeeksforGeeks account. Use this code to complete sign-in:
      </p>
      <div style="background:#f0f4ff;border:2px solid #c7d2fe;border-radius:12px;padding:18px;text-align:center;margin:0 0 20px;">
        <div style="letter-spacing:10px;font-size:32px;font-weight:900;color:#3730a3;font-variant-numeric:tabular-nums;">${otp}</div>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">This code expires in <strong>10 minutes</strong></p>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">If this wasn't you, your password may be compromised. Please reset it immediately.</p>
    `,
  })
}

// ── CERTIFICATE EARNED ────────────────────────────────────────
function certificateTemplate({ name, courseTitle, certId, certUrl }) {
  return emailShell({
    preheader: `🎓 Congratulations ${name}! Your certificate for ${courseTitle} is ready.`,
    body: `
      <!-- celebration header -->
      <div style="text-align:center;margin-bottom:22px;">
        <div style="font-size:48px;line-height:1;margin-bottom:10px;">🎓</div>
        <h2 style="margin:0 0 4px;font-size:24px;font-weight:900;color:#111;letter-spacing:-0.5px;">Congratulations!</h2>
        <p style="margin:0;font-size:16px;color:#2f8d46;font-weight:700;">You've earned a certificate!</p>
      </div>

      <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${name}</strong>,</p>
      <p style="margin:0 0 18px;font-size:14px;color:#374151;line-height:1.6;">
        You have successfully completed the <strong style="color:#111;">${courseTitle}</strong> course on GeeksforGeeks.
        Your hard work and dedication have paid off — your certificate is ready to download!
      </p>

      <!-- certificate preview box -->
      <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f0fdf4;border:2px solid #bbf7d0;border-radius:14px;margin:0 0 22px;overflow:hidden;">
        <tr>
          <td style="padding:20px;text-align:center;">
            <div style="border:4px solid #2f8d46;border-radius:10px;padding:20px;background:#fff;display:inline-block;max-width:340px;width:100%;">
              <p style="margin:0 0 4px;font-size:11px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Certificate of Completion</p>
              <p style="margin:0 0 8px;font-size:12px;color:#6b7280;">This certifies that</p>
              <h3 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#2f8d46;border-bottom:2px solid #ecfdf3;padding-bottom:8px;">${name}</h3>
              <p style="margin:0 0 4px;font-size:12px;color:#6b7280;">has successfully completed</p>
              <p style="margin:0 0 12px;font-size:14px;font-weight:800;color:#111;">${courseTitle}</p>
              <p style="margin:0;font-size:10px;color:#9ca3af;font-family:monospace;">ID: ${certId}</p>
            </div>
          </td>
        </tr>
      </table>

      <!-- CTA button -->
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 22px;">
        <tr>
          <td style="background:#2f8d46;border-radius:8px;padding:0;">
            <a href="${certUrl}" style="display:inline-block;padding:14px 32px;color:#fff;font-size:16px;font-weight:700;text-decoration:none;">Download Certificate</a>
          </td>
        </tr>
      </table>

      <!-- what next -->
      <div style="background:#f8f9fa;border-radius:10px;padding:14px 16px;margin:0 0 10px;">
        <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#111;">What's next?</p>
        <ul style="margin:0;padding-left:18px;font-size:13px;color:#374151;line-height:1.8;">
          <li>Add this certificate to your <strong>LinkedIn profile</strong></li>
          <li>Share it with your network on social media</li>
          <li>Keep learning — explore more courses on GeeksforGeeks</li>
        </ul>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;">Your certificate can be verified at: <a href="${certUrl}" style="color:#2f8d46;">${certUrl}</a></p>
    `,
  })
}

// ── SEND VIA BREVO ────────────────────────────────────────────
async function send({ to, toName, subject, html }) {
  const key = process.env.BREVO_API_KEY
  const senderEmail = process.env.BREVO_SENDER_EMAIL
  if (!key || !senderEmail) {
    console.warn('[mailer] BREVO_API_KEY or BREVO_SENDER_EMAIL not set — skipping email send')
    return { skipped: true }
  }
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/json',
      'api-key': key,
    },
    body: JSON.stringify({
      sender: {
        name: process.env.BREVO_SENDER_NAME || 'GeeksforGeeks',
        email: senderEmail,
      },
      to: [{ email: to, name: toName || to }],
      subject,
      htmlContent: html,
    }),
  })
  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Brevo error: ${body}`)
  }
  return { sent: true }
}

// ── PUBLIC API ────────────────────────────────────────────────
export function makeOtp() {
  return otpCode()
}

export async function sendOtpEmail({ to, name, otp, purpose }) {
  const subjects = {
    verify: `[GeeksforGeeks] Verify your email address`,
    reset:  `[GeeksforGeeks] Reset your password`,
    '2fa':  `[GeeksforGeeks] Your sign-in verification code`,
  }
  const htmlMap = {
    verify: verifyTemplate({ name, otp, verifyUrl: null }),
    reset:  resetTemplate({ name, otp }),
    '2fa':  twoFaTemplate({ name, otp }),
  }
  return send({
    to,
    toName: name,
    subject: subjects[purpose] || subjects.verify,
    html: htmlMap[purpose] || htmlMap.verify,
  })
}

export async function sendCertificateEmail({ to, name, courseTitle, certId }) {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
  const certUrl = `${frontendUrl}/certificates/${certId}`
  return send({
    to,
    toName: name,
    subject: `🎓 Your GeeksforGeeks Certificate is Ready — ${courseTitle}`,
    html: certificateTemplate({ name, courseTitle, certId, certUrl }),
  })
}

export async function sendStudyCoachEmail({ to, name, title, body, courseTitle, courseUrl }) {
  const html = emailShell({
    preheader: title,
    body: `
      <p style="margin:0 0 8px;font-size:15px;color:#111;">Hi ${name || 'Geek'},</p>
      <h2 style="margin:0 0 12px;font-size:20px;color:#14532d;">${title}</h2>
      <p style="margin:0 0 16px;font-size:14px;color:#4b5563;line-height:1.7;white-space:pre-line;">${String(body || '').replace(/</g, '')}</p>
      ${courseUrl ? `<p style="margin:0 0 8px;"><a href="${courseUrl}" style="display:inline-block;background:#2f8d46;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:700;">Open ${courseTitle || 'course'}</a></p>` : ''}
    `,
  })
  return send({
    to,
    toName: name,
    subject: `[GeeksforGeeks] ${title}`,
    html,
  })
}
