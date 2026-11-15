/** Default name for the store created at this 1-based position. */
export function defaultStoreName(index: number) {
  return `Store ${index}`;
}

/** Names from signup. Blank fields stay Store 1, Store 2, and so on. */
export function storeNamesFromSignup(formData: FormData, maxStores: number) {
  const cap = Math.max(1, maxStores);
  const raw = Number(String(formData.get("storeCount") ?? "1").trim());
  const count = Number.isInteger(raw) ? Math.min(Math.max(raw, 1), cap) : 1;
  const names: string[] = [];
  const seen = new Set<string>();
  for (let index = 1; index <= count; index += 1) {
    const typed = String(formData.get(`storeName.${index}`) ?? "").trim();
    const name = typed || defaultStoreName(index);
    const key = name.toLowerCase();
    if (seen.has(key)) return { error: "Each store needs its own name." as const };
    seen.add(key);
    names.push(name);
  }
  return { names };
}
