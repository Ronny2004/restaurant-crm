"use client";

import { createContext, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { AppProfile, UserRole } from "@/types/auth";

export type { UserRole } from "@/types/auth";
export type UserProfile = AppProfile;

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signOut: () => Promise<void>;
    hasRole: (roles: UserRole[]) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            setProfile(error ? null : data as UserProfile);
        } catch (error) {
            console.error("Error al consultar el perfil", error);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session);
            setUser(data.session?.user ?? null);
            if (data.session?.user) {
                void fetchProfile(data.session.user.id);
            } else {
                setLoading(false);
            }
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, nextSession) => {
                setSession(nextSession);
                setUser(nextSession?.user ?? null);
                if (nextSession?.user) {
                    void fetchProfile(nextSession.user.id);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            },
        );

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        await supabase.auth.signOut({ scope: "local" });
        setUser(null);
        setProfile(null);
        setSession(null);
        router.replace("/login");
        router.refresh();
    };

    const hasRole = (roles: UserRole[]) =>
        Boolean(
            profile
            && profile.account_status === "active"
            && roles.includes(profile.role),
        );

    return (
        <AuthContext.Provider
            value={{ user, profile, session, loading, signOut, hasRole }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth debe usarse dentro de AuthProvider");
    }
    return context;
}
