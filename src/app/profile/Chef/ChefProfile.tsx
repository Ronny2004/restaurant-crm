"use client";

import { Header } from "@/components/layout/Header";

export function ChefProfile({ profile }: { profile: any }) {
    return (
        <div className="container">
            <Header />
            <div style={{ marginTop: "3rem", textAlign: "center" }}>
                <h1>Perfil del Cocinero: {profile.full_name}</h1>
                <p style={{ color: "var(--text-muted)" }}>Estamos construyendo esta vista...</p>
            </div>
        </div>
    );
}