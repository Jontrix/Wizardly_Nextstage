// ============================================================
//  WIZARDLY — sesion.js
//  "Recordarme" del inicio de sesión.
//
//  - Con "Recordarme" marcado la sesión se mantiene aunque se cierre
//    el navegador (localStorage.wz_recordar = "si").
//  - Sin marcar, la sesión termina al cerrar el navegador: el login deja
//    una cookie de sesión "wz_sesion" (sin fecha de caducidad, el navegador
//    la borra al cerrarse). Si ya no existe, aquí se cierra la sesión.
//
//  Se carga desde js/cargar-navbar.js (tienda) y js/sidebar.js (panel).
// ============================================================

import { auth } from "./firebase-config.js";
import { signOut } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const sesionVencida =
    localStorage.getItem("wz_recordar") === "no" &&
    !document.cookie.split(";").some(c => c.trim().startsWith("wz_sesion=")) &&
    (localStorage.getItem("usuarioLogueado") === "true" || localStorage.getItem("usuarioDatos"));

if (sesionVencida) {
    localStorage.removeItem("usuarioLogueado");
    localStorage.removeItem("usuarioDatos");
    signOut(auth).catch(err => console.error("No se pudo cerrar la sesión vencida:", err)).finally(() => {
        // En el panel no se puede seguir sin sesión
        if (/\/admin[^/]*\.html$/.test(location.pathname)) {
            location.href = "login.html";
        } else if (/\/(perfil|monedero|checkout)\.html$/.test(location.pathname)) {
            location.reload();
        }
    });
}
