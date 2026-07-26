import { requirePageRole } from "@/lib/auth/authorization";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    await requirePageRole(["admin"]);
    return children;
}
