import { requirePageRole } from "@/lib/auth/authorization";

export default async function WaiterLayout({ children }: { children: React.ReactNode }) {
    await requirePageRole(["waiter", "admin"]);
    return children;
}
