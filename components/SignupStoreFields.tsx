"use client";

import { useState } from "react";
import { defaultStoreName } from "@/lib/store-names";

export function SignupStoreFields({ maxStores }: { maxStores: number }) {
  const cap = Math.max(1, maxStores);
  const [count, setCount] = useState(1);
  const [names, setNames] = useState<string[]>(() =>
    Array.from({ length: cap }, (_, index) => defaultStoreName(index + 1)),
  );

  return (
    <fieldset className="grid gap-3 sm:col-span-2">
      <legend className="text-sm font-medium">Stores</legend>
      <p className="text-xs font-normal text-stone-500">
        New shops start as Store 1, Store 2, and so on. Change the names here if you already know them.
        You can rename them again after you sign in.
      </p>
      <label className="block text-sm font-medium">
        How many stores
        <select
          name="storeCount"
          value={count}
          onChange={(event) => setCount(Number(event.target.value))}
          className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
        >
          {Array.from({ length: cap }, (_, index) => index + 1).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>
      {names.slice(0, count).map((name, index) => (
        <label key={index} className="block text-sm font-medium">
          Store {index + 1} name
          <input
            name={`storeName.${index + 1}`}
            value={name}
            onChange={(event) => {
              const next = [...names];
              next[index] = event.target.value;
              setNames(next);
            }}
            className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2"
          />
        </label>
      ))}
    </fieldset>
  );
}
