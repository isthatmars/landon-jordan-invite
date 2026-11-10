import { isAdminAuthenticated } from "@/lib/auth";
import { AdminApp } from "@/components/admin/AdminApp";
import { AdminLogin } from "@/components/admin/AdminLogin";


export default async function AdminPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) return <AdminLogin />;
  return <AdminApp />;
}
