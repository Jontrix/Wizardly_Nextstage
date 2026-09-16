import { collection, addDoc, Timestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

export async function registrarHistorial(db, { modulo, accion, descripcion, entidadId }) {
    try {
        const usuarioDatos = localStorage.getItem("usuarioDatos");
        const admin = usuarioDatos ? JSON.parse(usuarioDatos) : null;

        await addDoc(collection(db, "historial"), {
            modulo,
            accion,
            descripcion,
            entidadId: entidadId ?? null,
            adminUid: admin?.uid || "desconocido",
            adminNombre: admin?.nombre || "Sistema",
            fecha: Timestamp.now()
        });
    } catch (error) {
        console.error("Error al registrar historial:", error);
    }
}
