import { db } from "./firebase-config.js";

import {
    collection,
    addDoc
} from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


export async function agregarUsuario(nombre, email) {

    try {

        const docRef = await addDoc(
            collection(db, "usuarios"),
            {
                nombre: nombre,
                email: email,
                fechaRegistro: new Date()
            }
        );

        console.log(
            "Usuario agregado:",
            docRef.id
        );

    } catch (error) {

        console.error(
            "Error al agregar usuario:",
            error
        );

    }

}