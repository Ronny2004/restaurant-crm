import HomeDashboard from "@/components/dashboard/HomeDashboard";
import { redirect } from "next/navigation";
import { requireActiveProfile } from "@/lib/auth/authorization";
import { destinationForRole } from "@/lib/auth/routing";

export default async function Home() {
  const profile = await requireActiveProfile();
  if (!profile) {
    redirect("/login");
  }
  if (profile.role !== "admin") {
    redirect(destinationForRole(profile.role));
  }
  return <HomeDashboard profile={profile} />;
}
