import { RoleGuard } from "@/components/auth/RoleGuard";

export default function WaiterLayout({ children }: { children: React.ReactNode }) {
    return <RoleGuard allowedRoles={["waiter", "admin"]}>{children}</RoleGuard>;
}
