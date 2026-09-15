import Link from "next/link";
import { loginAction } from "@/lib/actions";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/prisma";

export default async function LoginPage() {
  const userCount = await prisma.user.count();
  const showDemo = process.env.NODE_ENV !== "production";

  return (
    <div className="flex min-h-full items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
        <h1 className="font-display text-3xl">Log in</h1>
        <p className="mt-1 text-sm text-stone-600">Farmers, technicians, and company admins use the same door.</p>
        {userCount === 0 ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            This host has no users yet. Demo emails from your PC will not work here.{" "}
            <Link href="/signup" className="font-semibold underline">
              Create a company account
            </Link>{" "}
            first, then sign in with that email and password.
          </p>
        ) : null}
        <ActionForm action={loginAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2" />
          </label>
          <button className="w-full rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white hover:bg-emerald-700">
            Sign in
          </button>
        </ActionForm>
        <p className="mt-4 text-sm text-stone-600">
          New company?{" "}
          <Link href="/signup" className="font-medium text-emerald-800 hover:underline">
            Create an account
          </Link>
        </p>
        {showDemo ? (
          <div className="mt-6 rounded-lg bg-stone-50 p-3 text-xs text-stone-600">
            <p className="font-semibold text-stone-800">Demo (password: demo1234)</p>
            <p>Admin: admin@heartland.ag</p>
            <p>Technician: mike@heartland.ag</p>
            <p>Farmer: tom@greenacres.farm</p>
            <p>Second tenant admin: admin@prairie.ag</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
