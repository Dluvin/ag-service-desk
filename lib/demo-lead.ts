import { appBaseUrl } from "./app-url";

export type DemoLead = {
  name: string;
  company: string;
  email: string;
  phone: string;
  zip: string;
  plan: string;
  planLabel: string;
  message: string;
};

export type DemoVerdict =
  | { status: "qualified"; reason: string }
  | { status: "rejected"; reason: string }
  | { status: "unconfigured"; reason: string }
  | { status: "error"; reason: string };

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "10minutemail.com",
  "tempmail.com",
  "temp-mail.org",
  "yopmail.com",
  "trashmail.com",
  "getnada.com",
  "sharklasers.com",
  "dispostable.com",
  "mailnesia.com",
]);

export function isUsZip(zip: string) {
  return /^\d{5}$/.test(zip);
}

export function isDisposableEmail(email: string) {
  const domain = email.split("@")[1]?.toLowerCase().trim() ?? "";
  return DISPOSABLE_DOMAINS.has(domain);
}

export function demoPacketUrl() {
  const base = appBaseUrl();
  return base ? `${base}/demo-packet` : "/demo-packet";
}

export function makeDemoWebhookUrl() {
  return process.env.MAKE_DEMO_WEBHOOK_URL?.trim() || "";
}

export async function postDemoLeadToMake(lead: DemoLead) {
  const url = makeDemoWebhookUrl();
  if (!url) return { ok: false as const, error: "Make webhook is not set." };
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...lead,
      welcomePacketUrl: demoPacketUrl(),
      notifyEmail: process.env.SIGNUP_NOTIFY_EMAIL?.trim() || "david@agdeskpro.com",
    }),
  });
  if (!response.ok) {
    console.error("Make demo webhook failed", response.status, await response.text());
    return { ok: false as const, error: "Could not send that request." };
  }
  return { ok: true as const };
}

export async function qualifyDemoLead(lead: DemoLead): Promise<DemoVerdict> {
  if (isDisposableEmail(lead.email)) {
    return { status: "rejected", reason: "Disposable email address." };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "unconfigured",
      reason: "ANTHROPIC_API_KEY is not set, so Claude did not qualify this lead.",
    };
  }

  const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-haiku-4-5";
  const prompt = [
    "Qualify this Ag Desk Pro demo request. Ag Desk Pro is software for irrigation dealers and service shops.",
    "Say yes only if this looks like a real business that could buy the product.",
    "Say no for spam, students, empty tests, vendors selling to us, or a company name that is blank or nonsense.",
    "A selected plan and a 5-digit ZIP are already checked. Use them as context, not as proof.",
    "If a phone is present, it should look like a real US number. A missing phone is allowed.",
    "Return only JSON: {\"qualified\": true or false, \"reason\": \"one sentence\"}",
    "",
    `Name: ${lead.name}`,
    `Company: ${lead.company || "(blank)"}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "(blank)"}`,
    `ZIP: ${lead.zip}`,
    `Plan: ${lead.planLabel} (${lead.plan})`,
    `Message: ${lead.message || "(blank)"}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!response.ok) {
      console.error("Claude demo qualification failed", response.status, await response.text());
      return { status: "error", reason: "Claude could not qualify this lead." };
    }
    const payload = (await response.json()) as {
      content?: { type?: string; text?: string }[];
    };
    const text = payload.content?.find((part) => part.type === "text")?.text ?? "";
    const parsed = parseVerdict(text);
    if (!parsed) return { status: "error", reason: "Claude returned an unreadable answer." };
    return parsed.qualified
      ? { status: "qualified", reason: parsed.reason }
      : { status: "rejected", reason: parsed.reason };
  } catch (error) {
    console.error("Claude demo qualification failed", error);
    return { status: "error", reason: "Claude could not qualify this lead." };
  }
}

function parseVerdict(text: string): { qualified: boolean; reason: string } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const value = JSON.parse(match[0]) as { qualified?: unknown; reason?: unknown };
    if (typeof value.qualified !== "boolean") return null;
    const reason = typeof value.reason === "string" ? value.reason.trim() : "";
    return { qualified: value.qualified, reason: reason || (value.qualified ? "Qualified." : "Not qualified.") };
  } catch {
    return null;
  }
}
