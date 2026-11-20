// ============================================================
//  WIZARDLY — factura-pdf.js
//  Genera y DESCARGA en PDF el comprobante de compra o la factura
//  de un pedido (usa jsPDF + jsPDF-AutoTable, se cargan al usarse).
//
//  Uso:  await WizardlyPDF.descargar(pedido)
//    - Si pedido.factura.solicitada === true → "FACTURA" con datos fiscales.
//    - Si no → "COMPROBANTE DE COMPRA".
// ============================================================

(function () {
    const LIBRERIAS = [
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"
    ];
    let cargando = null;

    function cargarScript(src) {
        return new Promise((resolve, reject) => {
            if (document.querySelector(`script[src="${src}"]`)) return resolve();
            const s = document.createElement("script");
            s.src = src;
            s.onload = resolve;
            s.onerror = () => reject(new Error("No se pudo cargar " + src));
            document.head.appendChild(s);
        });
    }

    function cargarLibrerias() {
        if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve();
        if (!cargando) {
            // Orden importante: primero jsPDF y luego el plugin de tablas
            cargando = cargarScript(LIBRERIAS[0]).then(() => cargarScript(LIBRERIAS[1]))
                .catch(err => { cargando = null; throw err; });
        }
        return cargando;
    }

    // Logo de la tienda como imagen para el PDF (si no carga, se omite)
    function cargarLogo() {
        return new Promise((resolve) => {
            const img = new Image();
            const enPages = location.pathname.includes("/pages/");
            img.src = (enPages ? "../" : "") + "images/logo/Logo.png";
            img.onload = () => {
                try {
                    const c = document.createElement("canvas");
                    c.width = img.naturalWidth; c.height = img.naturalHeight;
                    c.getContext("2d").drawImage(img, 0, 0);
                    resolve(c.toDataURL("image/png"));
                } catch { resolve(null); }
            };
            img.onerror = () => resolve(null);
        });
    }

    const mxn = (n) => "$" + (Number(n) || 0).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " MXN";
    const aFecha = (v) => {
        if (!v) return null;
        if (typeof v.toDate === "function") return v.toDate();
        if (v instanceof Date) return v;
        const f = new Date(v);
        return isNaN(f) ? null : f;
    };
    // Quita etiquetas HTML (la dirección se guarda con <br>)
    const textoPlano = (html) => String(html || "").replace(/<br\s*\/?>/gi, ", ").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").replace(/^,\s*|,\s*$/g, "").trim();
    const METODOS = { tarjeta: "Tarjeta de crédito / débito", transferencia: "Transferencia bancaria", wallet: "Monedero Wallet Arcana", efectivo: "Efectivo" };

    function direccionDe(pedido) {
        const d = pedido.direccionObjeto || {};
        const partes = [d.calle, d.ciudad, d.estado, d.codigoPostal ? "C.P. " + d.codigoPostal : ""].filter(Boolean);
        return partes.length ? partes.join(", ") : textoPlano(pedido.direccion) || "No especificada";
    }

    async function descargar(pedido, opciones = {}) {
        if (!pedido) throw new Error("No hay pedido para generar el PDF");
        await cargarLibrerias();
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({ unit: "mm", format: "letter" });
        const ancho = pdf.internal.pageSize.getWidth();
        const alto = pdf.internal.pageSize.getHeight();
        const margen = 16;
        const factura = pedido.factura && pedido.factura.solicitada ? pedido.factura : null;
        const fecha = aFecha(opciones.fecha) || aFecha(pedido.fecha) || new Date();
        const MORADO = [45, 27, 78], DORADO = [190, 150, 40], GRIS = [90, 90, 90];

        // ---------- Encabezado ----------
        pdf.setFillColor(...MORADO);
        pdf.rect(0, 0, ancho, 34, "F");
        const logo = await cargarLogo();
        if (logo) {
            try { pdf.addImage(logo, "PNG", margen, 6, 22, 22); } catch { /* imagen no compatible */ }
        }
        pdf.setTextColor(246, 213, 122);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(22);
        pdf.text("WIZARDLY", logo ? margen + 27 : margen, 17);
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(235, 225, 245);
        pdf.text("Mercado Arcano · Tienda en línea", logo ? margen + 27 : margen, 24);

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.setTextColor(255, 255, 255);
        pdf.text(factura ? "FACTURA" : "COMPROBANTE DE COMPRA", ancho - margen, 15, { align: "right" });
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(10);
        pdf.text(`Folio: ${pedido.folio || "—"}`, ancho - margen, 22, { align: "right" });
        pdf.text(fecha.toLocaleString("es-MX", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }), ancho - margen, 28, { align: "right" });

        // ---------- Datos del emisor y del cliente ----------
        let y = 44;
        const columna = (titulo, lineas, x) => {
            pdf.setFont("helvetica", "bold");
            pdf.setFontSize(10);
            pdf.setTextColor(...DORADO);
            pdf.text(titulo, x, y);
            pdf.setFont("helvetica", "normal");
            pdf.setFontSize(9);
            pdf.setTextColor(40, 40, 40);
            let yy = y + 5;
            lineas.filter(Boolean).forEach(l => {
                const partido = pdf.splitTextToSize(String(l), (ancho - margen * 2) / 2 - 6);
                pdf.text(partido, x, yy);
                yy += partido.length * 4.5;
            });
            return yy;
        };

        const emisor = [
            "Wizardly Mercado Arcano S.A. de C.V.",
            "RFC: WMA260101AB1",
            "Régimen: 601 - General de Ley Personas Morales",
            "Aguascalientes, Ags., México",
            "contacto@wizardly.com"
        ];
        const cliente = factura
            ? [
                factura.razonSocial,
                `RFC: ${factura.rfc || "—"}`,
                factura.regimenFiscal ? `Régimen fiscal: ${factura.regimenFiscal}` : "",
                factura.usoCFDI ? `Uso CFDI: ${factura.usoCFDI}` : "",
                factura.codigoPostal ? `C.P. fiscal: ${factura.codigoPostal}` : "",
                factura.correoElectronico || pedido.correo || ""
            ]
            : [pedido.cliente || "Cliente Wizardly", pedido.correo || "", `Envío: ${direccionDe(pedido)}`];

        const finEmisor = columna("EMISOR", emisor, margen);
        const finCliente = columna(factura ? "RECEPTOR" : "CLIENTE", cliente, ancho / 2 + 2);
        y = Math.max(finEmisor, finCliente) + 4;

        // Datos del pedido
        pdf.setDrawColor(220, 210, 235);
        pdf.setFillColor(248, 245, 252);
        pdf.roundedRect(margen, y, ancho - margen * 2, 14, 2, 2, "FD");
        pdf.setFontSize(9);
        pdf.setTextColor(...GRIS);
        pdf.text(`Método de pago: ${METODOS[pedido.metodoPago] || pedido.metodoPago || "—"}`, margen + 4, y + 6);
        pdf.text(`Estado del envío: ${pedido.estado_seguimiento || "Pendiente"}`, margen + 4, y + 11);
        if (factura) {
            pdf.text(`Forma de pago SAT: ${pedido.metodoPago === "transferencia" ? "03 Transferencia" : pedido.metodoPago === "wallet" ? "05 Monedero electrónico" : "04 Tarjeta de crédito"}`, ancho / 2 + 2, y + 6);
            pdf.text("Método SAT: PUE - Pago en una sola exhibición", ancho / 2 + 2, y + 11);
        } else {
            pdf.text(`Envío a: ${pedido.cliente || ""}`, ancho / 2 + 2, y + 6);
        }
        y += 20;

        // ---------- Tabla de productos ----------
        const filas = (Array.isArray(pedido.productos) ? pedido.productos : []).map(p => {
            const cant = Number(p.cantidad) || 1;
            const precio = Number(p.precio ?? p.precio_unitario) || 0;
            return [p.nombre || "Artefacto", String(cant), mxn(precio), mxn(precio * cant)];
        });
        pdf.autoTable({
            startY: y,
            head: [["Producto", "Cant.", "Precio unitario", "Importe"]],
            body: filas.length ? filas : [["Sin productos registrados", "", "", ""]],
            theme: "grid",
            margin: { left: margen, right: margen },
            styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5, textColor: [40, 40, 40], lineColor: [225, 220, 235] },
            headStyles: { fillColor: MORADO, textColor: [246, 213, 122], fontStyle: "bold" },
            alternateRowStyles: { fillColor: [250, 248, 253] },
            columnStyles: { 1: { halign: "center", cellWidth: 18 }, 2: { halign: "right", cellWidth: 38 }, 3: { halign: "right", cellWidth: 38 } }
        });
        y = pdf.lastAutoTable.finalY + 6;

        // ---------- Totales ----------
        const totales = [["Subtotal", mxn(pedido.subtotal)]];
        if (Number(pedido.descuento) > 0) totales.push([`Descuento${pedido.cupon ? " (" + pedido.cupon + ")" : ""}`, "-" + mxn(pedido.descuento)]);
        const impuestos = Array.isArray(pedido.impuestos_detalle) && pedido.impuestos_detalle.length
            ? pedido.impuestos_detalle.map(t => [`${t.nombre} (${t.porcentaje}%)`, mxn(t.monto)])
            : [["Impuestos", mxn(pedido.impuesto)]];
        totales.push(...impuestos);

        if (y > alto - 60) { pdf.addPage(); y = 20; }
        const xEtiqueta = ancho - margen - 80;
        pdf.setFontSize(10);
        totales.forEach(([etiqueta, valor]) => {
            pdf.setTextColor(...GRIS);
            pdf.text(etiqueta, xEtiqueta, y);
            pdf.setTextColor(40, 40, 40);
            pdf.text(valor, ancho - margen, y, { align: "right" });
            y += 6;
        });
        pdf.setDrawColor(...DORADO);
        pdf.setLineWidth(0.6);
        pdf.line(xEtiqueta, y - 2, ancho - margen, y - 2);
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(13);
        pdf.setTextColor(...MORADO);
        pdf.text("TOTAL", xEtiqueta, y + 5);
        pdf.text(mxn(pedido.total), ancho - margen, y + 5, { align: "right" });
        y += 16;

        // ---------- Pie ----------
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(130, 130, 130);
        const leyenda = factura
            ? "Documento generado con fines académicos (proyecto escolar). Representación impresa de un CFDI simulado: no tiene validez fiscal ante el SAT."
            : "Gracias por tu compra en Wizardly. Conserva este comprobante y tu número de folio para rastrear tu pedido en la sección «Rastrear pedido».";
        pdf.text(pdf.splitTextToSize(leyenda, ancho - margen * 2), margen, alto - 18);
        pdf.text(`Generado el ${new Date().toLocaleString("es-MX")}`, margen, alto - 9);
        pdf.text("wizardly · Mercado Arcano", ancho - margen, alto - 9, { align: "right" });

        const nombre = `${factura ? "Factura" : "Comprobante"}_${pedido.folio || "Wizardly"}.pdf`;
        pdf.save(nombre);
        return nombre;
    }

    // Catálogos del SAT más comunes (para los formularios de factura)
    const REGIMENES = [
        "601 - General de Ley Personas Morales",
        "603 - Personas Morales con Fines no Lucrativos",
        "605 - Sueldos y Salarios e Ingresos Asimilados a Salarios",
        "606 - Arrendamiento",
        "612 - Personas Físicas con Actividades Empresariales y Profesionales",
        "616 - Sin obligaciones fiscales",
        "621 - Incorporación Fiscal",
        "625 - Actividades Empresariales con ingresos a través de Plataformas Tecnológicas",
        "626 - Régimen Simplificado de Confianza"
    ];
    const USOS_CFDI = [
        "G01 - Adquisición de mercancías",
        "G03 - Gastos en general",
        "I08 - Otra maquinaria y equipo",
        "D10 - Pagos por servicios educativos (colegiaturas)",
        "S01 - Sin efectos fiscales",
        "CP01 - Pagos"
    ];
    // RFC: 3 letras (moral) o 4 (física) + fecha AAMMDD + homoclave de 3
    const RFC_VALIDO = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

    window.WizardlyPDF = { descargar, precargar: () => cargarLibrerias().catch(() => {}), REGIMENES, USOS_CFDI, RFC_VALIDO };
})();
