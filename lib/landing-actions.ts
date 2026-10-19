"use server";

import { redirect } from "next/navigation";
import { appBaseUrl, brandLogoEmailHtml } from "./app-url";
import {
  demoPacketUrl,
  isUsZip,
  makeDemoWebhookUrl,
  postDemoLeadToMake,
  qualifyDemoLead,
  type DemoLead,
} from "./demo-lead";
import { mailIsConfigured, sendEmail } from "./mail";
import { isPlanId, PLANS } from "./plans";
import { signupNotifyEmail } from "./signup-notify";

function formString(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function escapeMailHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function leadText(lead: DemoLead, reason: string) {
  return [
    `Name: ${lead.name}`,
    lead.company ? `Company: ${lead.company}` : "",
    `Email: ${lead.email}`,
    lead.phone ? `Phone: ${lead.phone}` : "",
    `ZIP: ${lead.zip}`,
    `Version: ${lead.planLabel} (${lead.plan})`,
    lead.message ? `Message:\n${lead.message}` : "",
    reason ? `Qualification: ${reason}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

async function sendDemoNotice(lead: DemoLead, reason: string, qualified: boolean) {
  const text = leadText(lead, reason);
  const subject = qualified
    ? `Qualified Ag Desk Pro demo: ${lead.company || lead.name}`
    : `Ag Desk Pro demo (not qualified automatically): ${lead.company || lead.name}`;
  return sendEmail({
    to: signupNotifyEmail(),
    subject,
    text,
    html: `<p>${qualified ? "Qualified demo request." : "Demo request. Automatic qualification did not pass."}</p><pre>${escapeMailHtml(text)}</pre>`,
  });
}

async function sendDemoPacket(lead: DemoLead) {
  const packetUrl = demoPacketUrl();
  const first = lead.name.trim().split(/\s+/)[0] || "there";
  const text = [
    `Hi ${first},`,
    "",
    "Thanks for requesting an Ag Desk Pro demo.",
    "",
    `Your welcome packet: ${packetUrl}`,
    "",
    `You asked about ${lead.planLabel}. We will follow up about a demo.`,
    "Call or text (229) 304-6901, or email david@agdeskpro.com.",
    "",
    "Ag Desk Pro",
  ].join("\n");
  const site = appBaseUrl() || "https://agdeskpro.com";
  return sendEmail({
    to: lead.email,
    fromName: "Ag Desk Pro",
    subject: "Your Ag Desk Pro welcome packet",
    text,
    html: `
      ${brandLogoEmailHtml()}
      <p>Hi ${escapeMailHtml(first)},</p>
      <p>Thanks for requesting an Ag Desk Pro demo.</p>
      <p><a href="${escapeMailHtml(packetUrl)}">Open your welcome packet</a></p>
      <p>You asked about ${escapeMailHtml(lead.planLabel)}. We will follow up about a demo.</p>
      <p>Call or text <a href="tel:+12293046901">(229) 304-6901</a>, or email <a href="mailto:david@agdeskpro.com">david@agdeskpro.com</a>.</p>
      <p><a href="${escapeMailHtml(site)}">agdeskpro.com</a></p>
    `,
  });
}

export async function landingDemoAction(formData: FormData) {
  const name = formString(formData, "name");
  const company = formString(formData, "company");
  const email = formString(formData, "email");
  const phone = formString(formData, "phone");
  const zip = formString(formData, "zip");
  const plan = formString(formData, "plan").toUpperCase();
  const message = formString(formData, "message");
  if (!name || !email) {
    return { error: "Name and email are required." };
  }
  if (!isUsZip(zip)) {
    return { error: "Enter a 5-digit US ZIP code." };
  }
  if (!isPlanId(plan)) {
    return { error: "Choose which version you want: Starter, Shop, or Enterprise." };
  }
  const lead: DemoLead = {
    name,
    company,
    email,
    phone,
    zip,
    plan,
    planLabel: PLANS[plan].label,
    message,
  };

  if (makeDemoWebhookUrl()) {
    const posted = await postDemoLeadToMake(lead);
    if (!posted.ok) return { error: "Could not send that request. Call (229) 304-6901." };
    redirect("/?demo=1#contact");
  }

  if (!mailIsConfigured()) {
    return { error: "Demo requests are not configured yet. Call (229) 304-6901 or email david@agdeskpro.com." };
  }

  const verdict = await qualifyDemoLead(lead);
  if (verdict.status === "rejected") {
    console.info("Demo lead not qualified", lead.email, verdict.reason);
    redirect("/?demo=1#contact");
  }

  if (verdict.status === "qualified") {
    const packet = await sendDemoPacket(lead);
    if (!packet.ok) return { error: "Could not send that request. Call (229) 304-6901." };
  }

  const notice = await sendDemoNotice(lead, verdict.reason, verdict.status === "qualified");
  if (!notice.ok) return { error: "Could not send that request. Call (229) 304-6901." };
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
    return { error: "Support messages are not configured yet. Call (229) 304-6901 or email david@agdeskpro.com." };
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
    subject: `Ag Desk Pro support: ${company || name}`,
    text,
    html: `<p>Support message from the public Support page. No company was created.</p><pre>${escapeMailHtml(
      text,
    )}</pre>`,
  });
  if (!result.ok) return { error: "Could not send that message. Call (229) 304-6901." };
  redirect("/support?sent=1");
}
