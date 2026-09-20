import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { appBaseUrl, brandLogoEmailHtml } from "./app-url";
import { mailIsConfigured, sendEmail } from "./mail";

export { mailIsConfigured };

export type WelcomeMailStatus = "sent" | "skipped" | "failed";

export async function hashNewUserPassword(password: string) {
  if (password.length >= 8) {
    return { hash: await bcrypt.hash(password, 10), hadPassword: true };
  }
  return { hash: await bcrypt.hash(randomBytes(32).toString("hex"), 10), hadPassword: false };
}

export function welcomeQuery(path: string, status: WelcomeMailStatus) {
  const url = new URL(path, "http://local.invalid");
  url.searchParams.set("welcome", status);
  return `${url.pathname}${url.search}`;
}

export async function sendWelcomeLoginEmail(input: {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
  hadPassword: boolean;
}): Promise<WelcomeMailStatus> {
  const passwordLine = input.hadPassword
    ? "A password was created for you. Sign in with it, then use the link below to change it."
    : "Use the link below to choose a password, then sign in to the dashboard.";

  return sendPasswordLinkEmail({
    userId: input.userId,
    email: input.email,
    name: input.name,
    organizationName: input.organizationName,
    subject: `Welcome to ${input.organizationName}`,
    intro: `${input.organizationName} set up a dashboard login for you.`,
    passwordLine,
    days: 7,
  });
}

export async function sendPasswordResetEmail(input: {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
}): Promise<WelcomeMailStatus> {
  return sendPasswordLinkEmail({
    ...input,
    subject: `Reset your ${input.organizationName} password`,
    intro: `Someone asked to reset the ${input.organizationName} dashboard password for this email.`,
    passwordLine: "Use the link below to choose a new password. If you did not ask for this, you can ignore the email.",
    days: 1,
  });
}

async function issuePasswordToken(userId: string, days: number) {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({ where: { userId } });
  await prisma.passwordResetToken.create({
    data: { userId, tokenHash, expiresAt },
  });
  return token;
}

async function sendPasswordLinkEmail(input: {
  userId: string;
  email: string;
  name: string;
  organizationName: string;
  subject: string;
  intro: string;
  passwordLine: string;
  days: number;
}): Promise<WelcomeMailStatus> {
  if (!mailIsConfigured()) return "skipped";

  let token = "";
  try {
    token = await issuePasswordToken(input.userId, input.days);
  } catch (error) {
    console.error("Password reset token failed", error);
    return "failed";
  }
  const base = appBaseUrl();
  const setUrl = base ? `${base}/welcome?token=${token}` : "";
  const loginUrl = base ? `${base}/login` : "";
  const first = input.name.trim().split(/\s+/)[0] || "there";

  const text = [
    `Hi ${first},`,
    "",
    input.intro,
    input.passwordLine,
    loginUrl ? `Sign in: ${loginUrl}` : "Sign in from your dealer’s AG Service Desk site.",
    `Email: ${input.email}`,
    setUrl ? `Set or change your password (expires in ${input.days === 1 ? "24 hours" : `${input.days} days`}): ${setUrl}` : "",
    "",
    "If you did not expect this, tell your dealer.",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    ${brandLogoEmailHtml()}
    <p>Hi ${escapeHtml(first)},</p>
    <p>${escapeHtml(input.intro)}</p>
    <p>${escapeHtml(input.passwordLine)}</p>
    ${loginUrl ? `<p><a href="${escapeHtml(loginUrl)}">Open the dashboard</a></p>` : ""}
    <p>Email: ${escapeHtml(input.email)}</p>
    ${
      setUrl
        ? `<p><a href="${escapeHtml(setUrl)}">Set or change your password</a> (this link expires in ${
            input.days === 1 ? "24 hours" : `${input.days} days`
          }).</p>`
        : ""
    }
    <p>If you did not expect this, tell your dealer.</p>
  `;

  const result = await sendEmail({
    to: input.email,
    subject: input.subject,
    text,
    html,
  });
  return result.ok ? "sent" : "failed";
}

export async function userFromPasswordToken(token: string) {
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: { user: { include: { organization: true } } },
  });
  if (!row || row.expiresAt < new Date()) return null;
  return row;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
