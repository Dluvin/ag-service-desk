"use server";

import { redirect } from "next/navigation";
import { mailIsConfigured, sendEmail } from "./mail";
import { signupNotifyEmail } from "./signup-notify";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function escapeMailHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function landingDemoAction(formData: FormData) {
  const name = formString(formData, "name");
  const company = formString(formData, "company");
  const email = formString(formData, "email");
  const phone = formString(formData, "phone");
  const message = formString(formData, "message");
  if (!name || !email) {
    return { error: "Name and email are required." };
  }
  if (!mailIsConfigured()) {
    return { error: "Demo requests are not configured yet. Call 229-938-9000 or email info@agdeskpro.com." };
  }
  const text = [
    `Name: ${name}`,
    company ? `Company: ${company}` : "",
    `Email: ${email}`,
    phone ? `Phone: ${phone}` : "",
    message ? `Message:\n${message}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const result = await sendEmail({
    to: signupNotifyEmail(),
    subject: `AG Desk Pro demo request: ${company || name}`,
    text,
    html: `<p>Demo request from the landing page.</p><pre>${escapeMailHtml(text)}</pre>`,
  });
  if (!result.ok) return { error: "Could not send that request. Call 229-938-9000." };
  redirect("/?demo=1#contact");
}

export async function landingSupportAction(formData: FormData) {
  const name = formString(formData, "name");
  const company = formString(formData, "company");
  const email = formString(formData, "email");
  const message = formString(formData, "message");
  if (!name || !email || !message) {
    return { error: "Name, email, and message are required." };
  }
  if (!mailIsConfigured()) {
    return { error: "Support messages are not configured yet. Call 229-938-9000 or email info@agdeskpro.com." };
  }
  const text = [
    `Name: ${name}`,
    company ? `Company: ${company}` : "",
    `Email: ${email}`,
    `Message:\n${message}`,
  ]
    .filter(Boolean)
    .join("\n");
  const result = await sendEmail({
    to: signupNotifyEmail(),
    subject: `AG Desk Pro support: ${company || name}`,
    text,
    html: `<p>Support message from the public Support page. No company was created.</p><pre>${escapeMailHtml(
      text,
    )}</pre>`,
  });
  if (!result.ok) return { error: "Could not send that message. Call 229-938-9000." };
  redirect("/support?sent=1");
}
