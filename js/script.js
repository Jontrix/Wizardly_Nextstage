// ── Partículas de estrellas en el hero ──
const canvas = document.getElementById('stardust');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let stars = [];

    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }

    function init() {
        stars = Array.from({ length: 120 }, () => ({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            r: Math.random() * 1.4 + 0.3,
            alpha: Math.random(),
            speed: Math.random() * 0.004 + 0.002,
            phase: Math.random() * Math.PI * 2
        }));
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        stars.forEach(s => {
            s.phase += s.speed;
            const a = (Math.sin(s.phase) + 1) / 2 * 0.7 + 0.1;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(246, 213, 122, ${a})`;
            ctx.fill();
        });
        requestAnimationFrame(draw);
    }

    window.addEventListener('resize', () => { resize(); init(); });
    resize();
    init();
    draw();

    document.addEventListener("mousemove", function (e) {
        const sparkle = document.createElement("span");
        sparkle.classList.add("sparkle");
        sparkle.style.left = e.pageX + "px";
        sparkle.style.top = e.pageY + "px";
        document.body.appendChild(sparkle);

        setTimeout(() => {
            sparkle.remove();
        }, 1000);
    });
}

// ── Rutas ──
function obtenerRutaPerfil() {
    return window.location.pathname.includes('/pages/') ? 'perfil.html' : 'pages/perfil.html';
}

function obtenerRutaLogin() {
    return window.location.pathname.includes('/pages/') ? 'login.html' : 'pages/login.html';
}

// ── Validación común de formularios ──
function configurarValidacionFormularios() {
    document.querySelectorAll('form').forEach((formulario) => {
        formulario.removeAttribute('novalidate');
    });
}

document.addEventListener('submit', (evento) => {
    const formulario = evento.target;
    if (!(formulario instanceof HTMLFormElement)) return;

    formulario.removeAttribute('novalidate');
    formulario.querySelectorAll('input, select, textarea').forEach((campo) => {
        const estilos = window.getComputedStyle(campo);
        // getClientRects() es 0 cuando el campo o CUALQUIER contenedor padre está oculto (display:none).
        // Antes solo se revisaba el propio campo, y los campos de tarjeta ocultos (al pagar con
        // monedero o transferencia) quedaban obligatorios y bloqueaban el envío sin mostrar nada.
        const visible = campo.getClientRects().length > 0 && estilos.visibility !== 'hidden';
        const tipoOpcional = ['hidden', 'button', 'submit', 'reset', 'checkbox', 'radio'].includes(campo.type);
        // Campos marcados como opcionales (data-opcional o "opcional" en el placeholder)
        const marcadoOpcional = campo.hasAttribute('data-opcional') || /opcional/i.test(campo.getAttribute('placeholder') || '');
        campo.required = visible && !tipoOpcional && !marcadoOpcional;
    });

    if (!formulario.checkValidity()) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        formulario.reportValidity();
    }
}, true);

// ── Actualizar Navbar ──
function actualizarNavbarUsuario() {
    const btnLogin = document.querySelector('.btn-login');
    if (!btnLogin) return;

    const estaLogueado = localStorage.getItem('usuarioLogueado') === 'true';
    const datosRaw = localStorage.getItem('usuarioDatos');
    let datosUsuario = null;

    try {
        datosUsuario = datosRaw ? JSON.parse(datosRaw) : null;
    } catch (error) {
        datosUsuario = null;
    }

    if (estaLogueado && datosUsuario?.nombre) {
        const nombre = String(datosUsuario.nombre).trim();
        const inicial = nombre.charAt(0).toUpperCase() || 'U';

        btnLogin.setAttribute('href', obtenerRutaPerfil());
        btnLogin.classList.add('btn-perfil-nav');
        btnLogin.innerHTML = `<span class="avatar-nav">${inicial}</span> Perfil`;
    } else {
        btnLogin.setAttribute('href', obtenerRutaLogin());
        btnLogin.classList.remove('btn-perfil-nav');
        btnLogin.innerHTML = 'Acceder';
    }
}

// ========================================================
// 🛡️ GUARDIÁN DE SEGURIDAD UNIVERSAL 🛡️
// ========================================================
// Roles que pueden entrar al Panel Arcano (Módulo 3.5: administrador, ventas, logística).
// Los permisos por página de cada rol los aplica js/sidebar.js.
function esRolEmpresarial(rol) {
    const normalizado = String(rol || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    return ["administrador", "admin", "admin_supremo", "ventas", "logistica"].includes(normalizado);
}

function verificarAccesoMagico() {
    const paginaActual = window.location.pathname.toLowerCase();
    const estaLogueado = localStorage.getItem('usuarioLogueado') === 'true';
    let usuario = null;

    try {
        usuario = JSON.parse(localStorage.getItem('usuarioDatos'));
    } catch (e) {
        usuario = null;
    }

    // 1. Proteger el Panel Arcano (Cualquier archivo que se llame admin...)
    if (paginaActual.includes("admin")) {
        if (!estaLogueado || !usuario) {
            // No ha iniciado sesión, se va al login
            window.location.href = "login.html"; 
            return;
        } else if (!esRolEmpresarial(usuario.rol)) {
            // Inició sesión pero ES CLIENTE, lo mandamos a su perfil para que no vea la base de datos
            window.location.href = "perfil.html"; 
            return;
        }
    }

    // 2. Proteger el Perfil del Cliente
    if (paginaActual.includes("perfil.html")) {
        if (!estaLogueado || !usuario) {
            window.location.href = "login.html";
            return;
        }
    }

    // 3. Escribir el nombre del usuario en la barra superior del Admin
    const nombreTopBar = document.querySelector(".topbar-usuario span");
    if (nombreTopBar && usuario) {
        nombreTopBar.textContent = usuario.nombre || "Mago Supremo";
    }
}

// ── Iniciar Funciones al Cargar ──
document.addEventListener('DOMContentLoaded', () => {
    configurarValidacionFormularios();
    actualizarNavbarUsuario();
    verificarAccesoMagico(); // Agregamos al guardián
});

document.addEventListener('navbarCargado', () => {
    actualizarNavbarUsuario();
});

window.addEventListener('storage', () => {
    actualizarNavbarUsuario();
    verificarAccesoMagico(); // Agregamos al guardián
});