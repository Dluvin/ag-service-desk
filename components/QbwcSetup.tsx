import { ActionForm } from "@/components/ActionForm";
import { requestQbCustomerSyncAction, setQbwcPasswordAction } from "@/lib/qbwc-actions";

type QbwcSetupProps = {
  username: string;
  hasPassword: boolean;
  companyName: string | null;
  lastError: string | null;
  lastSyncAt: Date | null;
  queuedCount: number;
  customersEnabled?: boolean;
  customerCount?: number;
  customersSyncedAt?: Date | null;
  customersSyncRequested?: boolean;
  estimatesEnabled?: boolean;
};

export function QbwcSetup({
  username,
  hasPassword,
  companyName,
  lastError,
  lastSyncAt,
  queuedCount,
  customersEnabled = false,
  customerCount = 0,
  customersSyncedAt = null,
  customersSyncRequested = false,
  estimatesEnabled = true,
}: QbwcSetupProps) {
  return (
    <section className="rounded-xl border border-stone-200 bg-white p-4">
      <h2 className="font-display text-xl">QuickBooks Desktop</h2>
      <p className="mt-2 text-sm text-stone-600">
        {estimatesEnabled
          ? "Send a work order as a QuickBooks Desktop estimate using Intuit’s Web Connector. "
          : "Pull the QuickBooks customer list through Intuit’s Web Connector for pivot inspections. "}
        This is a separate application from any other Web Connector file you already run. In Web Connector the
        application name is <span className="font-mono">AGDESKPRO</span>.
        {estimatesEnabled
          ? " The QuickBooks customer is the farm's QuickBooks customer name when that field is filled in. QuickBooks items are not used."
          : ""}
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
          talk to Ag Desk Pro.
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
      {customersEnabled ? (
        <p className="mt-2 text-sm text-stone-700">
          Customer list: {customerCount.toLocaleString("en-US")} on file
          {customersSyncedAt ? ` · synced ${customersSyncedAt.toLocaleString()}` : " · not synced yet"}
          {customersSyncRequested ? " · sync waiting for Web Connector" : ""}
        </p>
      ) : null}
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
      {customersEnabled ? (
        <ActionForm action={requestQbCustomerSyncAction} className="mt-3">
          <button className="rounded-lg border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 hover:bg-emerald-50">
            Queue customer list sync
          </button>
          <p className="mt-2 text-xs text-stone-500">
            Then run Update Selected on AGDESKPRO in Web Connector. Phones and tablets cache the list for offline
            inspections.
          </p>
        </ActionForm>
      ) : null}
    </section>
  );
}
