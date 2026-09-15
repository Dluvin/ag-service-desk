import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Nav } from "@/components/Nav";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="min-h-full">
      <Nav session={session} />
      <main className="mx-auto max-w-7xl px-4 py-8 print:max-w-none print:px-0 print:py-0">{children}</main>
    </div>
  );
}
