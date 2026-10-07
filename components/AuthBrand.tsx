"use client";

import { createContext, useCallback, useContext, useEffect, useState, type FocusEvent, type ReactNode } from "react";
import { useT } from "@/components/I18nProvider";
import { BrandLogo } from "@/components/BrandLogo";
import { ThemeToggle } from "@/components/ThemeToggle";

export type DealerBrand = {
  organizationId: string;
  name: string;
  hasLogo: boolean;
};

function companyLogoSrc(organizationId: string) {
  return `/api/company-logo?org=${encodeURIComponent(organizationId)}`;
}

const DealerBrandContext = createContext<{
  dealer: DealerBrand | null;
  setDealer: (dealer: DealerBrand | null) => void;
}>({ dealer: null, setDealer: () => {} });

export function AuthBrandProvider({
  initial,
  children,
}: {
  initial?: DealerBrand | null;
  children: ReactNode;
}) {
  const [dealer, setDealer] = useState<DealerBrand | null>(initial ?? null);
  return <DealerBrandContext.Provider value={{ dealer, setDealer }}>{children}</DealerBrandContext.Provider>;
}

export function AuthScreenLogos() {
  const { dealer } = useContext(DealerBrandContext);
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap items-center gap-4">
        <BrandLogo
          themeAware
          className="block"
          imageClassName="h-8 w-auto max-w-36 object-contain object-left"
        />
        {dealer?.hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companyLogoSrc(dealer.organizationId)}
            alt={dealer.name}
            className="h-12 max-w-40 object-contain"
          />
        ) : dealer ? (
          <p className="font-display text-xl text-stone-800">{dealer.name}</p>
        ) : null}
      </div>
      <ThemeToggle />
    </div>
  );
}

const REMEMBERED_EMAIL_KEY = "agdesk.loginEmail";

async function lookupDealer(email: string, setDealer: (dealer: DealerBrand | null) => void) {
  const trimmed = email.trim();
  if (!trimmed.includes("@")) return;
  try {
    const response = await fetch(`/api/login-brand?email=${encodeURIComponent(trimmed)}`);
    if (!response.ok) return;
    const data = (await response.json()) as DealerBrand | Record<string, never>;
    if ("organizationId" in data && data.organizationId && data.name) {
      setDealer({
        organizationId: data.organizationId,
        name: data.name,
        hasLogo: Boolean(data.hasLogo),
      });
    }
  } catch {
    // keep the last known dealer mark
  }
}

export function LoginFields() {
  const t = useT();
  const { setDealer } = useContext(DealerBrandContext);
  const [email, setEmail] = useState("");
  const [remember, setRemember] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBERED_EMAIL_KEY) ?? "";
      if (!saved) return;
      setEmail(saved);
      setRemember(true);
      void lookupDealer(saved, setDealer);
    } catch {
      // storage can be blocked; the fields still work
    }
  }, [setDealer]);

  const persistEmail = useCallback((nextEmail: string, nextRemember: boolean) => {
    try {
      if (nextRemember && nextEmail.trim()) localStorage.setItem(REMEMBERED_EMAIL_KEY, nextEmail.trim());
      else localStorage.removeItem(REMEMBERED_EMAIL_KEY);
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    const form = document.getElementById("login-email")?.closest("form");
    if (!form) return;
    const onSubmit = () => {
      const currentEmail = (form.elements.namedItem("email") as HTMLInputElement | null)?.value ?? "";
      const rememberBox = form.querySelector<HTMLInputElement>("#login-remember");
      persistEmail(currentEmail, rememberBox?.checked ?? false);
    };
    form.addEventListener("submit", onSubmit);
    return () => form.removeEventListener("submit", onSubmit);
  }, [persistEmail]);

  return (
    <>
      <label className="block text-sm font-medium" htmlFor="login-email">
        {t("login.email")}
        <input
          id="login-email"
          name="email"
          type="email"
          required
          autoComplete="username"
          value={email}
          onChange={(event) => {
            const next = event.target.value;
            setEmail(next);
            if (remember) persistEmail(next, true);
          }}
          onBlur={(event) => {
            void lookupDealer(event.target.value, setDealer);
          }}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium" htmlFor="login-remember">
        <input
          id="login-remember"
          type="checkbox"
          checked={remember}
          onChange={(event) => {
            const next = event.target.checked;
            setRemember(next);
            persistEmail(email, next);
          }}
          className="h-4 w-4 rounded border-stone-300"
        />
        {t("login.rememberEmail")}
      </label>
      <div>
        <div className="flex items-baseline justify-between gap-3">
          <label className="block text-sm font-medium" htmlFor="login-password">
            {t("login.password")}
          </label>
          <a href="/forgot" className="text-sm font-semibold text-emerald-800 hover:underline">
            {t("login.forgot")}
          </a>
        </div>
        <div className="relative mt-1">
          <input
            id="login-password"
            name="password"
            type={passwordVisible ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 pr-20"
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 px-3 text-sm font-semibold text-emerald-800"
            aria-pressed={passwordVisible}
            aria-label={passwordVisible ? t("login.hidePasswordLabel") : t("login.showPasswordLabel")}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            {passwordVisible ? t("login.hidePassword") : t("login.showPassword")}
          </button>
        </div>
      </div>
    </>
  );
}

export function AuthEmailInput({ defaultValue }: { defaultValue?: string }) {
  const { setDealer } = useContext(DealerBrandContext);
  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      void lookupDealer(event.target.value, setDealer);
    },
    [setDealer],
  );

  return (
    <input
      name="email"
      type="email"
      required
      defaultValue={defaultValue}
      onBlur={onBlur}
      className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
    />
  );
}
