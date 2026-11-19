import { Suspense } from "react";
import { isAdminAuthenticated } from "@/lib/auth";
import { AdminApp } from "@/components/admin/AdminApp";
import { AdminLogin } from "@/components/admin/AdminLogin";

function AdminAppFallback() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-violet-300">
      Loading control room…
    </div>
  );
}

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) return <AdminLogin />;
  return (
    <Suspense fallback={<AdminAppFallback />}>
      <AdminApp />
    </Suspense>
  );
}
