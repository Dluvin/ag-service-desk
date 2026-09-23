"use client";

import { createContext, useCallback, useContext, useState, type FocusEvent, type ReactNode } from "react";
import { BrandLogo } from "@/components/BrandLogo";

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
    <div className="mb-6 flex flex-wrap items-center gap-4">
      <BrandLogo className="block" imageClassName="h-8 w-auto max-w-36 object-contain object-left" />
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
  );
}

export function AuthEmailInput({ defaultValue }: { defaultValue?: string }) {
  const { setDealer } = useContext(DealerBrandContext);
  const onBlur = useCallback(
    async (event: FocusEvent<HTMLInputElement>) => {
      const email = event.target.value.trim();
      if (!email.includes("@")) return;
      try {
        const response = await fetch(`/api/login-brand?email=${encodeURIComponent(email)}`);
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
