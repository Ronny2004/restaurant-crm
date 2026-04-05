// src/lib/formatters.ts
/*  El siguiente formato es para convertir la fecha UTC a la hora local de Ecuador (GMT-5) y mostrarla en formato legible

    * El formato es dd/mm/yyyy, hh:mm:ss AM/PM

    El siguiente formato no se esta utilizando pero lo dejamos aquí por si en el futuro queremos en algun componente mostrar la fecha de creación o actualización de un pedido, producto, etc. en formato legible para el usuario.
*/
export const formatLocalTime = (utcDateString: string) => {
    if (!utcDateString) return "Fecha no válida";

    const date = new Date(utcDateString);

    return date.toLocaleString('es-EC', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true 
    });
};