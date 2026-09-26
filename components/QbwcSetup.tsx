import { ActionForm } from "@/components/ActionForm";
import { setQbwcPasswordAction } from "@/lib/qbwc-actions";

type QbwcSetupProps = {
  username: string;
  hasPassword: boolean;
  companyName: string | null;
  lastError: string | null;
  lastSyncAt: Date | null;
  queuedCount: number;
};

export function QbwcSetup({
  username,
  hasPassword,
  companyName,
  lastError,
  lastSyncAt,
  queuedCount,
}: QbwcSetupProps) {
  return (
    <div className="space-y-3 rounded-xl border border-stone-200 bg-white p-4">
      <p className="text-sm font-medium">QuickBooks Desktop estimates</p>
      <p className="text-sm text-stone-600">
        This is a separate Web Connector application from any other Intuit connector you already run. Customer names and
        item names on the work order must match QuickBooks exactly.
      </p>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-700">
        <li>On the Windows PC that has QuickBooks Desktop, install Intuit’s Web Connector.</li>
        <li>
          Set a password below. Username is <span className="font-mono">{username}</span>.
        </li>
        <li>Download the .qwc file, then in Web Connector choose Add an application and pick that file.</li>
        <li>Enter the same password, allow access when QuickBooks asks, and click Update Selected when you send a work order.</li>
      </ol>
      {hasPassword ? (
        <p className="text-sm text-emerald-800">
          Password is set
          {companyName ? ` · last company ${companyName}` : ""}
          {lastSyncAt ? ` · ${lastSyncAt.toLocaleString()}` : ""}
          {queuedCount ? ` · ${queuedCount} estimate${queuedCount === 1 ? "" : "s"} waiting` : ""}
        </p>
      ) : (
        <p className="text-sm text-amber-800">No password yet — Web Connector cannot sign in.</p>
      )}
      {lastError ? <p className="text-sm text-red-700">{lastError}</p> : null}
      <ActionForm action={setQbwcPasswordAction} className="flex flex-wrap items-end gap-2">
        <label className="text-sm font-medium">
          Web Connector password
          <input
            name="password"
            type="password"
            minLength={8}
            required
            className="mt-1 block rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
          />
        </label>
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">Save password</button>
        <a href="/api/qbwc/qwc" className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium">
          Download .qwc
        </a>
      </ActionForm>
    </div>
  );
}
