import { initializeApp } from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";


import { getFirestore } from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


import { getAuth } from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


// CONFIGURACIÓN
const firebaseConfig = {

    apiKey: "TU_API_KEY",

    authDomain: "TU_AUTH_DOMAIN",

    projectId: "TU_PROJECT_ID",

    storageBucket: "TU_STORAGE_BUCKET",

    messagingSenderId: "TU_MESSAGING_SENDER_ID",

    appId: "TU_APP_ID"

};


// INICIALIZAR
const app =
    initializeApp(firebaseConfig);


// FIRESTORE
const db =
    getFirestore(app);


// AUTHENTICATION
const auth =
    getAuth(app);


// EXPORTAR
export {
    db,
    auth
};