import { collection, addDoc } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";
import { db } from "./firebase-config.js"; 

export async function registrarActividad(modulo, accion, descripcion) {
  try {
    // Intenta obtener el nombre del administrador activo
    let adminNombre = "Iovani"; // Valor por defecto
    const datosRaw = localStorage.getItem('usuarioDatos');
    
    if (datosRaw) {
        const usuario = JSON.parse(datosRaw);
        if (usuario && usuario.nombre) {
            adminNombre = usuario.nombre;
        }
    }

    await addDoc(collection(db, "historial"), {
      modulo: modulo,
      accion: accion,
      descripcion: descripcion,
      adminNombre: adminNombre,
      adminUid: "desconocido",
      fecha: new Date()
    });
    
    console.log("✅ Historial guardado con éxito en Firebase");
  } catch (error) {
    console.error("❌ Error al guardar en el historial:", error);
  }
}