import { requirePageRole } from "@/lib/auth/authorization";

export default async function CashierLayout({ children }: { children: React.ReactNode }) {
    await requirePageRole(["cashier", "admin"]);
    return children;
}
