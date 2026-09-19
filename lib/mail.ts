import nodemailer from "nodemailer";

export function mailIsConfigured() {
  return Boolean(process.env.EMAIL_FROM && (process.env.RESEND_API_KEY || process.env.SMTP_HOST));
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const from = process.env.EMAIL_FROM?.trim();
  if (!from) return { ok: false, error: "EMAIL_FROM is not set." };

  const resendKey = process.env.RESEND_API_KEY?.trim();
  if (resendKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("Resend email failed", response.status, detail);
      return { ok: false, error: "Welcome email could not be sent." };
    }
    return { ok: true };
  }

  const host = process.env.SMTP_HOST?.trim();
  if (!host) return { ok: false, error: "Email is not configured." };

  const port = Number(process.env.SMTP_PORT || "587");
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth:
      process.env.SMTP_USER && process.env.SMTP_PASS
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined,
  });

  try {
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html: input.html,
    });
    return { ok: true };
  } catch (error) {
    console.error("SMTP email failed", error);
    return { ok: false, error: "Welcome email could not be sent." };
  }
}
