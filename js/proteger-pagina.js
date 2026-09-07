import { auth } from
"./firebase-config.js";


import {
    onAuthStateChanged
} from
"https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";


onAuthStateChanged(
    auth,
    (usuario) => {

        if (!usuario) {

            window.location.href =
                "../pages/login.html";

        }

    }
);