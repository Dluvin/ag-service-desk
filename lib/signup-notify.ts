import { appBaseUrl, brandLogoEmailHtml } from "./app-url";
import { sendEmail, mailIsConfigured } from "./mail";
import { PLAN } from "./plan";

export function signupNotifyEmail() {
  return (process.env.SIGNUP_NOTIFY_EMAIL || "david@agdeskpro.com").trim();
}

export type SignupDetails = {
  company: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
  staffCount: string;
  notes: string;
};

export async function emailSignupToOwner(details: SignupDetails) {
  if (!mailIsConfigured()) return "skipped" as const;
  const platform = appBaseUrl() ? `${appBaseUrl()}/platform` : "/platform";
  const lines = [
    `Company: ${details.company}`,
    `Contact: ${details.name}`,
    details.title ? `Title: ${details.title}` : "",
    `Email: ${details.email}`,
    details.phone ? `Phone: ${details.phone}` : "",
    [details.address, details.city, details.region, details.postalCode].filter(Boolean).join(", "),
    details.staffCount ? `Estimated staff: ${details.staffCount}` : "",
    details.notes ? `Notes: ${details.notes}` : "",
    "",
    `Plan: ${PLAN.trialDays}-day trial, then $${PLAN.monthlyDollars}/month for ${PLAN.includedSeats} staff seats. Extra seats $${PLAN.extraSeatDollars}/month.`,
    `Approve in the tenant portal: ${platform}`,
  ].filter(Boolean);

  const result = await sendEmail({
    to: signupNotifyEmail(),
    subject: `New AG Desk Pro signup: ${details.company}`,
    text: lines.join("\n"),
    html: `<p>A company requested an AG Desk Pro tenant.</p><pre>${escapeHtml(lines.join("\n"))}</pre>`,
  });
  return result.ok ? ("sent" as const) : ("failed" as const);
}

export async function emailTenantApproved(input: {
  to: string;
  name: string;
  company: string;
  checkoutUrl: string;
}) {
  if (!mailIsConfigured()) return "skipped" as const;
  const login = appBaseUrl() ? `${appBaseUrl()}/login` : "/login";
  const trial = `${PLAN.trialDays}-day trial`;
  const text = [
    `Hi ${input.name.split(" ")[0] || "there"},`,
    "",
    `${input.company} is approved on AG Desk Pro. Sign in and use the demo customer/work order we loaded for your ${trial}.`,
    `After ${PLAN.trialDays} days the plan is $${PLAN.monthlyDollars}/month for ${PLAN.includedSeats} staff seats. Extra seats are $${PLAN.extraSeatDollars}/month.`,
    `Sign in: ${login}`,
    input.checkoutUrl ? `Set up billing (card, ${trial} before the first charge): ${input.checkoutUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  const result = await sendEmail({
    to: input.to,
    subject: `${input.company} is approved on AG Desk Pro`,
    text,
    html: `${brandLogoEmailHtml()}<p>${escapeHtml(text).replaceAll("\n", "<br/>")}</p>`,
  });
  return result.ok ? ("sent" as const) : ("failed" as const);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
