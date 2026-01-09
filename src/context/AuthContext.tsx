"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { User, Session } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "waiter" | "chef" | "cashier";

export type UserProfile = {
    id: string;
    email: string;
    role: UserRole;
    full_name?: string;
};

type AuthContextType = {
    user: User | null;
    profile: UserProfile | null;
    session: Session | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
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

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setLoading(false);
            }
        });

        // Listen for auth changes
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            if (session?.user) {
                fetchProfile(session.user.id);
            } else {
                setProfile(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchProfile = async (userId: string) => {
        try {
            const { data, error } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();

            if (error) {
                console.error("Error fetching profile:", error);
                setProfile(null);
            } else {
                setProfile(data as UserProfile);
            }
        } catch (error) {
            console.error("Error in fetchProfile:", error);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        // 1. Try Real Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (!error && data.user) {
            await fetchProfile(data.user.id);
            return { error: null };
        }

        // 2. Fallback to Demo Mode if Auth fails
        console.warn("Real Auth failed, attempting Demo Auth override...", error);

        const demoUsers: Record<string, UserProfile & { password: string }> = {
            'admin@restaurant.com': { id: 'demo-admin', email: 'admin@restaurant.com', role: 'admin', full_name: 'Demo Admin', password: 'admin123' },
            'waiter@restaurant.com': { id: 'demo-waiter', email: 'waiter@restaurant.com', role: 'waiter', full_name: 'Demo Waiter', password: 'waiter123' },
            'chef@restaurant.com': { id: 'demo-chef', email: 'chef@restaurant.com', role: 'chef', full_name: 'Demo Chef', password: 'chef123' },
            'cashier@restaurant.com': { id: 'demo-cashier', email: 'cashier@restaurant.com', role: 'cashier', full_name: 'Demo Cashier', password: 'cashier123' }
        };

        const demoUser = demoUsers[email];

        if (demoUser && demoUser.password === password) {
            console.log("Logged in with DEMO user:", demoUser.role);
            // Manually set state
            const mockUser: User = {
                id: demoUser.id,
                aud: 'authenticated',
                role: 'authenticated',
                email: demoUser.email,
                app_metadata: {},
                user_metadata: {},
                created_at: new Date().toISOString()
            } as User;

            setUser(mockUser);
            setProfile({
                id: demoUser.id,
                email: demoUser.email,
                role: demoUser.role,
                full_name: demoUser.full_name
            });
            // Create a fake session to satisfy types if needed, though we rely on user/profile state
            return { error: null };
        }

        return { error };
    };

    const signOut = async () => {
        await supabase.auth.signOut();
        setUser(null);
        setProfile(null);
        setSession(null);
        router.push("/login");
    };

    const hasRole = (roles: UserRole[]): boolean => {
        if (!profile) return false;
        return roles.includes(profile.role);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                profile,
                session,
                loading,
                signIn,
                signOut,
                hasRole,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
