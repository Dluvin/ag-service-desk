import { WelcomeMailNotice } from "@/components/WelcomeMailNotice";

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
  const now = Date.now();
  let label = "No email — no dashboard login.";
  let tone = "text-stone-600";

  if (email && login?.lastSeenAt) {
    label = `Signed in · last ${login.lastSeenAt.toLocaleString()}`;
    tone = "text-emerald-800";
  } else if (email && login?.inviteExpiresAt && login.inviteExpiresAt.getTime() > now) {
    label = `Invite sent${login.inviteSentAt ? ` ${login.inviteSentAt.toLocaleString()}` : ""}. Link expires ${login.inviteExpiresAt.toLocaleString()}.`;
    tone = "text-emerald-800";
  } else if (email && login) {
    label = "Login exists, but they have not signed in. Resend the invite.";
    tone = "text-amber-800";
  } else if (email) {
    label = "No login yet. Resend invite to create one and email a password link.";
    tone = "text-amber-800";
  }

  return (
    <div className="mt-3 space-y-2">
      {flash ? <WelcomeMailNotice status={flash} /> : null}
      <p className={`text-sm ${tone}`}>{label}</p>
    </div>
  );
}
