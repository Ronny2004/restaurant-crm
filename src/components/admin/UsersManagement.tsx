"use client";

import { useCallback, useEffect, useState } from "react";
import {
    Edit2,
    KeyRound,
    Loader2,
    Mail,
    Plus,
    Power,
    RefreshCw,
    Search,
    ShieldCheck,
    UserRound,
} from "lucide-react";
import { AuthMessage } from "@/components/auth/AuthMessage";
import { PinInput } from "@/components/auth/PinInput";
import { Modal } from "@/components/ui/Modal";
import type { ManagedUser, UserRole } from "@/types/auth";

const ROLE_LABELS: Record<UserRole, string> = {
    admin: "Administrador",
    waiter: "Mesero",
    chef: "Cocinero",
    cashier: "Cajero",
};

type CreateForm = {
    fullName: string;
    username: string;
    email: string;
    role: UserRole;
    password: string;
    pin: string;
};

const EMPTY_CREATE: CreateForm = {
    fullName: "",
    username: "",
    email: "",
    role: "waiter",
    password: "",
    pin: "",
};

export function UsersManagement({ currentUserId }: { currentUserId: string }) {
    const [users, setUsers] = useState<ManagedUser[]>([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [working, setWorking] = useState(false);
    const [message, setMessage] = useState("");
    const [createOpen, setCreateOpen] = useState(false);
    const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
    const [editing, setEditing] = useState<ManagedUser | null>(null);
    const [emailUser, setEmailUser] = useState<ManagedUser | null>(null);
    const [newEmail, setNewEmail] = useState("");
    const [statusUser, setStatusUser] = useState<ManagedUser | null>(null);
    const [statusReason, setStatusReason] = useState("");
    const [emergencyUser, setEmergencyUser] = useState<ManagedUser | null>(null);
    const [emergencyCode, setEmergencyCode] = useState("");

    const loadUsers = useCallback(async (query = "") => {
        setLoading(true);
        setMessage("");
        try {
            const response = await fetch(
                `/api/admin/users${query ? `?q=${encodeURIComponent(query)}` : ""}`,
                { cache: "no-store" },
            );
            const data = await response.json() as {
                ok: boolean;
                users?: ManagedUser[];
                message?: string;
            };
            if (!data.ok) throw new Error(data.message);
            setUsers(data.users || []);
        } catch (error) {
            setMessage(
                error instanceof Error ? error.message : "No se pudieron consultar los usuarios",
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        void loadUsers();
    }, [loadUsers]);

    const request = async (
        url: string,
        options: RequestInit,
    ) => {
        setWorking(true);
        setMessage("");
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });
            const data = await response.json() as {
                ok: boolean;
                message?: string;
                code?: string;
            };
            if (!data.ok) throw new Error(data.message || "Operación rechazada");
            return data;
        } finally {
            setWorking(false);
        }
    };

    const createUser = async (event: React.FormEvent) => {
        event.preventDefault();
        try {
            await request("/api/admin/users", {
                method: "POST",
                body: JSON.stringify(createForm),
            });
            setCreateOpen(false);
            setCreateForm(EMPTY_CREATE);
            setMessage("Usuario creado correctamente");
            await loadUsers(search);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo crear");
        }
    };

    const updateUser = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!editing) return;
        try {
            await request(`/api/admin/users/${editing.id}`, {
                method: "PATCH",
                body: JSON.stringify({
                    fullName: editing.full_name,
                    username: editing.username,
                    role: editing.role,
                    phone: editing.phone,
                }),
            });
            setEditing(null);
            setMessage("Usuario actualizado correctamente");
            await loadUsers(search);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo actualizar");
        }
    };

    const updateEmail = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!emailUser) return;
        try {
            await request(`/api/admin/users/${emailUser.id}/email`, {
                method: "PATCH",
                body: JSON.stringify({ email: newEmail }),
            });
            setEmailUser(null);
            setNewEmail("");
            setMessage("Correo actualizado correctamente");
            await loadUsers(search);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo cambiar el correo");
        }
    };

    const toggleStatus = async () => {
        if (!statusUser) return;
        const nextStatus =
            statusUser.account_status === "active" ? "disabled" : "active";
        try {
            await request(`/api/admin/users/${statusUser.id}/status`, {
                method: "PATCH",
                body: JSON.stringify({
                    status: nextStatus,
                    reason: statusReason,
                }),
            });
            setStatusUser(null);
            setStatusReason("");
            setMessage(
                nextStatus === "active"
                    ? "Usuario activado correctamente"
                    : "Usuario desactivado correctamente",
            );
            await loadUsers(search);
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo cambiar el estado");
        }
    };

    const generateEmergencyCode = async () => {
        if (!emergencyUser) return;
        try {
            const data = await request(
                `/api/admin/users/${emergencyUser.id}/emergency-code`,
                { method: "POST" },
            );
            setEmergencyCode(data.code || "");
        } catch (error) {
            setMessage(error instanceof Error ? error.message : "No se pudo generar el código");
            setEmergencyUser(null);
        }
    };

    return (
        <>
            <div className="users-toolbar">
                <form
                    className="users-search"
                    onSubmit={(event) => {
                        event.preventDefault();
                        void loadUsers(search);
                    }}
                >
                    <Search size={19} />
                    <input
                        aria-label="Buscar usuarios"
                        placeholder="Buscar por nombre, usuario, correo o rol"
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                    />
                    <button className="btn btn-secondary">Buscar</button>
                </form>
                <button
                    className="btn btn-primary"
                    onClick={() => setCreateOpen(true)}
                >
                    <Plus size={19} /> Crear usuario
                </button>
            </div>

            <AuthMessage
                message={message}
                type={message.includes("correct") ? "success" : "error"}
            />

            <div className="glass-panel users-table-wrap">
                {loading ? (
                    <div className="users-loading">
                        <Loader2 className="animate-spin" size={32} />
                        Consultando usuarios...
                    </div>
                ) : (
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Usuario</th>
                                <th>Rol</th>
                                <th>Estado</th>
                                <th>Credenciales</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <div className="user-identity">
                                            <span><UserRound size={20} /></span>
                                            <div>
                                                <strong>{user.full_name || user.username}</strong>
                                                <small>@{user.username} · {user.email}</small>
                                            </div>
                                        </div>
                                    </td>
                                    <td>{ROLE_LABELS[user.role]}</td>
                                    <td>
                                        <span className={`status-pill status-${user.account_status}`}>
                                            {user.account_status === "active"
                                                ? "Activo"
                                                : user.account_status === "disabled"
                                                    ? "Desactivado"
                                                    : "Configurando"}
                                        </span>
                                    </td>
                                    <td>
                                        {user.role === "admin" ? (
                                            <small>Sin expiración</small>
                                        ) : (
                                            <div className="credential-summary">
                                                <small>
                                                    PIN: {user.credentials.pinConfigured
                                                        ? `${user.credentials.pinDaysRemaining ?? "—"} días`
                                                        : "sin configurar"}
                                                </small>
                                                <small>
                                                    Clave: {user.credentials.passwordDaysRemaining ?? "—"} días
                                                </small>
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <div className="user-actions">
                                            <button
                                                title="Editar datos y rol"
                                                onClick={() => setEditing({ ...user })}
                                            >
                                                <Edit2 size={17} />
                                            </button>
                                            <button
                                                title="Cambiar correo"
                                                onClick={() => {
                                                    setEmailUser(user);
                                                    setNewEmail(user.email);
                                                }}
                                            >
                                                <Mail size={17} />
                                            </button>
                                            {user.role !== "admin" && user.account_status === "active" && (
                                                <button
                                                    title="Generar código de emergencia"
                                                    onClick={() => {
                                                        setEmergencyUser(user);
                                                        setEmergencyCode("");
                                                    }}
                                                >
                                                    <KeyRound size={17} />
                                                </button>
                                            )}
                                            <button
                                                title={
                                                    user.account_status === "active"
                                                        ? "Desactivar"
                                                        : "Activar"
                                                }
                                                disabled={user.id === currentUserId}
                                                onClick={() => setStatusUser(user)}
                                            >
                                                <Power size={17} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {!users.length && (
                                <tr>
                                    <td colSpan={5} className="users-empty">
                                        No se encontraron usuarios.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            <Modal
                isOpen={createOpen}
                onClose={() => !working && setCreateOpen(false)}
                title="Crear usuario"
            >
                <form className="admin-user-form" onSubmit={createUser}>
                    <label>Nombre completo
                        <input
                            required
                            value={createForm.fullName}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                fullName: event.target.value,
                            })}
                        />
                    </label>
                    <div className="form-row">
                        <label>Usuario
                            <input
                                required
                                value={createForm.username}
                                onChange={(event) => setCreateForm({
                                    ...createForm,
                                    username: event.target.value,
                                })}
                            />
                        </label>
                        <label>Rol
                            <select
                                value={createForm.role}
                                onChange={(event) => setCreateForm({
                                    ...createForm,
                                    role: event.target.value as UserRole,
                                    pin: event.target.value === "admin"
                                        ? ""
                                        : createForm.pin,
                                })}
                            >
                                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label>Correo
                        <input
                            required
                            type="email"
                            value={createForm.email}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                email: event.target.value,
                            })}
                        />
                    </label>
                    <label>Contraseña temporal
                        <input
                            required
                            type="password"
                            minLength={10}
                            value={createForm.password}
                            onChange={(event) => setCreateForm({
                                ...createForm,
                                password: event.target.value,
                            })}
                        />
                    </label>
                    <p className="auth-help">
                        Mínimo 10 caracteres, mayúscula, minúscula y número.
                    </p>
                    {createForm.role !== "admin" && (
                        <label className="pin-label">PIN temporal
                            <PinInput
                                value={createForm.pin}
                                onChange={(pin) => setCreateForm({
                                    ...createForm,
                                    pin,
                                })}
                            />
                        </label>
                    )}
                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => setCreateOpen(false)}
                        >
                            Cancelar
                        </button>
                        <button className="btn btn-primary" disabled={working}>
                            {working && <Loader2 className="animate-spin" size={18} />}
                            Crear
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(editing)}
                onClose={() => !working && setEditing(null)}
                title="Editar usuario"
            >
                {editing && (
                    <form className="admin-user-form" onSubmit={updateUser}>
                        <label>Nombre completo
                            <input
                                required
                                value={editing.full_name || ""}
                                onChange={(event) => setEditing({
                                    ...editing,
                                    full_name: event.target.value,
                                })}
                            />
                        </label>
                        <label>Usuario
                            <input
                                required
                                value={editing.username}
                                onChange={(event) => setEditing({
                                    ...editing,
                                    username: event.target.value,
                                })}
                            />
                        </label>
                        <div className="form-row">
                            <label>Rol
                                <select
                                    value={editing.role}
                                    disabled={editing.id === currentUserId}
                                    onChange={(event) => setEditing({
                                        ...editing,
                                        role: event.target.value as UserRole,
                                    })}
                                >
                                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                        <option key={value} value={value}>{label}</option>
                                    ))}
                                </select>
                            </label>
                            <label>Teléfono
                                <input
                                    value={editing.phone || ""}
                                    onChange={(event) => setEditing({
                                        ...editing,
                                        phone: event.target.value,
                                    })}
                                />
                            </label>
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setEditing(null)}
                            >
                                Cancelar
                            </button>
                            <button className="btn btn-primary" disabled={working}>
                                {working && <Loader2 className="animate-spin" size={18} />}
                                Guardar
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(emailUser)}
                onClose={() => !working && setEmailUser(null)}
                title="Cambiar correo"
            >
                <form className="admin-user-form" onSubmit={updateEmail}>
                    <p className="auth-help">
                        El correo se actualizará en Authentication y en el perfil.
                    </p>
                    <label>Correo nuevo
                        <input
                            required
                            type="email"
                            value={newEmail}
                            onChange={(event) => setNewEmail(event.target.value)}
                        />
                    </label>
                    <div className="modal-actions">
                        <button type="button" className="btn btn-secondary" onClick={() => setEmailUser(null)}>
                            Cancelar
                        </button>
                        <button className="btn btn-primary" disabled={working}>
                            Guardar correo
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                isOpen={Boolean(statusUser)}
                onClose={() => !working && setStatusUser(null)}
                title={statusUser?.account_status === "active"
                    ? "Desactivar usuario"
                    : "Activar usuario"}
            >
                {statusUser && (
                    <div className="admin-user-form">
                        <p>
                            {statusUser.account_status === "active"
                                ? `Se bloqueará inmediatamente el acceso de ${statusUser.full_name || statusUser.username}.`
                                : `Se habilitará nuevamente el acceso de ${statusUser.full_name || statusUser.username}.`}
                        </p>
                        {statusUser.account_status === "active" && (
                            <label>Motivo opcional
                                <textarea
                                    rows={3}
                                    value={statusReason}
                                    onChange={(event) => setStatusReason(event.target.value)}
                                />
                            </label>
                        )}
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setStatusUser(null)}>
                                Cancelar
                            </button>
                            <button
                                className={statusUser.account_status === "active"
                                    ? "btn btn-danger"
                                    : "btn btn-primary"}
                                disabled={working}
                                onClick={toggleStatus}
                            >
                                <Power size={18} />
                                Confirmar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            <Modal
                isOpen={Boolean(emergencyUser)}
                onClose={() => !working && setEmergencyUser(null)}
                title="Código de emergencia"
            >
                {emergencyUser && (
                    <div className="emergency-code-dialog">
                        {!emergencyCode ? (
                            <>
                                <ShieldCheck size={42} />
                                <p>
                                    El código será válido durante 10 minutos y
                                    podrá utilizarse una sola vez.
                                </p>
                                <button
                                    className="btn btn-primary"
                                    disabled={working}
                                    onClick={generateEmergencyCode}
                                >
                                    {working ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                                    Generar código
                                </button>
                            </>
                        ) : (
                            <>
                                <p>Entrega este código únicamente al empleado:</p>
                                <strong className="emergency-code">{emergencyCode}</strong>
                                <p className="auth-help">
                                    No se volverá a mostrar cuando cierres esta ventana.
                                </p>
                            </>
                        )}
                    </div>
                )}
            </Modal>
        </>
    );
}
