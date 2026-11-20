// ============================================================
//  WIZARDLY — soporte-widget.js
//  Botón flotante de SOPORTE TÉCNICO en todas las páginas del cliente.
//
//  - El cliente (con o sin sesión) envía su solicitud desde un formulario.
//  - Se guarda en Firestore, colección "tickets_atencion" (la misma que
//    atiende el panel admin-soporte.html).
//  - Cuando el equipo de soporte responde, aparece un aviso rojo en el
//    botón y el cliente puede leer la respuesta en "Mis mensajes".
//
//  Se carga solo desde js/cargar-navbar.js (o con <script type="module">
//  en las páginas sin navbar).
// ============================================================

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
    collection, addDoc, doc, getDoc, updateDoc, query, where, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

if (!window.__wzSoporteCargado) {
    window.__wzSoporteCargado = true;
    iniciarWidget();
}

function iniciarWidget() {
    const CLAVE_INVITADO = "wz_tickets_invitado";
    const TIPOS = [
        "Problema con mi pedido",
        "Pagos y monedero",
        "Mi cuenta o acceso",
        "Error en la página",
        "Dudas sobre productos",
        "Otro"
    ];

    let usuario = null;
    let tickets = [];
    let cancelarEscucha = null;
    let pestanaActual = "nuevo";

    const esc = (t) => String(t ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
    const aFecha = (v) => (v && typeof v.toDate === "function") ? v.toDate() : (v ? new Date(v) : null);
    const formatoFecha = (v) => {
        const f = aFecha(v);
        return f && !isNaN(f) ? f.toLocaleString("es-MX", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "Hace un momento";
    };
    const avisar = (m, t = "info") => window.mostrarNotificacion ? window.mostrarNotificacion(m, t) : null;

    // ---------- Estilos ----------
    const estilo = document.createElement("style");
    estilo.id = "wz-soporte-estilos";
    estilo.textContent = `
        #wz-soporte-btn {
            position: fixed; right: 24px; bottom: 24px; z-index: 99990;
            width: 60px; height: 60px; border-radius: 50%; border: 2px solid #d4af37;
            background: radial-gradient(circle at 30% 30%, #3b1d5e, #120e1c);
            color: #d4af37; font-size: 1.55rem; cursor: pointer;
            box-shadow: 0 8px 24px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.35);
            display: flex; align-items: center; justify-content: center;
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        #wz-soporte-btn:hover { transform: scale(1.07); box-shadow: 0 8px 28px rgba(0,0,0,0.55), 0 0 26px rgba(212,175,55,0.55); }
        #wz-soporte-badge {
            position: absolute; top: -4px; right: -4px; min-width: 22px; height: 22px; padding: 0 6px;
            border-radius: 11px; background: #ef4444; color: #fff; font: 700 0.75rem 'Lato', sans-serif;
            display: none; align-items: center; justify-content: center; border: 2px solid #120e1c;
            animation: wzPulso 1.6s infinite;
        }
        @keyframes wzPulso { 0%,100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.6); } 50% { box-shadow: 0 0 0 7px rgba(239,68,68,0); } }
        #wz-soporte-panel {
            position: fixed; right: 24px; bottom: 96px; z-index: 99991;
            width: min(370px, calc(100vw - 32px)); max-height: min(560px, calc(100vh - 130px));
            display: none; flex-direction: column; overflow: hidden;
            background: rgba(18, 14, 28, 0.97); border: 1px solid rgba(212,175,55,0.45); border-radius: 18px;
            box-shadow: 0 20px 50px rgba(0,0,0,0.6); font-family: 'Lato', sans-serif; color: #f0e6d2;
            backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px);
        }
        #wz-soporte-panel.abierto { display: flex; animation: wzAparecer 0.22s ease; }
        @keyframes wzAparecer { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        .wz-sop-header {
            padding: 16px 18px; background: linear-gradient(120deg, rgba(126,34,206,0.45), rgba(212,175,55,0.25));
            display: flex; align-items: center; justify-content: space-between; gap: 10px;
        }
        .wz-sop-header h4 { margin: 0; font-family: 'Cinzel', serif; color: #d4af37; font-size: 1.05rem; }
        .wz-sop-header small { display: block; color: rgba(240,230,210,0.75); font-size: 0.78rem; margin-top: 2px; }
        .wz-sop-cerrar { background: none; border: none; color: rgba(240,230,210,0.7); font-size: 1.2rem; cursor: pointer; }
        .wz-sop-tabs { display: flex; border-bottom: 1px solid rgba(255,255,255,0.08); }
        .wz-sop-tabs button {
            flex: 1; padding: 11px 8px; background: none; border: none; cursor: pointer;
            color: rgba(240,230,210,0.65); font: 600 0.88rem 'Lato', sans-serif; border-bottom: 2px solid transparent;
        }
        .wz-sop-tabs button.activo { color: #d4af37; border-bottom-color: #d4af37; }
        .wz-sop-tabs .wz-sop-punto {
            display: inline-block; min-width: 18px; height: 18px; line-height: 18px; margin-left: 6px; padding: 0 5px;
            border-radius: 9px; background: #ef4444; color: #fff; font-size: 0.7rem;
        }
        .wz-sop-cuerpo { padding: 16px 18px; overflow-y: auto; flex: 1; }
        .wz-sop-saludo { margin: 0 0 14px; line-height: 1.5; font-size: 0.93rem; }
        .wz-sop-campo { margin-bottom: 12px; }
        .wz-sop-campo label { display: block; font-size: 0.82rem; margin-bottom: 5px; color: rgba(240,230,210,0.8); }
        .wz-sop-campo input, .wz-sop-campo select, .wz-sop-campo textarea {
            width: 100%; box-sizing: border-box; padding: 10px 12px; border-radius: 10px;
            border: 1px solid rgba(255,255,255,0.18); background: rgba(0,0,0,0.35); color: #fff;
            font: 0.9rem 'Lato', sans-serif; outline: none; resize: vertical;
        }
        .wz-sop-campo select option { background: #1a1a2e; }
        .wz-sop-campo input:focus, .wz-sop-campo select:focus, .wz-sop-campo textarea:focus { border-color: #d4af37; }
        .wz-sop-enviar {
            width: 100%; padding: 12px; border-radius: 10px; border: none; cursor: pointer;
            background: #d4af37; color: #120e1c; font: 700 0.95rem 'Lato', sans-serif;
        }
        .wz-sop-enviar:disabled { opacity: 0.6; cursor: wait; }
        .wz-sop-ticket {
            border: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.28);
            border-radius: 12px; padding: 12px; margin-bottom: 10px; font-size: 0.88rem;
        }
        .wz-sop-ticket.nuevo { border-color: rgba(74,222,128,0.55); box-shadow: 0 0 12px rgba(74,222,128,0.15); }
        .wz-sop-ticket-cab { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-bottom: 4px; }
        .wz-sop-folio { color: #d4af37; font-weight: 700; }
        .wz-sop-fecha { color: rgba(240,230,210,0.5); font-size: 0.75rem; }
        .wz-sop-msj { margin: 6px 0; white-space: pre-wrap; color: rgba(240,230,210,0.85); }
        .wz-sop-resp {
            margin-top: 8px; padding: 9px 10px; border-left: 3px solid #4ade80;
            background: rgba(74,222,128,0.08); border-radius: 0 8px 8px 0; white-space: pre-wrap;
        }
        .wz-sop-resp b { color: #4ade80; display: block; margin-bottom: 3px; }
        .wz-sop-esperando { color: rgba(240,230,210,0.5); font-style: italic; font-size: 0.8rem; }
        .wz-sop-estado { padding: 2px 9px; border-radius: 12px; font-size: 0.72rem; font-weight: 700; white-space: nowrap; }
        .wz-sop-estado.abierto { color: #f87171; border: 1px solid #ef4444; }
        .wz-sop-estado.en-proceso { color: #fde047; border: 1px solid #eab308; }
        .wz-sop-estado.respondido { color: #34d399; border: 1px solid #10b981; }
        .wz-sop-estado.cerrado { color: #9ca3af; border: 1px solid #6b7280; }
        .wz-sop-etiqueta-nueva { background: #16a34a; color: #fff; border-radius: 10px; padding: 1px 8px; font-size: 0.7rem; margin-left: 6px; }
        .wz-sop-vacio { text-align: center; color: rgba(240,230,210,0.55); padding: 20px 0; font-size: 0.9rem; }
        /* Los avisos de la página se suben para no tapar el botón */
        #wz-notificaciones { bottom: 100px !important; }
        @media (max-width: 480px) {
            #wz-soporte-btn { right: 16px; bottom: 16px; width: 54px; height: 54px; }
            #wz-soporte-panel { right: 16px; bottom: 82px; }
        }
    `;
    document.head.appendChild(estilo);

    // ---------- Estructura ----------
    const boton = document.createElement("button");
    boton.id = "wz-soporte-btn";
    boton.type = "button";
    boton.title = "Soporte técnico";
    boton.setAttribute("aria-label", "Abrir soporte técnico");
    boton.innerHTML = '<i class="fa-solid fa-headset"></i><span id="wz-soporte-badge">0</span>';

    const panel = document.createElement("div");
    panel.id = "wz-soporte-panel";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Soporte técnico");
    panel.innerHTML = `
        <div class="wz-sop-header">
            <div>
                <h4><i class="fa-solid fa-headset"></i> Soporte técnico</h4>
                <small>El Consejo Arcano te responderá aquí mismo</small>
            </div>
            <button type="button" class="wz-sop-cerrar" aria-label="Cerrar"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="wz-sop-tabs">
            <button type="button" data-tab="nuevo" class="activo">Nuevo mensaje</button>
            <button type="button" data-tab="mis">Mis mensajes<span class="wz-sop-punto" id="wz-sop-punto" style="display:none;">0</span></button>
        </div>
        <div class="wz-sop-cuerpo" id="wz-sop-cuerpo"></div>
    `;

    document.body.append(boton, panel);
    const badge = boton.querySelector("#wz-soporte-badge");
    const cuerpo = panel.querySelector("#wz-sop-cuerpo");

    boton.addEventListener("click", () => {
        const abrir = !panel.classList.contains("abierto");
        panel.classList.toggle("abierto", abrir);
        if (abrir) {
            // Si hay respuestas nuevas, abrir directo en "Mis mensajes"
            mostrarPestana(contarNoLeidos() > 0 ? "mis" : pestanaActual);
        }
    });
    panel.querySelector(".wz-sop-cerrar").addEventListener("click", () => panel.classList.remove("abierto"));
    panel.querySelector(".wz-sop-tabs").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-tab]");
        if (b) mostrarPestana(b.dataset.tab);
    });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") panel.classList.remove("abierto"); });

    function mostrarPestana(tab) {
        pestanaActual = tab;
        panel.querySelectorAll(".wz-sop-tabs button").forEach(b => b.classList.toggle("activo", b.dataset.tab === tab));
        if (tab === "nuevo") pintarFormulario(); else pintarMisMensajes();
    }

    // ---------- Formulario ----------
    function pintarFormulario() {
        const nombre = usuario ? (usuario.displayName || "") : "";
        cuerpo.innerHTML = `
            <p class="wz-sop-saludo">Hola${nombre ? ", " + esc(nombre.split(" ")[0]) : ""} 👋 <br>¿Qué tipo de problema tienes o con qué te podemos ayudar?</p>
            <form id="wz-sop-form" novalidate>
                ${usuario ? "" : `
                <div class="wz-sop-campo"><label for="wz-sop-nombre">Tu nombre</label><input id="wz-sop-nombre" maxlength="60" placeholder="Nombre completo"></div>
                <div class="wz-sop-campo"><label for="wz-sop-correo">Tu correo</label><input id="wz-sop-correo" type="email" maxlength="80" placeholder="correo@ejemplo.com"></div>`}
                <div class="wz-sop-campo">
                    <label for="wz-sop-tipo">Tipo de problema</label>
                    <select id="wz-sop-tipo">
                        <option value="">-- Selecciona una opción --</option>
                        ${TIPOS.map(t => `<option>${t}</option>`).join("")}
                    </select>
                </div>
                <div class="wz-sop-campo">
                    <label for="wz-sop-mensaje">Cuéntanos en qué te ayudamos</label>
                    <textarea id="wz-sop-mensaje" rows="4" maxlength="1200" placeholder="Describe tu solicitud..."></textarea>
                </div>
                <button type="submit" class="wz-sop-enviar" id="wz-sop-enviar"><i class="fa-solid fa-paper-plane"></i> Enviar</button>
                ${usuario ? "" : '<p class="wz-sop-esperando" style="margin-top:10px;">Si inicias sesión podrás ver la respuesta desde cualquier dispositivo.</p>'}
            </form>
        `;
        cuerpo.querySelector("#wz-sop-form").addEventListener("submit", enviarSolicitud);
    }

    async function enviarSolicitud(e) {
        e.preventDefault();
        const tipo = cuerpo.querySelector("#wz-sop-tipo").value;
        const mensaje = cuerpo.querySelector("#wz-sop-mensaje").value.trim();
        const nombre = usuario ? (usuario.displayName || usuario.email || "Cliente") : cuerpo.querySelector("#wz-sop-nombre").value.trim();
        const correo = usuario ? (usuario.email || "") : cuerpo.querySelector("#wz-sop-correo").value.trim();

        if (!usuario && nombre.length < 3) return avisar("Escribe tu nombre.", "aviso");
        if (!usuario && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) return avisar("Escribe un correo válido.", "aviso");
        if (!tipo) return avisar("Selecciona el tipo de problema.", "aviso");
        if (mensaje.length < 10) return avisar("Describe tu solicitud con al menos 10 caracteres.", "aviso");

        const btn = cuerpo.querySelector("#wz-sop-enviar");
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Enviando...';
        try {
            let nombreCliente = nombre;
            if (usuario) {
                try {
                    const snap = await getDoc(doc(db, "clientes", usuario.uid));
                    if (snap.exists()) nombreCliente = snap.data().nombre || snap.data().nombreCompleto || nombreCliente;
                } catch { /* se usa el nombre de la sesión */ }
            }
            const folio = "T-" + Math.floor(100000 + Math.random() * 900000);
            const ref = await addDoc(collection(db, "tickets_atencion"), {
                folio_ticket: folio,
                cliente_id: usuario ? usuario.uid : null,
                cliente_nombre: nombreCliente,
                cliente_correo: correo,
                asunto: tipo,
                mensaje,
                estado: "Abierto",
                respuesta: "",
                visto_cliente: false,
                origen: "boton_soporte",
                pagina: location.pathname.split("/").pop() || "index.html",
                fecha: serverTimestamp()
            });

            if (!usuario) {
                // Invitado: se recuerda el ticket en este navegador para mostrar la respuesta
                const ids = leerIdsInvitado();
                ids.push(ref.id);
                localStorage.setItem(CLAVE_INVITADO, JSON.stringify(ids.slice(-20)));
                await cargarTicketsInvitado();
            }

            avisar(`¡Mensaje enviado! Tu folio es ${folio}. Te avisaremos aquí cuando respondamos.`, "exito");
            mostrarPestana("mis");
        } catch (error) {
            console.error("No se pudo enviar la solicitud de soporte:", error);
            avisar("No se pudo enviar tu mensaje. Intenta de nuevo.", "error");
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Enviar';
        }
    }

    // ---------- Mis mensajes ----------
    const tieneRespuestaNueva = (t) => Boolean(t.respuesta) && t.visto_cliente !== true;
    const contarNoLeidos = () => tickets.filter(tieneRespuestaNueva).length;

    function pintarMisMensajes() {
        if (tickets.length === 0) {
            cuerpo.innerHTML = '<p class="wz-sop-vacio"><i class="fa-regular fa-envelope-open"></i><br>Aún no has enviado mensajes.</p>';
            return;
        }
        cuerpo.innerHTML = tickets.map(t => {
            const estado = t.estado || "Abierto";
            const clase = estado.toLowerCase().replace(/\s+/g, "-");
            const nuevo = tieneRespuestaNueva(t);
            return `
                <div class="wz-sop-ticket ${nuevo ? "nuevo" : ""}">
                    <div class="wz-sop-ticket-cab">
                        <span><span class="wz-sop-folio">${esc(t.folio_ticket || "")}</span> · ${esc(t.asunto || "")}${nuevo ? '<span class="wz-sop-etiqueta-nueva">Nueva respuesta</span>' : ""}</span>
                        <span class="wz-sop-estado ${clase}">${esc(estado)}</span>
                    </div>
                    <span class="wz-sop-fecha">${formatoFecha(t.fecha)}</span>
                    <p class="wz-sop-msj">${esc(t.mensaje)}</p>
                    ${t.respuesta
                        ? `<div class="wz-sop-resp"><b><i class="fa-solid fa-hat-wizard"></i> Respuesta de soporte${t.respondido_por ? " · " + esc(t.respondido_por) : ""}</b>${esc(t.respuesta)}</div>`
                        : '<p class="wz-sop-esperando">Esperando respuesta del equipo de soporte…</p>'}
                </div>`;
        }).join("");
        marcarComoLeidos();
    }

    async function marcarComoLeidos() {
        const pendientes = tickets.filter(tieneRespuestaNueva);
        if (pendientes.length === 0) return;
        pendientes.forEach(t => { t.visto_cliente = true; });
        actualizarAviso();
        await Promise.all(pendientes.map(t =>
            updateDoc(doc(db, "tickets_atencion", t.id), { visto_cliente: true })
                .catch(err => console.error("No se pudo marcar el ticket como leído:", err))
        ));
    }

    function actualizarAviso() {
        const n = contarNoLeidos();
        badge.textContent = n;
        badge.style.display = n > 0 ? "flex" : "none";
        const punto = panel.querySelector("#wz-sop-punto");
        punto.textContent = n;
        punto.style.display = n > 0 ? "inline-block" : "none";
        boton.title = n > 0 ? `Soporte técnico: ${n} respuesta(s) nueva(s)` : "Soporte técnico";
    }

    function ordenar(lista) {
        return lista.sort((a, b) => (aFecha(b.fecha)?.getTime() || Date.now()) - (aFecha(a.fecha)?.getTime() || Date.now()));
    }

    function alCambiarTickets(lista) {
        const antes = contarNoLeidos();
        tickets = ordenar(lista);
        const ahora = contarNoLeidos();
        actualizarAviso();
        if (ahora > antes && !panel.classList.contains("abierto")) {
            avisar("💬 Soporte técnico respondió tu mensaje. Toca el botón de soporte para verlo.", "info");
        }
        if (panel.classList.contains("abierto") && pestanaActual === "mis") pintarMisMensajes();
    }

    // ---------- Invitados (sin sesión) ----------
    function leerIdsInvitado() {
        try { return JSON.parse(localStorage.getItem(CLAVE_INVITADO)) || []; } catch { return []; }
    }

    async function cargarTicketsInvitado() {
        const ids = leerIdsInvitado();
        const lista = [];
        await Promise.all(ids.map(async id => {
            try {
                const snap = await getDoc(doc(db, "tickets_atencion", id));
                if (snap.exists()) lista.push({ id: snap.id, ...snap.data() });
            } catch (err) { console.error("No se pudo leer el ticket:", err); }
        }));
        alCambiarTickets(lista);
    }

    // ---------- Sesión ----------
    onAuthStateChanged(auth, (user) => {
        usuario = user;
        if (cancelarEscucha) { cancelarEscucha(); cancelarEscucha = null; }

        if (user) {
            // En tiempo real: si soporte responde mientras navega, el aviso aparece al momento
            const q = query(collection(db, "tickets_atencion"), where("cliente_id", "==", user.uid));
            cancelarEscucha = onSnapshot(q,
                (snap) => alCambiarTickets(snap.docs.map(d => ({ id: d.id, ...d.data() }))),
                (err) => console.error("No se pudieron escuchar tus mensajes de soporte:", err));
        } else {
            cargarTicketsInvitado();
        }
        if (panel.classList.contains("abierto")) mostrarPestana(pestanaActual);
    });

    pintarFormulario();
}
