const PERMISOS = {
    administrador: {
        inicio: "admin.html",
        archivos: ["*"]
    },
    ventas: {
        inicio: "admin.html",
        archivos: [
            "admin.html",
            "admin-promociones.html",
            "admin-clientes.html",
            "admin-cliente-detalle.html",
            "admin-actividad.html",
            "admin-erp.html",
            "admin-productos.html",
            "admin-ordenes.html",
            "admin-reporteserp.html"
        ]
    },
    logistica: {
        inicio: "admin-scm.html",
        archivos: [
            "admin-scm.html",
            "admin-productos.html",
            "admin-pedidos.html",
            "admin-proveedores.html",
            "admin-inventario.html",
            "admin-logistica.html",
            "admin-reportes.html",
            "admin-erp.html",
            "admin-ordenes.html",
            "admin-reporteserp.html"
        ]
    }
};

function normalizar(valor) {
    return String(valor || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
}

function mostrarAviso(mensaje) {
    const aviso = document.createElement("div");
    aviso.className = "toast-admin";
    aviso.setAttribute("role", "status");
    aviso.setAttribute("aria-live", "polite");
    aviso.textContent = mensaje;
    Object.assign(aviso.style, {
        position: "fixed",
        right: "24px",
        bottom: "24px",
        zIndex: "10000",
        maxWidth: "min(360px, calc(100vw - 32px))",
        padding: "14px 18px",
        color: "#fff",
        background: "#25221c",
        border: "1px solid #d4af62",
        borderRadius: "8px",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
        fontFamily: "Lato, sans-serif"
    });
    document.body.appendChild(aviso);
    window.setTimeout(() => aviso.remove(), 2400);
}

function archivoDeHref(enlace) {
    try {
        return new URL(enlace.getAttribute("href"), document.baseURI)
            .pathname.split("/").pop();
    } catch {
        return "";
    }
}

function tienePermiso(permisos, archivo) {
    return permisos.archivos.includes("*") || permisos.archivos.includes(archivo);
}

export function aplicarRol() {
    const raiz = document.documentElement;
    const visibilidadOriginal = raiz.style.visibility;

    try {
        raiz.style.visibility = "hidden";
        if (localStorage.getItem("usuarioLogueado") !== "true") return;

        const datosGuardados = localStorage.getItem("usuarioDatos");
        const usuario = datosGuardados ? JSON.parse(datosGuardados) : {};
        const rolNormalizado = normalizar(usuario.rol || "administrador");
        const permisos = PERMISOS[rolNormalizado];

        if (!permisos) {
            document.querySelectorAll(".sidebar-nav a.nav-item").forEach((enlace) => {
                enlace.style.display = "none";
            });
            document.querySelectorAll(".sidebar-nav .sidebar-titulo").forEach((titulo) => {
                titulo.style.display = "none";
            });
            mostrarAviso("El rol de esta cuenta no tiene permisos configurados.");
            return;
        }

        const enlaces = [...document.querySelectorAll(".sidebar-nav a.nav-item")];
        enlaces.forEach((enlace) => {
            enlace.style.display = tienePermiso(permisos, archivoDeHref(enlace)) ? "" : "none";
        });

        if (rolNormalizado === "ventas") {
            enlaces
                .filter((enlace) => archivoDeHref(enlace) === "admin-actividad.html")
                .forEach((enlace) => {
                    [...enlace.childNodes]
                        .filter((nodo) => nodo.nodeType === Node.TEXT_NODE)
                        .forEach((nodo) => nodo.remove());
                    enlace.append(" Mi actividad");
                });
        }

        document.querySelectorAll(".sidebar-nav .sidebar-titulo").forEach((titulo) => {
            const submenu = titulo.nextElementSibling;
            if (!submenu) return;

            const tieneEnlacesVisibles = [...submenu.querySelectorAll("a.nav-item")]
                .some((enlace) => enlace.style.display !== "none");
            const displayOriginal = titulo.style.display || window.getComputedStyle(titulo).display;
            titulo.style.display = tieneEnlacesVisibles ? displayOriginal : "none";
        });

        const paginaActual = window.location.pathname.split("/").pop();
        if (!tienePermiso(permisos, paginaActual)) {
            mostrarAviso("No tienes acceso a esta página. Serás redirigido a tu inicio.");
            if (tienePermiso(permisos, permisos.inicio)) {
                window.setTimeout(() => {
                    window.location.href = permisos.inicio;
                }, 900);
            }
        }
    } catch (error) {
        console.error("No se pudo aplicar el rol del usuario.", error);
        try {
            mostrarAviso("No se pudo aplicar el menú de permisos.");
        } catch {
            // El finally sigue restaurando la página aunque el DOM no permita mostrar el aviso.
        }
    } finally {
        raiz.style.visibility = visibilidadOriginal;
    }
}