export const NOTIFY_CHANNELS = ["OFF", "SMS", "EMAIL", "BOTH"] as const;
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number];

export function notifyChannelOf(org: {
  notifyChannel?: string | null;
  birdSmsEnabled?: boolean | null;
}): NotifyChannel {
  const value = org.notifyChannel;
  if (value === "SMS" || value === "EMAIL" || value === "BOTH") return value;
  if (org.birdSmsEnabled) return "SMS";
  return "OFF";
}

export function sendsSms(org: { notifyChannel?: string | null; birdSmsEnabled?: boolean | null }) {
  const channel = notifyChannelOf(org);
  return channel === "SMS" || channel === "BOTH";
}

export function sendsEmail(org: { notifyChannel?: string | null; birdSmsEnabled?: boolean | null }) {
  const channel = notifyChannelOf(org);
  return channel === "EMAIL" || channel === "BOTH";
}
