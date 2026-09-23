"use server";

import { redirect } from "next/navigation";
import { getSession } from "./auth";
import { mailIsConfigured, sendEmail } from "./mail";
import { signupNotifyEmail } from "./signup-notify";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function escapeMailHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export async function deskSupportAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");

  const name = formString(formData, "name");
  const email = formString(formData, "email");
  const message = formString(formData, "message");
  const company = session.organizationName;
  if (!name || !email || !message) {
    return { error: "Name, email, and a feature request or message are required." };
  }
  if (!mailIsConfigured()) {
    return { error: "Support messages are not configured yet. Email david@agdeskpro.com." };
  }

  const text = [
    `Name: ${name}`,
    `Email: ${email}`,
    `Company: ${company}`,
    `Signed in as: ${session.name} <${session.email}>`,
    `Role: ${session.role}`,
    `Message:\n${message}`,
  ].join("\n");

  const result = await sendEmail({
    to: signupNotifyEmail(),
    subject: `AG Desk Pro feature request: ${company}`,
    text,
    html: `<p>Feature request from the desk Support page.</p><pre>${escapeMailHtml(text)}</pre>`,
  });
  if (!result.ok) return { error: "Could not send that message. Email david@agdeskpro.com." };
  redirect("/help?sent=1");
}
