export function AuthMessage({
    message,
    type = "error",
}: {
    message?: string;
    type?: "error" | "success" | "info";
}) {
    if (!message) return null;

    return (
        <div className={`auth-message auth-message-${type}`} role="status">
            {message}
        </div>
    );
}
