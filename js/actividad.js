import {
    initializeApp,
    getApps
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";

import {
    getFirestore,
    collection,
    addDoc,
    Timestamp
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";


const firebaseConfig = {

    apiKey: "AIzaSyAWS58ylvzDdDF8UmzrybqXQVj9JnAmT8U",

    authDomain:
        "wizardly-nextstage.firebaseapp.com",

    projectId:
        "wizardly-nextstage",

    storageBucket:
        "wizardly-nextstage.firebasestorage.app",

    messagingSenderId:
        "336735978219",

    appId:
        "1:336735978219:web:15a92d2b473cbb6f82b4ae",

    measurementId:
        "G-FE1XKG7BFF"

};


const app =
    getApps().length
        ? getApps()[0]
        : initializeApp(firebaseConfig);


const db =
    getFirestore(app);


const auth =
    getAuth(app);


/**
 * Registra una actividad del administrador
 */
export async function registrarActividad({

    cliente = "Sin cliente",

    tipo = "dashboard",

    descripcion = "",

    modulo = "dashboard"

} = {}) {


    const usuario =
        auth.currentUser;


    if (!usuario) {

        console.warn(
            "No existe un administrador autenticado."
        );

        return false;

    }


    try {

        await addDoc(
            collection(
                db,
                "actividad"
            ),
            {

                adminUid:
                    usuario.uid,

                adminNombre:
                    usuario.displayName ||
                    usuario.email ||
                    "Administrador",

                cliente:
                    cliente,

                tipo:
                    tipo,

                descripcion:
                    descripcion,

                modulo:
                    modulo,

                fecha:
                    Timestamp.now()

            }
        );


        console.log(
            "✓ Actividad registrada:",
            descripcion
        );


        return true;


    } catch (error) {

        console.error(
            "Error al registrar actividad:",
            error
        );


        return false;

    }

}


export {
    db,
    auth
};