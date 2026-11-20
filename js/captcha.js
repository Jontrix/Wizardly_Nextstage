// ============================================================
//  WIZARDLY — captcha.js
//  Captcha de imagen propio (sin claves externas): dibuja un código
//  distorsionado en un <canvas> que el usuario debe escribir.
//
//  Uso:
//    const captcha = WizardlyCaptcha.crear("id-del-contenedor");
//    if (!captcha.validar()) { ...mostrar error...; return; }
// ============================================================

(function () {
    // Sin caracteres que se confunden (0/O, 1/I/l)
    const CARACTERES = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const LONGITUD = 5;

    function inyectarEstilos() {
        if (document.getElementById("wz-captcha-estilos")) return;
        const estilo = document.createElement("style");
        estilo.id = "wz-captcha-estilos";
        estilo.textContent = `
            .wz-captcha { margin: 4px 0 18px; text-align: left; }
            .wz-captcha-etiqueta { display: block; font-family: 'Lato', sans-serif; font-size: 0.85rem; color: rgba(240,230,210,0.75); margin-bottom: 8px; }
            .wz-captcha-fila { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
            .wz-captcha canvas { border-radius: 10px; border: 1px solid rgba(212,175,55,0.45); background: #1a1325; user-select: none; }
            .wz-captcha-refrescar {
                width: 42px; height: 42px; border-radius: 50%; cursor: pointer; flex-shrink: 0;
                border: 1px solid rgba(212,175,55,0.45); background: rgba(212,175,55,0.08); color: #d4af37; font-size: 1rem;
            }
            .wz-captcha-refrescar:hover { background: rgba(212,175,55,0.2); }
            .wz-captcha input {
                width: 100%; box-sizing: border-box; padding: 13px 14px; border-radius: 12px;
                border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: #fff;
                font-family: 'Lato', sans-serif; font-size: 1rem; letter-spacing: 3px; text-transform: uppercase; outline: none;
            }
            .wz-captcha input:focus { border-color: #d4af37; }
            .wz-captcha.error input { border-color: #f87171; animation: wzSacudir 0.35s; }
            @keyframes wzSacudir { 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
        `;
        document.head.appendChild(estilo);
    }

    const aleatorio = (min, max) => Math.random() * (max - min) + min;

    function generarCodigo() {
        let codigo = "";
        const valores = new Uint32Array(LONGITUD);
        (window.crypto || window.msCrypto).getRandomValues(valores);
        for (let i = 0; i < LONGITUD; i++) codigo += CARACTERES[valores[i] % CARACTERES.length];
        return codigo;
    }

    function dibujar(canvas, codigo) {
        const ctx = canvas.getContext("2d");
        const { width: w, height: h } = canvas;

        // Fondo con degradado
        const fondo = ctx.createLinearGradient(0, 0, w, h);
        fondo.addColorStop(0, "#1a1325");
        fondo.addColorStop(1, "#2d1b4e");
        ctx.fillStyle = fondo;
        ctx.fillRect(0, 0, w, h);

        // Ruido: puntos
        for (let i = 0; i < 70; i++) {
            ctx.fillStyle = `rgba(${Math.floor(aleatorio(150, 255))}, ${Math.floor(aleatorio(120, 220))}, ${Math.floor(aleatorio(60, 255))}, ${aleatorio(0.2, 0.6)})`;
            ctx.beginPath();
            ctx.arc(aleatorio(0, w), aleatorio(0, h), aleatorio(0.5, 1.8), 0, Math.PI * 2);
            ctx.fill();
        }

        // Letras con rotación, tamaño y color variables
        const paso = w / (codigo.length + 1);
        for (let i = 0; i < codigo.length; i++) {
            ctx.save();
            ctx.translate(paso * (i + 0.8), h / 2 + aleatorio(-5, 5));
            ctx.rotate(aleatorio(-0.45, 0.45));
            ctx.font = `bold ${Math.floor(aleatorio(24, 31))}px Georgia, 'Times New Roman', serif`;
            ctx.fillStyle = ["#f6d57a", "#d4af37", "#e9d5ff", "#c084fc", "#fde68a"][Math.floor(aleatorio(0, 5))];
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 2;
            ctx.textBaseline = "middle";
            ctx.fillText(codigo[i], 0, 0);
            ctx.restore();
        }

        // Ruido: líneas curvas encima del texto
        for (let i = 0; i < 4; i++) {
            ctx.strokeStyle = `rgba(212, 175, 55, ${aleatorio(0.25, 0.55)})`;
            ctx.lineWidth = aleatorio(1, 2);
            ctx.beginPath();
            ctx.moveTo(aleatorio(0, w * 0.2), aleatorio(0, h));
            ctx.bezierCurveTo(aleatorio(0, w), aleatorio(0, h), aleatorio(0, w), aleatorio(0, h), aleatorio(w * 0.8, w), aleatorio(0, h));
            ctx.stroke();
        }
    }

    function crear(idContenedor) {
        inyectarEstilos();
        const contenedor = document.getElementById(idContenedor);
        if (!contenedor) throw new Error("No existe el contenedor del captcha: " + idContenedor);

        contenedor.classList.add("wz-captcha");
        contenedor.innerHTML = `
            <span class="wz-captcha-etiqueta"><i class="fa-solid fa-shield-halved"></i> Verificación: escribe los caracteres de la imagen</span>
            <div class="wz-captcha-fila">
                <canvas width="190" height="56" aria-label="Código de verificación" role="img"></canvas>
                <button type="button" class="wz-captcha-refrescar" title="Generar otro código" aria-label="Generar otro código"><i class="fa-solid fa-rotate-right"></i></button>
            </div>
            <input type="text" maxlength="${LONGITUD}" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="Código de verificación" aria-label="Escribe el código de verificación">
        `;

        const canvas = contenedor.querySelector("canvas");
        const input = contenedor.querySelector("input");
        let codigo = "";

        function refrescar() {
            codigo = generarCodigo();
            dibujar(canvas, codigo);
            input.value = "";
        }

        contenedor.querySelector(".wz-captcha-refrescar").addEventListener("click", () => {
            refrescar();
            input.focus();
        });
        input.addEventListener("input", () => contenedor.classList.remove("error"));

        refrescar();

        return {
            // true si el texto coincide (sin importar mayúsculas). Si falla, cambia el código.
            validar() {
                const correcto = input.value.trim().toUpperCase() === codigo;
                if (!correcto) {
                    contenedor.classList.add("error");
                    refrescar();
                    input.focus();
                }
                return correcto;
            },
            refrescar,
            estaVacio: () => input.value.trim() === ""
        };
    }

    window.WizardlyCaptcha = { crear };
})();
