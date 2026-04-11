export type Product = {
    id: string;
    name: string;
    price: number;
    category: string;
    stock: number;
    image_url?: string;
};

export type OrderItem = {
    id: string;
    product_id: string;
    product_name: string; // denormalized for ease
    quantity: number;
    price: number;
};

export type Order = {
    id: string;
    table_number: string;
    status: "pending" | "preparing" | "served" | "ready" | "editing";
    status_id: number;
    status_description?: string;
    is_paid: boolean;
    total: number;
    created_at: string;
    items: OrderItem[];
};

export type PaymentType = {
    id: number;
    type: string;
    description: string;
};

export type AuditItem = {
    product_name: string;
    quantity: number;
};

export type Auditoria_Pedidos = {
    id: string;
    fecha_hora: string; 
    usuario: string;
    mesa: string;
    pedido_id: string;
    estado_pedido: "Editado" | "Cancelado/Eliminado"; 
    pedido_original: string;
    pedido_actualizado: string;
    itemsAudit?: AuditItem[]; 
};

export type ReporteVenta = {
    pedido_id: string;
    fecha_hora: string;
    mesa: string; 
    mesero: string;
    cocinero: string;
    cajero: string;
    cancelado_por: string;
    estado: string;
    monto: number;
    tipo_pago: string;
};
