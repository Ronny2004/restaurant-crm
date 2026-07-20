import { RoleGuard } from "@/components/auth/RoleGuard";

export default function KitchenLayout({ children }: { children: React.ReactNode }) {
    return <RoleGuard allowedRoles={["chef", "admin"]}>{children}</RoleGuard>;
}
