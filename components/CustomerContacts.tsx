"use client";

import { useState } from "react";
import { ActionForm } from "@/components/ActionForm";
import { ContactInviteStatus, type ContactLoginStatus } from "@/components/ContactInviteStatus";
import { DeleteButton } from "@/components/DeleteButton";
import { useT } from "@/components/I18nProvider";
import {
  addFarmerContactAction,
  deleteFarmerContactAction,
  resendFarmerContactInviteAction,
  updateFarmerContactAction,
} from "@/lib/actions";

type ContactRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  login: ContactLoginStatus | null;
  flash?: string;
};

export function CustomerContacts({
  farmerId,
  contacts,
  farmerPhone,
  farmerEmail,
  canEdit,
  canDelete,
}: {
  farmerId: string;
  contacts: ContactRow[];
  farmerPhone: string | null;
  farmerEmail: string | null;
  canEdit: boolean;
  canDelete: boolean;
}) {
  const t = useT();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <section className="mt-6">
      <h2 className="font-display text-xl">{t("common.contacts")}</h2>
      {contacts.length ? (
        <ul className="mt-2 space-y-2">
          {contacts.map((contact) => (
            <li
              key={contact.id}
              tabIndex={0}
              className="group rounded-xl border border-stone-200 bg-white"
            >
              <p className="px-4 py-3 font-medium">{contact.name}</p>
              <div className="hidden border-t border-stone-200 p-4 group-hover:block group-focus-within:block">
                {canEdit ? (
                  <>
                    <ActionForm action={updateFarmerContactAction} className="space-y-3">
                      <input type="hidden" name="contactId" value={contact.id} />
                      <label className="block text-sm font-medium">
                        {t("common.name")}
                        <input
                          name="contactName"
                          required
                          defaultValue={contact.name}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        {t("common.phone")}
                        <input
                          name="contactPhone"
                          defaultValue={contact.phone ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                        />
                      </label>
                      <label className="block text-sm font-medium">
                        {t("common.email")}
                        <input
                          name="contactEmail"
                          type="email"
                          defaultValue={contact.email ?? ""}
                          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
                        />
                        <span className="mt-1 block text-xs font-normal text-stone-500">
                          {t("customers.emailCreatesLogin")}
                        </span>
                      </label>
                      <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                        {t("customers.saveContact")}
                      </button>
                    </ActionForm>
                    <ContactInviteStatus email={contact.email} login={contact.login} flash={contact.flash} />
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      {contact.email ? (
                        <ActionForm action={resendFarmerContactInviteAction}>
                          <input type="hidden" name="contactId" value={contact.id} />
                          <button className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 hover:bg-stone-100">
                            {t("customers.resendInvite")}
                          </button>
                        </ActionForm>
                      ) : (
                        <span />
                      )}
                      {canDelete ? (
                        <DeleteButton
                          action={deleteFarmerContactAction}
                          name="contactId"
                          value={contact.id}
                          label={t("customers.deleteContact")}
                          confirmText={t("customers.deleteContactConfirm", { name: contact.name })}
                        />
                      ) : null}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-stone-600">
                      {[contact.phone, contact.email].filter(Boolean).join(" · ") || t("customers.noPhoneEmail")}
                    </p>
                    <ContactInviteStatus email={contact.email} login={contact.login} />
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-stone-600">
          {[farmerPhone, farmerEmail].filter(Boolean).join(" · ") || t("customers.noContacts")}
        </p>
      )}
      {canEdit ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-stone-200 bg-white">
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            aria-expanded={addOpen}
            className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
          >
            <p className="text-sm font-semibold text-stone-800">{t("customers.addContact")}</p>
            <span className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium">
              {addOpen ? t("common.hide") : t("common.show")}
            </span>
          </button>
          {addOpen ? (
            <ActionForm action={addFarmerContactAction} className="space-y-3 border-t border-stone-200 p-4">
              <input type="hidden" name="farmerId" value={farmerId} />
              <label className="block text-sm font-medium">
                {t("common.name")}
                <input name="contactName" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t("common.phone")}
                <input name="contactPhone" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
              </label>
              <label className="block text-sm font-medium">
                {t("common.email")}
                <input name="contactEmail" type="email" className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
                <span className="mt-1 block text-xs font-normal text-stone-500">{t("customers.addEmailLogin")}</span>
              </label>
              <button className="rounded-lg bg-emerald-800 px-4 py-2 text-sm font-semibold text-white">
                {t("customers.saveContact")}
              </button>
            </ActionForm>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
