type BirdConfig = {
  apiKey: string;
  from: string;
  workspaceId: string;
  channelId: string;
};

function birdHost(apiKey: string) {
  if (apiKey.startsWith("bk_eu1_")) return "https://eu1.platform.bird.com";
  return "https://us1.platform.bird.com";
}

export function toE164(raw: string | null | undefined) {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+") && digits.length >= 10 && digits.length <= 15) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function isPlaceholderUsNumber(e164: string) {
  return /^\+1\d{3}555/.test(e164);
}

export async function sendBirdSms(config: BirdConfig, to: string, text: string) {
  if (config.apiKey.startsWith("bk_")) {
    const response = await fetch(`${birdHost(config.apiKey)}/v1/sms/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        to,
        from: config.from,
        text,
        category: "transactional",
      }),
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail.slice(0, 400) || `Bird SMS failed (${response.status})`);
    }
    return;
  }

  if (!config.workspaceId || !config.channelId) {
    throw new Error("Bird Access Key sends need a workspace ID and SMS channel ID.");
  }

  const response = await fetch(
    `https://api.bird.com/workspaces/${config.workspaceId}/channels/${config.channelId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        receiver: { contacts: [{ identifierValue: to }] },
        body: { type: "text", text: { text } },
      }),
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail.slice(0, 400) || `Bird SMS failed (${response.status})`);
  }
}
