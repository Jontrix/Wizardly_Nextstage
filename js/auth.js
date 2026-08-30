import {
    auth,
    db
} from "./firebase-config.js";


import {
    createUserWithEmailAndPassword
} from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


import {
    doc,
    setDoc
} from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";



export async function registrarUsuario(
    nombre,
    email,
    password
) {

    try {

        // CREAR USUARIO EN AUTHENTICATION
        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const usuario =
            userCredential.user;


        // GUARDAR DATOS ADICIONALES
        await setDoc(
            doc(
                db,
                "usuarios",
                usuario.uid
            ),
            {
                nombre: nombre,
                email: email,
                fechaRegistro: new Date()
            }
        );


        console.log(
            "Usuario creado:",
            usuario.uid
        );


        return usuario;


    } catch (error) {

        console.error(
            "Error:",
            error.message
        );


        throw error;

    }

}