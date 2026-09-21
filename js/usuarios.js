import { registrarActividad } from './firebaseUtils.js';

async function guardarCliente() {
  try {
    // Tu código actual para guardar al cliente (addDoc, setDoc, etc.)
    // const docRef = await addDoc(collection(db, "clientes"), nuevoCliente);

    console.log("Cliente guardado correctamente en Firestore");

    await registrarActividad("clientes", "crear", "Se agregó un nuevo cliente");
  } catch (error) {
    console.error("Error guardando cliente:", error);
  }
}

export { guardarCliente };