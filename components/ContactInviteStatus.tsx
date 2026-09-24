"use client";

import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";
import { useT } from "@/components/I18nProvider";

export type ContactLoginStatus = {
  lastSeenAt: Date | null;
  inviteSentAt: Date | null;
  inviteExpiresAt: Date | null;
};

export function ContactInviteStatus({
  email,
  login,
  flash,
}: {
  email: string | null;
  login: ContactLoginStatus | null;
  flash?: string;
}) {
  const t = useT();
  const now = Date.now();
  let label = t("customers.invite.noEmail");
  let tone = "text-stone-600";

  if (email && login?.lastSeenAt) {
    label = t("customers.invite.signedIn", { when: login.lastSeenAt.toLocaleString() });
    tone = "text-emerald-800";
  } else if (email && login?.inviteExpiresAt && login.inviteExpiresAt.getTime() > now) {
    label = t("customers.invite.sent", {
      when: login.inviteSentAt ? login.inviteSentAt.toLocaleString() : "",
      expires: login.inviteExpiresAt.toLocaleString(),
    });
    tone = "text-emerald-800";
  } else if (email && login) {
    label = t("customers.invite.exists");
    tone = "text-amber-800";
  } else if (email) {
    label = t("customers.invite.none");
    tone = "text-amber-800";
  }

  return (
    <div className="mt-3 space-y-2">
      {flash ? <WelcomeMailNotice status={flash} /> : null}
      <p className={`text-sm ${tone}`}>{label}</p>
    </div>
  );
}
