export function WelcomeMailNotice({ status }: { status?: string }) {
  if (status === "sent") {
    return (
      <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-950">
        Welcome email sent. They can set or change their password from the link.
      </p>
    );
  }
  if (status === "skipped") {
    return (
      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        Login was created, but email is not configured yet. Set EMAIL_FROM and either RESEND_API_KEY or
        SMTP_HOST on the server to send welcome messages.
      </p>
    );
  }
  if (status === "failed") {
    return (
      <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
        Login was created, but the welcome email could not be sent. Check the mail settings and try again
        later.
      </p>
    );
  }
  return null;
}
