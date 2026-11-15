export type NotifyAudience = "AUTO" | "CHOSEN";

export type NotifyRecipients = {
  mode: NotifyAudience;
  smsUserIds: string[];
  emailUserIds: string[];
};

const AUTO: NotifyRecipients = { mode: "AUTO", smsUserIds: [], emailUserIds: [] };

function idList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && id.length > 0))];
}

export function parseNotifyRecipients(raw: string | null | undefined): NotifyRecipients {
  if (!raw) return AUTO;
  try {
    const parsed = JSON.parse(raw) as { recipients?: Partial<NotifyRecipients> };
    const row = parsed.recipients;
    if (!row || row.mode !== "CHOSEN") return { ...AUTO, smsUserIds: idList(row?.smsUserIds), emailUserIds: idList(row?.emailUserIds) };
    return {
      mode: "CHOSEN",
      smsUserIds: idList(row.smsUserIds),
      emailUserIds: idList(row.emailUserIds),
    };
  } catch {
    return AUTO;
  }
}

export function recipientsFromForm(formData: FormData): NotifyRecipients {
  return {
    mode: formData.get("notifyAudience") === "CHOSEN" ? "CHOSEN" : "AUTO",
    smsUserIds: idList(formData.getAll("smsUserId")),
    emailUserIds: idList(formData.getAll("emailUserId")),
  };
}

export function keepStaffIds(ids: string[], staffIds: string[]) {
  const allowed = new Set(staffIds);
  return ids.filter((id) => allowed.has(id));
}
