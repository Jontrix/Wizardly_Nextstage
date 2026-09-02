import { initializeApp } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";


const firebaseConfig = {
    apiKey: "AIzaSyAWS58ylvzDdDF8UmzrybqXQVj9JnAmT8U",
    authDomain: "wizardly-nextstage.firebaseapp.com",
    projectId: "wizardly-nextstage",
    storageBucket: "wizardly-nextstage.firebasestorage.app",
    messagingSenderId: "336735978219",
    appId: "1:336735978219:web:15a92d2b473cbb6f82b4ae",
    measurementId: "G-FE1XKG7BFF"
};


// Inicializar Firebase
const app = initializeApp(firebaseConfig);


// Authentication
const auth = getAuth(app);


// Firestore
const db = getFirestore(app);


export { auth, db };