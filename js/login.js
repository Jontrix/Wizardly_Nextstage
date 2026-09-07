import { auth, db } from "./firebase-config.js";

import {
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const formulario = document.getElementById("loginForm");

const mensaje = document.getElementById("mensaje-login");


formulario.addEventListener("submit", async function (e) {

    e.preventDefault();


    const correo = document
        .getElementById("correo")
        .value
        .trim();


    const password = document
        .getElementById("password")
        .value
        .trim();


    const recordar = document
        .getElementById("recordar")
        .checked;


    // Validar campos

    if (!correo || !password) {

        alert("Por favor completa todos los campos.");

        return;
    }


    try {

        /*
        =====================================
        RECORDAR SESIÓN
        =====================================
        */

        if (recordar) {

            await setPersistence(
                auth,
                browserLocalPersistence
            );

        } else {

            await setPersistence(
                auth,
                browserSessionPersistence
            );
        }


        /*
        =====================================
        INICIAR SESIÓN
        =====================================
        */

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                correo,
                password
            );


        const user = userCredential.user;


        console.log(
            "Inicio de sesión correcto"
        );

        console.log(
            "UID:",
            user.uid
        );


        /*
        =====================================
        BUSCAR DATOS EN FIRESTORE
        =====================================
        */

        const usuarioRef = doc(
            db,
            "usuarios",
            user.uid
        );


        const usuarioSnap =
            await getDoc(usuarioRef);


        let nombre =
            correo.split("@")[0];

        let usuario =
            "@" +
            correo
                .split("@")[0]
                .replace(/[^a-zA-Z0-9]/g, "");


        if (usuarioSnap.exists()) {

            const datos =
                usuarioSnap.data();


            nombre =
                datos.nombre ||
                nombre;


            usuario =
                datos.usuario ||
                usuario;
        }


        /*
        =====================================
        GUARDAR SESIÓN
        =====================================
        */

        const usuarioDatos = {

            uid: user.uid,

            nombre: nombre,

            correo: user.email,

            usuario: usuario

        };


        localStorage.setItem(
            "usuarioDatos",
            JSON.stringify(usuarioDatos)
        );


        localStorage.setItem(
            "usuarioLogueado",
            "true"
        );


        /*
        =====================================
        MENSAJE
        =====================================
        */

        if (mensaje) {

            mensaje.classList.add("mostrar");

        }


        /*
        =====================================
        IR AL PERFIL
        =====================================
        */

        setTimeout(() => {

            window.location.href =
                "perfil.html";

        }, 1200);


    } catch (error) {

        console.error(
            "Error de Firebase:",
            error
        );


        let mensajeError =
            "No se pudo iniciar sesión.";


        switch (error.code) {

            case "auth/invalid-email":

                mensajeError =
                    "El correo electrónico no es válido.";

                break;


            case "auth/user-not-found":

                mensajeError =
                    "No existe una cuenta con este correo.";

                break;


            case "auth/wrong-password":

                mensajeError =
                    "La contraseña es incorrecta.";

                break;


            case "auth/invalid-credential":

                mensajeError =
                    "El correo o la contraseña son incorrectos.";

                break;


            case "auth/too-many-requests":

                mensajeError =
                    "Demasiados intentos. Intenta nuevamente más tarde.";

                break;


            case "auth/operation-not-allowed":

                mensajeError =
                    "Debes activar Email/Password en Firebase Authentication.";

                break;


            case "auth/network-request-failed":

                mensajeError =
                    "No hay conexión con Firebase.";

                break;


            default:

                mensajeError =
                    error.message;

        }


        alert(mensajeError);

    }

});