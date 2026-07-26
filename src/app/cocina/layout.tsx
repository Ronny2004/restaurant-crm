import { requirePageRole } from "@/lib/auth/authorization";

export default async function KitchenLayout({ children }: { children: React.ReactNode }) {
    await requirePageRole(["chef", "admin"]);
    return children;
}
