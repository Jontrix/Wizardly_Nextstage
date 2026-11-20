// ============================================================
//  WIZARDLY — carrito-firestore.js  (Módulo 4.1.3)
//  Persistencia del carrito en Firestore para clientes con sesión.
//
//  Modelo:
//    carrito/{uid}                     → { cliente_id, estado, total_articulos, fecha_actualizacion }
//    carrito_detalle/{uid}_{productoId} → { carrito_id, producto_id, nombre, cantidad, precio_unitario, imagen, categoria }
//
//  El carrito sigue funcionando en localStorage (rápido y para invitados);
//  este módulo lo sincroniza con la base de datos cuando hay sesión iniciada,
//  y al iniciar sesión recupera lo que el cliente dejó guardado.
//  carrito.js carga este archivo automáticamente.
// ============================================================

import { auth, db } from "./firebase-config.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";
import {
    collection, doc, getDoc, getDocs, query, where, writeBatch, serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

const CLAVE_LOCAL = "wizardly_carrito";
let uidActual = null;
let sincronizando = false;
let temporizador = null;

const leerLocal = () => {
    try { return JSON.parse(localStorage.getItem(CLAVE_LOCAL)) || []; } catch { return []; }
};

const idDetalle = (uid, productoId) => `${uid}_${String(productoId).replace(/\//g, "_")}`;

async function leerRemoto(uid) {
    const snap = await getDocs(query(collection(db, "carrito_detalle"), where("carrito_id", "==", uid)));
    return snap.docs.map(d => ({ idDoc: d.id, ...d.data() }));
}

// Escribe en Firestore el estado actual del carrito local
async function subirCarrito() {
    if (!uidActual || sincronizando) return;
    sincronizando = true;
    try {
        const local = leerLocal();
        const remotos = await leerRemoto(uidActual);
        const batch = writeBatch(db);

        const idsLocales = new Set(local.map(p => idDetalle(uidActual, p.id)));
        remotos.forEach(r => {
            if (!idsLocales.has(r.idDoc)) batch.delete(doc(db, "carrito_detalle", r.idDoc));
        });

        local.forEach(p => {
            batch.set(doc(db, "carrito_detalle", idDetalle(uidActual, p.id)), {
                carrito_id: uidActual,
                producto_id: String(p.id),
                nombre: p.nombre || "",
                cantidad: Number(p.cantidad) || 1,
                precio_unitario: Number(p.precio) || 0,
                imagen: p.imagen || "",
                categoria: p.categoria || ""
            });
        });

        batch.set(doc(db, "carrito", uidActual), {
            cliente_id: uidActual,
            estado: local.length > 0 ? "activo" : "vacio",
            total_articulos: local.reduce((s, p) => s + (Number(p.cantidad) || 0), 0),
            fecha_actualizacion: serverTimestamp()
        }, { merge: true });

        await batch.commit();
    } catch (error) {
        console.error("No se pudo sincronizar el carrito con Firestore:", error);
    } finally {
        sincronizando = false;
    }
}

// Agrupa cambios seguidos (por ejemplo, varios clics en "+") en una sola escritura
function programarSubida() {
    clearTimeout(temporizador);
    temporizador = setTimeout(subirCarrito, 600);
}

// Al iniciar sesión: une lo guardado en la nube con lo que haya en este navegador
async function recuperarCarrito(uid) {
    try {
        const remotos = await leerRemoto(uid);
        const local = leerLocal();
        const porId = new Map(local.map(p => [String(p.id), p]));

        remotos.forEach(r => {
            const id = String(r.producto_id);
            if (!porId.has(id)) {
                porId.set(id, {
                    id,
                    nombre: r.nombre,
                    precio: Number(r.precio_unitario) || 0,
                    cantidad: Number(r.cantidad) || 1,
                    imagen: r.imagen || "../images/logo/Logo.png",
                    categoria: r.categoria || ""
                });
            }
        });

        const unido = [...porId.values()];
        const cambio = unido.length !== local.length;
        if (cambio) {
            localStorage.setItem(CLAVE_LOCAL, JSON.stringify(unido));
            if (typeof actualizarContador === "function") actualizarContador();
            if (typeof renderCarrito === "function" && document.getElementById("carrito-lista")) renderCarrito();
        }
        await refrescarExistencias();
        // Deja la nube igual que el carrito unido
        await subirCarrito();
    } catch (error) {
        console.error("No se pudo recuperar el carrito guardado:", error);
    }
}

// ============================================================
//  PROMOCIONES (Módulo 4.1.4): se cargan para validar cupones
//  creados desde el panel admin-promociones.
// ============================================================
async function cargarPromocionesNube() {
    try {
        const snap = await getDocs(collection(db, "promociones"));
        window.PROMOCIONES_NUBE = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        document.dispatchEvent(new CustomEvent("promocionesCargadas", { detail: window.PROMOCIONES_NUBE }));
        if (typeof renderCarrito === "function" && document.getElementById("carrito-lista")) renderCarrito();
    } catch (error) {
        console.error("No se pudieron cargar las promociones:", error);
        window.PROMOCIONES_NUBE = [];
    }
}
cargarPromocionesNube();

// ============================================================
//  EXISTENCIAS ACTUALIZADAS: al abrir cualquier página se revisa el
//  stock real de lo que hay en el carrito y se ajusta si ya no alcanza.
// ============================================================
async function refrescarExistencias() {
    const carrito = leerLocal();
    if (carrito.length === 0) return;
    let cambio = false;
    const avisos = [];
    await Promise.all(carrito.map(async (item) => {
        try {
            const snap = await getDoc(doc(db, "productos", String(item.id)));
            if (!snap.exists()) return; // p. ej. la subasta de la Pluma de Fénix
            const disponible = Math.max(0, parseInt(snap.data().existencia ?? snap.data().stock, 10) || 0);
            if (item.existencia !== disponible) { item.existencia = disponible; cambio = true; }
            if ((Number(item.cantidad) || 0) > disponible) {
                avisos.push(disponible > 0
                    ? `${item.nombre}: solo quedan ${disponible} pieza(s), ajustamos tu carrito.`
                    : `${item.nombre} se agotó y se quitó de tu carrito.`);
                item.cantidad = disponible;
                cambio = true;
            }
        } catch (error) {
            console.error("No se pudo revisar la existencia de", item.nombre, error);
        }
    }));
    if (!cambio) return;
    const ajustado = carrito.filter(p => (Number(p.cantidad) || 0) > 0);
    localStorage.setItem(CLAVE_LOCAL, JSON.stringify(ajustado));
    if (typeof actualizarContador === "function") actualizarContador();
    if (typeof renderCarrito === "function" && document.getElementById("carrito-lista")) renderCarrito();
    avisos.forEach(m => window.mostrarNotificacion ? window.mostrarNotificacion(m, "aviso", 6000) : console.warn(m));
    if (uidActual) programarSubida();
}
refrescarExistencias();

onAuthStateChanged(auth, (user) => {
    uidActual = user ? user.uid : null;
    if (uidActual) recuperarCarrito(uidActual);
});

// carrito.js emite este evento cada vez que se guarda o vacía el carrito
document.addEventListener("carritoActualizado", () => {
    if (uidActual) programarSubida();
});

// Si la página se cierra con cambios pendientes, intenta subirlos
window.addEventListener("pagehide", () => {
    if (temporizador && uidActual) {
        clearTimeout(temporizador);
        subirCarrito();
    }
});

// Exponer para pruebas desde la consola
window.wizardlyCarritoNube = { subirCarrito, recuperarCarrito: () => uidActual && recuperarCarrito(uidActual) };
