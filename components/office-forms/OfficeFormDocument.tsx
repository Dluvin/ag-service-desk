"use client";

import { ActionForm } from "@/components/ActionForm";
import { AttachWorkOrderPicker } from "@/components/office-forms/AttachWorkOrderPicker";
import {
  FormArea,
  FormField,
  FormLine,
  LineTable,
  OfficeFormActions,
  OfficeFormHeader,
  YesNo,
} from "@/components/office-forms/OfficeFormKit";
import { attachOfficeFormToTicketAction } from "@/lib/actions";
import { ELECTRICAL_PART_COLUMNS } from "@/lib/electrical-parts";
import type { OpenWorkOrderOption } from "@/lib/office-forms";
import { useT } from "@/components/I18nProvider";
import { useMemo, useState, type ReactNode } from "react";

export function OfficeFormDocument({
  slug,
  title,
  orgName,
  logoSrc,
  logoAlt,
  openTickets,
}: {
  slug: string;
  title: string;
  orgName: string;
  logoSrc: string | null;
  logoAlt: string;
  openTickets: OpenWorkOrderOption[];
}) {
  const t = useT();
  const [ticketId, setTicketId] = useState("");

  return (
    <div>
      <OfficeFormActions fileBase={slug} />
      <ActionForm action={attachOfficeFormToTicketAction} className="space-y-4">
        <input type="hidden" name="formSlug" value={slug} />
        <div className="no-print flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <AttachWorkOrderPicker tickets={openTickets} onSelect={setTicketId} />
          <button
            className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={openTickets.length === 0 || !ticketId}
          >
            {t("forms.saveToWorkOrder")}
          </button>
        </div>
        <article
          id="office-form-print"
          className="office-form mx-auto max-w-4xl bg-white p-6 text-stone-900 shadow-sm print:max-w-none print:p-0 print:shadow-none"
        >
          <OfficeFormHeader title={title} orgName={orgName} logoSrc={logoSrc} logoAlt={logoAlt} />
          <FormBody slug={slug} />
        </article>
      </ActionForm>
    </div>
  );
}

function FormBody({ slug }: { slug: string }) {
  if (slug === "service-ticket") return <ServiceTicketForm />;
  if (slug === "counter-ticket") return <CounterTicketForm />;
  if (slug === "po-ticket") return <PoTicketForm />;
  if (slug === "need-to-order") return <NeedToOrderForm />;
  if (slug === "motor-startup") return <MotorStartupForm />;
  if (slug === "agsense-work-order") return <AgsenseWorkOrderForm />;
  if (slug === "electrical-parts") return <ElectricalPartsForm />;
  return null;
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 space-y-3">
      <h2 className="font-display text-lg">{title}</h2>
      {children}
    </section>
  );
}

function ServiceTicketForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="Service ticket #">
          <FormLine name="ticket_number" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
        <FormField label="Customer">
          <FormLine name="customer" />
        </FormField>
        <FormField label="Bill to">
          <FormLine name="bill_to" />
        </FormField>
        <FormField label="Job / site">
          <FormLine name="job_site" className="sm:col-span-2" />
        </FormField>
      </Grid>
      <Section title="Labor">
        <LineTable
          name="labor"
          rows={5}
          columns={[
            { key: "hrs", label: "Hrs.", className: "w-20" },
            { key: "tech", label: "Tech name", className: "w-40" },
            { key: "notes", label: "Notes" },
          ]}
        />
      </Section>
      <Section title="Parts">
        <LineTable
          name="parts"
          rows={10}
          columns={[
            { key: "qty", label: "Qty", className: "w-20" },
            { key: "part", label: "Part #", className: "w-36" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
      <Grid>
        <FormField label="Date billed">
          <FormLine name="date_billed" type="date" />
        </FormField>
        <FormField label="Invoice #">
          <FormLine name="invoice" />
        </FormField>
        <YesNo name="backorder" label="Back order" />
      </Grid>
      <Section title="Back order parts">
        <LineTable
          name="back_parts"
          rows={8}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "part", label: "Part #", className: "w-36" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
      <Section title="Service truck / transport / equipment">
        <LineTable
          name="equipment"
          rows={4}
          columns={[
            { key: "qty", label: "Qty", className: "w-20" },
            { key: "item", label: "Item", className: "w-48" },
            { key: "notes", label: "Notes" },
          ]}
        />
      </Section>
    </div>
  );
}

function CounterTicketForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="Customer">
          <FormLine name="customer" />
        </FormField>
        <FormField label="Bill to">
          <FormLine name="bill_to" />
        </FormField>
        <FormField label="Job / site">
          <FormLine name="job_site" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
      </Grid>
      <Section title="Parts">
        <LineTable
          name="parts"
          rows={12}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "part", label: "Part #", className: "w-36" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
      <Grid>
        <FormField label="Date billed">
          <FormLine name="date_billed" type="date" />
        </FormField>
        <FormField label="Invoice #">
          <FormLine name="invoice" />
        </FormField>
        <YesNo name="backorder" label="Back order" />
      </Grid>
      <Section title="Back order">
        <LineTable
          name="back_parts"
          rows={8}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "part", label: "Part #", className: "w-36" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
    </div>
  );
}

function PoTicketForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="PO #">
          <FormLine name="po_number" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
        <FormField label="Vendor">
          <FormLine name="vendor" />
        </FormField>
        <FormField label="Ship to">
          <FormLine name="ship_to" />
        </FormField>
        <FormField label="Ordered by">
          <FormLine name="ordered_by" />
        </FormField>
        <FormField label="Received date">
          <FormLine name="received_date" type="date" />
        </FormField>
        <YesNo name="backorder" label="Back order" />
      </Grid>
      <Section title="Order">
        <LineTable
          name="lines"
          rows={12}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
      <Section title="Back / received">
        <LineTable
          name="back_lines"
          rows={8}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
    </div>
  );
}

function NeedToOrderForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="Customer">
          <FormLine name="customer" />
        </FormField>
        <FormField label="Bill to">
          <FormLine name="bill_to" />
        </FormField>
        <FormField label="Job / site">
          <FormLine name="job_site" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
      </Grid>
      <Section title="Need to order">
        <LineTable
          name="order"
          rows={12}
          columns={[
            { key: "qty", label: "Qty.", className: "w-16" },
            { key: "part", label: "Part #", className: "w-32" },
            { key: "description", label: "Description" },
            { key: "order_date", label: "Order / date", className: "w-32" },
            { key: "po", label: "PO #", className: "w-28" },
          ]}
        />
      </Section>
      <Section title="Ordered">
        <LineTable
          name="ordered"
          rows={8}
          columns={[
            { key: "qty", label: "Qty.", className: "w-16" },
            { key: "part", label: "Part #", className: "w-32" },
            { key: "description", label: "Description" },
            { key: "order_date", label: "Order / date", className: "w-32" },
            { key: "by", label: "Ordered / by", className: "w-32" },
          ]}
        />
      </Section>
    </div>
  );
}

function MotorStartupForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="Tech">
          <FormLine name="tech" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
        <FormField label="Service order #">
          <FormLine name="service_order" />
        </FormField>
        <FormField label="Motor HP">
          <FormLine name="motor_hp" />
        </FormField>
        <FormField label="Motor RPM">
          <FormLine name="motor_rpm" />
        </FormField>
        <FormField label="Motor serial #">
          <FormLine name="motor_serial" />
        </FormField>
        <FormField label="Panel brand">
          <FormLine name="panel_brand" />
        </FormField>
      </Grid>
      <fieldset className="flex flex-wrap items-center gap-4 text-sm">
        <legend className="text-xs font-semibold uppercase tracking-wide text-stone-600">Panel type</legend>
        {["ATL", "PWS", "SS", "VFD"].map((type) => (
          <label key={type} className="inline-flex items-center gap-1">
            <input type="radio" name="panel_type" value={type} />
            {type}
          </label>
        ))}
      </fieldset>
      <Section title="Line data — no load">
        <Grid>
          <FormField label="Volts line 1">
            <FormLine name="nl_volts_l1" />
          </FormField>
          <FormField label="Volts line 2">
            <FormLine name="nl_volts_l2" />
          </FormField>
          <FormField label="Volts line 3">
            <FormLine name="nl_volts_l3" />
          </FormField>
          <FormField label="L1-L2">
            <FormLine name="nl_l1l2" />
          </FormField>
          <FormField label="L1-L3">
            <FormLine name="nl_l1l3" />
          </FormField>
          <FormField label="L2-L3">
            <FormLine name="nl_l2l3" />
          </FormField>
        </Grid>
      </Section>
      <Section title="Line data — load">
        <Grid>
          <FormField label="Volts line 1">
            <FormLine name="ld_volts_l1" />
          </FormField>
          <FormField label="Volts line 2">
            <FormLine name="ld_volts_l2" />
          </FormField>
          <FormField label="Volts line 3">
            <FormLine name="ld_volts_l3" />
          </FormField>
          <FormField label="L1-L2">
            <FormLine name="ld_l1l2" />
          </FormField>
          <FormField label="L1-L3">
            <FormLine name="ld_l1l3" />
          </FormField>
          <FormField label="L2-L3">
            <FormLine name="ld_l2l3" />
          </FormField>
        </Grid>
      </Section>
      <Section title="Load data — amps">
        <Grid>
          <FormField label="Line 1">
            <FormLine name="amps_l1" />
          </FormField>
          <FormField label="Line 2">
            <FormLine name="amps_l2" />
          </FormField>
          <FormField label="Line 3">
            <FormLine name="amps_l3" />
          </FormField>
          <FormField label="Line 7">
            <FormLine name="amps_l7" />
          </FormField>
          <FormField label="Line 8">
            <FormLine name="amps_l8" />
          </FormField>
          <FormField label="Line 9">
            <FormLine name="amps_l9" />
          </FormField>
          <FormField label="Overload amp setting (left)">
            <FormLine name="overload_left" />
          </FormField>
          <FormField label="Overload amp setting (right)">
            <FormLine name="overload_right" />
          </FormField>
        </Grid>
      </Section>
      <p className="text-sm font-semibold">** Take picture and turn into the office **</p>
    </div>
  );
}

function AgsenseWorkOrderForm() {
  return (
    <div className="space-y-4">
      <Grid>
        <FormField label="Customer">
          <FormLine name="customer" />
        </FormField>
        <FormField label="Date">
          <FormLine name="date" type="date" />
        </FormField>
        <FormField label="Unit name">
          <FormLine name="unit_name" />
        </FormField>
        <FormField label="Unit #">
          <FormLine name="unit_number" />
        </FormField>
        <FormField label="RMA #">
          <FormLine name="rma" />
        </FormField>
        <FormField label="AgSense tech">
          <FormLine name="agsense_tech" />
        </FormField>
        <FormField label="RBIE tech">
          <FormLine name="rbie_tech" />
        </FormField>
      </Grid>
      <YesNo name="warranty" label="Warranty" />
      <FormField label="Description of issue">
        <FormArea name="issue" rows={5} />
      </FormField>
      <Section title="Parts used">
        <LineTable
          name="parts"
          rows={8}
          columns={[
            { key: "qty", label: "Qty.", className: "w-20" },
            { key: "part", label: "Part #", className: "w-36" },
            { key: "description", label: "Description" },
          ]}
        />
      </Section>
      <YesNo name="resolved" label="Issue resolved" />
    </div>
  );
}

function ElectricalPartsForm() {
  const t = useT();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ELECTRICAL_PART_COLUMNS;
    return ELECTRICAL_PART_COLUMNS.map((column) => ({
      ...column,
      items: column.items.filter((item) => item.toLowerCase().includes(q) || column.heading.toLowerCase().includes(q)),
    })).filter((column) => column.items.length > 0);
  }, [query]);

  return (
    <div className="space-y-4">
      <label className="no-print block text-sm font-medium">
        {t("forms.searchParts")}
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("forms.searchPartsPlaceholder")}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>
      <FormField label="Notes for the work order">
        <FormArea name="notes" rows={3} />
      </FormField>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 print:grid-cols-3">
        {filtered.map((column) => (
          <section key={column.heading}>
            <h2 className="border-b border-stone-300 pb-1 text-sm font-semibold uppercase tracking-wide">
              {column.heading}
            </h2>
            <ul className="mt-2 space-y-0.5 text-xs">
              {column.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
