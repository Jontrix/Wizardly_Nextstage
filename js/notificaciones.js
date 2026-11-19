// ============================================================
//  WIZARDLY — notificaciones.js
//  Avisos dentro de la página (reemplazo de alert()).
//  Uso: mostrarNotificacion("Texto", "exito" | "error" | "aviso" | "info", duracionMs)
// ============================================================

(function () {
    const ESTILOS_ID = "wz-notificaciones-estilos";
    const CONTENEDOR_ID = "wz-notificaciones";

    const TIPOS = {
        exito: { color: "#4ade80", icono: "fa-circle-check" },
        error: { color: "#f87171", icono: "fa-triangle-exclamation" },
        aviso: { color: "#d4af37", icono: "fa-hat-wizard" },
        info: { color: "#c084fc", icono: "fa-circle-info" }
    };

    function inyectarEstilos() {
        if (document.getElementById(ESTILOS_ID)) return;
        const estilo = document.createElement("style");
        estilo.id = ESTILOS_ID;
        estilo.textContent = `
            #${CONTENEDOR_ID} {
                position: fixed;
                right: 24px;
                bottom: 24px;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                gap: 10px;
                max-width: min(380px, calc(100vw - 32px));
                pointer-events: none;
            }
            .wz-notif {
                display: flex;
                align-items: flex-start;
                gap: 12px;
                padding: 14px 18px;
                border-radius: 14px;
                background: rgba(18, 14, 28, 0.94);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                border: 1px solid var(--wz-notif-color);
                border-left: 4px solid var(--wz-notif-color);
                color: #f0e6d2;
                font-family: 'Lato', sans-serif;
                font-size: 0.95rem;
                line-height: 1.45;
                box-shadow: 0 12px 30px rgba(0, 0, 0, 0.45), 0 0 18px color-mix(in srgb, var(--wz-notif-color) 25%, transparent);
                pointer-events: auto;
                opacity: 0;
                transform: translateY(12px);
                transition: opacity 0.3s ease, transform 0.3s ease;
            }
            .wz-notif.visible { opacity: 1; transform: translateY(0); }
            .wz-notif i.wz-notif-icono { color: var(--wz-notif-color); font-size: 1.15rem; margin-top: 2px; }
            .wz-notif .wz-notif-texto { flex: 1; }
            .wz-notif button {
                background: none; border: none; color: rgba(240, 230, 210, 0.6);
                cursor: pointer; font-size: 1rem; padding: 0 0 0 6px;
            }
            .wz-notif button:hover { color: #fff; }
        `;
        document.head.appendChild(estilo);
    }

    function obtenerContenedor() {
        let contenedor = document.getElementById(CONTENEDOR_ID);
        if (!contenedor) {
            contenedor = document.createElement("div");
            contenedor.id = CONTENEDOR_ID;
            contenedor.setAttribute("role", "status");
            contenedor.setAttribute("aria-live", "polite");
            document.body.appendChild(contenedor);
        }
        return contenedor;
    }

    function cerrar(notif) {
        notif.classList.remove("visible");
        setTimeout(() => notif.remove(), 300);
    }

    window.mostrarNotificacion = function (mensaje, tipo = "info", duracion = 3800) {
        if (!document.body) {
            document.addEventListener("DOMContentLoaded", () => window.mostrarNotificacion(mensaje, tipo, duracion));
            return;
        }
        inyectarEstilos();
        const config = TIPOS[tipo] || TIPOS.info;

        const notif = document.createElement("div");
        notif.className = "wz-notif";
        notif.style.setProperty("--wz-notif-color", config.color);

        const icono = document.createElement("i");
        icono.className = `fa-solid ${config.icono} wz-notif-icono`;

        const texto = document.createElement("span");
        texto.className = "wz-notif-texto";
        texto.textContent = String(mensaje);

        const btnCerrar = document.createElement("button");
        btnCerrar.type = "button";
        btnCerrar.setAttribute("aria-label", "Cerrar aviso");
        btnCerrar.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        btnCerrar.addEventListener("click", () => cerrar(notif));

        notif.append(icono, texto, btnCerrar);
        obtenerContenedor().appendChild(notif);
        requestAnimationFrame(() => notif.classList.add("visible"));

        if (duracion > 0) setTimeout(() => cerrar(notif), duracion);
        return notif;
    };
})();
