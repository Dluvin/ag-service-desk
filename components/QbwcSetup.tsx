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
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-display text-xl">QuickBooks Desktop</h2>
      <p className="mt-2 text-sm text-stone-600">
        Send a work order as a QuickBooks Desktop estimate using Intuit’s Web Connector. This is a
        separate application from any other Web Connector file you already run. In Web Connector the
        application name is <span className="font-mono">AGDESKPRO</span>. Customer names and item names
        on the work order must match QuickBooks exactly.
      </p>
      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-stone-700">
        <li>
          On the Windows PC that has QuickBooks Desktop, install Intuit’s{" "}
          <a
            href="https://developer.intuit.com/app/developer/qbdesktop/docs/get-started/get-started-with-quickbooks-web-connector"
            className="font-semibold text-emerald-800 hover:underline"
            target="_blank"
            rel="noreferrer"
          >
            QuickBooks Web Connector
          </a>
          . Keep QuickBooks open to the company file you want estimates in.
        </li>
        <li>
          Set a password below (at least 8 characters). The Web Connector username is{" "}
          <span className="font-mono">{username}</span>.
        </li>
        <li>
          Download the connector file, then in Web Connector choose <strong>Add an application</strong>{" "}
          and pick that .qwc file.
        </li>
        <li>
          Enter the same password, allow access when QuickBooks asks, and leave Auto-Run off until you
          are comfortable. When you send a work order as an estimate, click{" "}
          <strong>Update Selected</strong> on this application.
        </li>
        <li>
          The PC must reach this site over HTTPS (or HTTP on localhost). If the company file is on a
          different computer, run Web Connector on the QuickBooks machine, not on a laptop that cannot
          talk to AG Desk Pro.
        </li>
      </ol>
      {hasPassword ? (
        <p className="mt-3 text-sm text-emerald-800">
          Password is set
          {companyName ? ` · last company ${companyName}` : ""}
          {lastSyncAt ? ` · ${lastSyncAt.toLocaleString()}` : ""}
          {queuedCount ? ` · ${queuedCount} estimate${queuedCount === 1 ? "" : "s"} waiting` : ""}
        </p>
      ) : (
        <p className="mt-3 text-sm text-amber-800">No password yet — Web Connector cannot sign in.</p>
      )}
      {lastError ? <p className="mt-2 text-sm text-red-700">{lastError}</p> : null}
      <ActionForm action={setQbwcPasswordAction} className="mt-4 flex flex-wrap items-end gap-2">
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
        <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
          Save password
        </button>
        <a
          href="/api/qbwc/qwc"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium hover:bg-stone-50"
        >
          Download AGDESKPRO.qwc
        </a>
      </ActionForm>
    </section>
  );
}
