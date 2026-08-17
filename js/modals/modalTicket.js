// js/modals/modalTicket.js - Modal para generar comprobante visual en foto con soporte multi-idioma (ES, EN, FR) y compartir en WhatsApp
import { state, calcularConsumoCliente, calcularPagosCliente, calcularMontoRestanteCliente, contarPedidosCliente } from '../state.js';
import { showToast } from '../toast.js';

export const i18nTickets = {
    es: {
        title: "Estado de Cuenta",
        period: "Período Activo",
        client: "Cliente",
        itemAnterior: "1. Saldo pendiente anterior:",
        itemPedidos: "2. Pedidos del período:",
        itemConsumo: "3. Consumo acumulado actual:",
        itemPagos: "4. Abonos / Pagos recibidos:",
        itemRestante: "Total Restante a Pagar",
        thanks: "¡Gracias por su preferencia! ✨",
        ordersUnit: "pedidos",
        itemsUnit: "arts",
        btnShare: "Compartir Foto en WhatsApp",
        msgGreeting: "Hola",
        msgSummary: "Aquí tienes el resumen de tu cuenta en *StoreFlow*",
        msgDetail: "Detalle Contable:",
        msgTotal: "Total Restante a Pagar:"
    },
    en: {
        title: "Account Statement",
        period: "Active Cycle",
        client: "Customer",
        itemAnterior: "1. Previous balance due:",
        itemPedidos: "2. Orders in this cycle:",
        itemConsumo: "3. Current cycle purchases:",
        itemPagos: "4. Payments / Deposits received:",
        itemRestante: "Total Balance Due",
        thanks: "Thank you for your business! ✨",
        ordersUnit: "orders",
        itemsUnit: "items",
        btnShare: "Share Receipt on WhatsApp",
        msgGreeting: "Hello",
        msgSummary: "Here is your account statement from *StoreFlow*",
        msgDetail: "Accounting Summary:",
        msgTotal: "Total Balance Due:"
    },
    fr: {
        title: "Relevé de Compte",
        period: "Période Active",
        client: "Client",
        itemAnterior: "1. Solde antérieur restant :",
        itemPedidos: "2. Commandes de la période :",
        itemConsumo: "3. Consommation actuelle :",
        itemPagos: "4. Acomptes / Paiements reçus :",
        itemRestante: "Total Restant à Payer",
        thanks: "Merci de votre confiance ! ✨",
        ordersUnit: "commandes",
        itemsUnit: "articles",
        btnShare: "Partager Reçu sur WhatsApp",
        msgGreeting: "Bonjour",
        msgSummary: "Voici le relevé de votre compte chez *StoreFlow*",
        msgDetail: "Détail Comptable :",
        msgTotal: "Total Restant à Payer :"
    }
};

let selectedTicketClienteId = null;
let idiomaTicketActual = 'es';

export function initModalTicket() {
    if (document.getElementById('modal-compartir-ticket')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-compartir-ticket';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-m3-outlineVariant/30 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <!-- Header Modal -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2 text-[#25D366]">
                    <i data-lucide="image" class="w-5 h-5"></i>
                    <h3 class="text-base font-bold text-m3-onSurface">Ticket de Estado de Cuenta</h3>
                </div>
                <button type="button" id="btn-cerrar-ticket-icon" class="w-8 h-8 rounded-full bg-m3-surface flex items-center justify-center text-m3-outline hover:bg-m3-surfaceVariant transition cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Selector de Idiomas -->
            <div class="space-y-1.5">
                <label class="block text-[11px] font-bold text-m3-onSurfaceVariant">Selecciona el idioma del ticket:</label>
                <div class="grid grid-cols-3 gap-1.5 p-1 bg-m3-surface rounded-2xl border border-m3-outlineVariant/30">
                    <button type="button" id="lang-btn-es" class="py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 bg-white text-m3-primary shadow-xs cursor-pointer">
                        <span>🇪🇸</span>
                        <span>Español</span>
                    </button>
                    <button type="button" id="lang-btn-en" class="py-2 rounded-xl text-xs font-medium text-m3-outline transition flex items-center justify-center space-x-1 hover:text-m3-onSurface cursor-pointer">
                        <span>🇬🇧</span>
                        <span>English</span>
                    </button>
                    <button type="button" id="lang-btn-fr" class="py-2 rounded-xl text-xs font-medium text-m3-outline transition flex items-center justify-center space-x-1 hover:text-m3-onSurface cursor-pointer">
                        <span>🇫🇷</span>
                        <span>Français</span>
                    </button>
                </div>
            </div>

            <!-- VISTA PREVIA DEL TICKET DIGITAL (Para renderizado a imagen/foto) -->
            <div class="p-1">
                <div id="ticket-visual-preview" class="bg-gradient-to-b from-[#FAF8FD] to-white border-2 border-dashed border-m3-primary/30 rounded-3xl p-5 shadow-sm space-y-3 font-sans text-m3-onSurface">
                    <!-- Cabecera del Ticket -->
                    <div class="text-center pb-2 border-b border-m3-outlineVariant/30 space-y-1">
                        <div class="inline-flex items-center justify-center w-9 h-9 rounded-2xl bg-m3-primary text-white shadow-xs mb-1">
                            <i data-lucide="store" class="w-5 h-5"></i>
                        </div>
                        <h4 id="ticket-nombre-tienda" class="font-black text-lg tracking-tight text-m3-onSurface">StoreFlow</h4>
                        <p id="ticket-lbl-title" class="text-xs font-bold text-m3-primary tracking-wider uppercase">Estado de Cuenta</p>
                        <p id="ticket-periodo-tag" class="text-[10px] text-m3-outline">Período Activo: #1</p>
                    </div>

                    <!-- Datos del Cliente -->
                    <div class="bg-white/80 border border-m3-outlineVariant/30 rounded-2xl p-3 flex justify-between items-center text-xs">
                        <div>
                            <p id="ticket-lbl-client" class="text-[10px] uppercase font-bold text-m3-outline">Cliente</p>
                            <h5 id="ticket-cliente-nombre" class="font-bold text-sm text-m3-onSurface">Cliente</h5>
                        </div>
                        <span id="ticket-cliente-num" class="px-2.5 py-1 rounded-xl bg-m3-primaryContainer text-m3-onPrimaryContainer font-black text-xs">
                            #1
                        </span>
                    </div>

                    <!-- Desglose de 5 Puntos Contables -->
                    <div class="space-y-1.5 text-xs">
                        <div class="flex justify-between items-center py-1 border-b border-m3-outlineVariant/15">
                            <span id="ticket-lbl-anterior" class="text-m3-onSurfaceVariant">1. Saldo pendiente anterior:</span>
                            <span id="ticket-val-anterior" class="font-bold text-m3-onSurface">$0.00</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-m3-outlineVariant/15">
                            <span id="ticket-lbl-pedidos" class="text-m3-onSurfaceVariant">2. Pedidos del período:</span>
                            <span id="ticket-val-pedidos" class="font-bold text-m3-primary bg-m3-primaryContainer/40 px-2 py-0.5 rounded-lg">0 pedidos</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-m3-outlineVariant/15">
                            <span id="ticket-lbl-consumo" class="text-m3-onSurfaceVariant">3. Consumo acumulado actual:</span>
                            <span id="ticket-val-consumo" class="font-bold text-m3-onSurface">$0.00</span>
                        </div>
                        <div class="flex justify-between items-center py-1 border-b border-m3-outlineVariant/15">
                            <span id="ticket-lbl-pagos" class="text-m3-onSurfaceVariant">4. Abonos / Pagos recibidos:</span>
                            <span id="ticket-val-pagos" class="font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-lg">-$0.00</span>
                        </div>
                    </div>

                    <!-- Total Restante a Pagar -->
                    <div class="bg-m3-surface border border-m3-outlineVariant/30 rounded-2xl p-3 text-center space-y-0.5">
                        <p id="ticket-lbl-restante" class="text-[11px] font-bold text-m3-outline tracking-wider uppercase">Total Restante a Pagar</p>
                        <p id="ticket-val-restante" class="text-2xl font-black text-m3-error">$0.00</p>
                    </div>

                    <!-- Pie del Ticket -->
                    <div class="text-center pt-1">
                        <p id="ticket-lbl-thanks" class="text-[11px] font-semibold text-m3-outline">¡Gracias por su preferencia! ✨</p>
                    </div>
                </div>
            </div>

            <!-- Botones de Acción para Enviar Imagen y Texto -->
            <div class="space-y-2 pt-1">
                <button type="button" id="btn-share-whatsapp-img" class="w-full py-3.5 px-4 rounded-2xl bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-md transition active:scale-95 cursor-pointer">
                    <i data-lucide="image" class="w-4 h-4"></i>
                    <span id="ticket-btn-share-txt">Enviar Foto por WhatsApp</span>
                </button>

                <button type="button" id="btn-share-whatsapp-txt" class="w-full py-2.5 px-4 rounded-2xl bg-m3-surface hover:bg-m3-surfaceVariant text-m3-onSurface text-xs font-bold flex items-center justify-center space-x-2 border border-m3-outlineVariant/40 transition active:scale-95 cursor-pointer">
                    <i data-lucide="message-square" class="w-4 h-4 text-[#25D366]"></i>
                    <span>Enviar Texto a WhatsApp</span>
                </button>
                
                <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="btn-descargar-ticket" class="py-2.5 px-3 rounded-xl bg-m3-surface hover:bg-m3-surfaceVariant text-m3-onSurface text-xs font-bold flex items-center justify-center space-x-1.5 border border-m3-outlineVariant/40 transition active:scale-95 cursor-pointer">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>Guardar Foto</span>
                    </button>
                    <button type="button" id="btn-copiar-ticket" class="py-2.5 px-3 rounded-xl bg-m3-surface hover:bg-m3-surfaceVariant text-m3-onSurface text-xs font-bold flex items-center justify-center space-x-1.5 border border-m3-outlineVariant/40 transition active:scale-95 cursor-pointer">
                        <i data-lucide="copy" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>Copiar Texto</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cerrar-ticket-icon').addEventListener('click', cerrarModalCompartirTicket);
    document.getElementById('lang-btn-es').addEventListener('click', () => cambiarIdiomaTicket('es'));
    document.getElementById('lang-btn-en').addEventListener('click', () => cambiarIdiomaTicket('en'));
    document.getElementById('lang-btn-fr').addEventListener('click', () => cambiarIdiomaTicket('fr'));
    document.getElementById('btn-share-whatsapp-img').addEventListener('click', ejecutarCompartirTicketFoto);
    document.getElementById('btn-share-whatsapp-txt').addEventListener('click', ejecutarEnviarTextoWhatsApp);
    document.getElementById('btn-descargar-ticket').addEventListener('click', descargarTicketImagen);
    document.getElementById('btn-copiar-ticket').addEventListener('click', copiarTextoTicket);
}

export function abrirModalCompartirTicket(clienteId) {
    selectedTicketClienteId = clienteId;
    idiomaTicketActual = 'es';
    actualizarBotonesIdiomaUI();
    renderizarTicketVisual();
    document.getElementById('modal-compartir-ticket').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function cerrarModalCompartirTicket() {
    const modal = document.getElementById('modal-compartir-ticket');
    if (modal) modal.classList.add('hidden');
}

export function cambiarIdiomaTicket(lang) {
    idiomaTicketActual = lang;
    actualizarBotonesIdiomaUI();
    renderizarTicketVisual();
}

function actualizarBotonesIdiomaUI() {
    ['es', 'en', 'fr'].forEach(lang => {
        const btn = document.getElementById(`lang-btn-${lang}`);
        if (btn) {
            if (lang === idiomaTicketActual) {
                btn.className = "py-2 rounded-xl text-xs font-bold transition flex items-center justify-center space-x-1 bg-white text-m3-primary shadow-xs ring-1 ring-m3-primary/30 cursor-pointer";
            } else {
                btn.className = "py-2 rounded-xl text-xs font-medium text-m3-outline transition flex items-center justify-center space-x-1 hover:text-m3-onSurface cursor-pointer";
            }
        }
    });
}

function renderizarTicketVisual() {
    const c = state.clientes.find(cli => cli.id === selectedTicketClienteId);
    if (!c) return;

    const t = i18nTickets[idiomaTicketActual] || i18nTickets.es;
    const index = state.clientes.findIndex(cli => cli.id === selectedTicketClienteId) + 1;
    const consumoPeriodo = calcularConsumoCliente(selectedTicketClienteId);
    const pagosPeriodo = calcularPagosCliente(selectedTicketClienteId);
    const montoRestante = calcularMontoRestanteCliente(selectedTicketClienteId);
    const { totalPedidos, totalArticulos } = contarPedidosCliente(selectedTicketClienteId);

    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-ES');

    const tiendaNombreEl = document.getElementById('ticket-nombre-tienda');
    if (tiendaNombreEl) {
        tiendaNombreEl.innerText = state.nombreTienda || "StoreFlow";
    }

    document.getElementById('ticket-lbl-title').innerText = t.title;
    document.getElementById('ticket-periodo-tag').innerText = `${t.period}: #${state.periodoActual} • ${fechaStr}`;
    document.getElementById('ticket-lbl-client').innerText = t.client;
    document.getElementById('ticket-cliente-nombre').innerText = c.nombre;
    document.getElementById('ticket-cliente-num').innerText = `#${index}`;

    document.getElementById('ticket-lbl-anterior').innerText = t.itemAnterior;
    document.getElementById('ticket-val-anterior').innerText = `$${c.deuda_anterior.toFixed(2)}`;

    document.getElementById('ticket-lbl-pedidos').innerText = t.itemPedidos;
    document.getElementById('ticket-val-pedidos').innerText = `${totalPedidos} ${t.ordersUnit} (${totalArticulos} ${t.itemsUnit})`;

    document.getElementById('ticket-lbl-consumo').innerText = t.itemConsumo;
    document.getElementById('ticket-val-consumo').innerText = `$${consumoPeriodo.toFixed(2)}`;

    document.getElementById('ticket-lbl-pagos').innerText = t.itemPagos;
    document.getElementById('ticket-val-pagos').innerText = `-$${pagosPeriodo.toFixed(2)}`;

    document.getElementById('ticket-lbl-restante').innerText = t.itemRestante;
    document.getElementById('ticket-val-restante').innerText = `$${montoRestante.toFixed(2)}`;
    document.getElementById('ticket-lbl-thanks').innerText = t.thanks;

    document.getElementById('ticket-btn-share-txt').innerText = t.btnShare;
    if (window.lucide) window.lucide.createIcons();
}

function generarMensajeTextoTicket(c) {
    const t = i18nTickets[idiomaTicketActual] || i18nTickets.es;
    const consumoPeriodo = calcularConsumoCliente(c.id);
    const pagosPeriodo = calcularPagosCliente(c.id);
    const montoRestante = calcularMontoRestanteCliente(c.id);
    const { totalPedidos, totalArticulos } = contarPedidosCliente(c.id);
    const nombreTienda = state.nombreTienda || "StoreFlow";

    let msg = `${t.msgGreeting} *${c.nombre}* 👋\n`;
    msg += `${t.msgSummary.replace('StoreFlow', nombreTienda)} (${t.period} #${state.periodoActual}):\n\n`;
    msg += `📋 *${t.msgDetail}*\n`;
    msg += `• ${t.itemAnterior} $${c.deuda_anterior.toFixed(2)}\n`;
    msg += `• ${t.itemPedidos} ${totalPedidos} ${t.ordersUnit} (${totalArticulos} ${t.itemsUnit})\n`;
    msg += `• ${t.itemConsumo} $${consumoPeriodo.toFixed(2)}\n`;
    msg += `• ${t.itemPagos} -$${pagosPeriodo.toFixed(2)}\n`;
    msg += `----------------------------\n`;
    msg += `👉 *${t.msgTotal} $${montoRestante.toFixed(2)}*\n\n`;
    msg += `${t.thanks}`;
    return msg;
}

async function ejecutarCompartirTicketFoto() {
    const c = state.clientes.find(cli => cli.id === selectedTicketClienteId);
    if (!c) return;

    const ticketEl = document.getElementById('ticket-visual-preview');
    const fileName = `ticket_${c.nombre.replace(/\s+/g, '_')}_p${state.periodoActual}.png`;

    try {
        showToast("Generando foto del comprobante...");
        const canvas = await window.html2canvas(ticketEl, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#FAF8FD'
        });

        canvas.toBlob(async (blob) => {
            if (!blob) {
                showToast("Error creando la imagen", true);
                return;
            }

            const file = new File([blob], fileName, { type: 'image/png' });

            // En dispositivos móviles compatibles, compartir EXCLUSIVAMENTE el archivo
            // para que WhatsApp abra directamente el selector de contactos con la foto adjunta
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Comprobante StoreFlow'
                    });
                    showToast("¡Comprobante compartido!");
                    cerrarModalCompartirTicket();
                    return;
                } catch (err) {
                    if (err.name === 'AbortError') return;
                    console.warn("Web Share no completado:", err);
                }
            }

            // Fallback para navegadores de escritorio o sin soporte de share de archivos:
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            showToast("Foto guardada. Adjúntala en el chat de WhatsApp.");
            
            const msg = generarMensajeTextoTicket(c);
            const phoneClean = (c.telefono || "").replace(/[^0-9]/g, '');
            abrirFallbackWhatsAppTexto(phoneClean, msg);
        }, 'image/png');

    } catch (error) {
        console.error("Error generando ticket:", error);
        showToast("Error al capturar la imagen", true);
    }
}

function ejecutarEnviarTextoWhatsApp() {
    const c = state.clientes.find(cli => cli.id === selectedTicketClienteId);
    if (!c) return;
    const msg = generarMensajeTextoTicket(c);
    const phoneClean = (c.telefono || "").replace(/[^0-9]/g, '');
    abrirFallbackWhatsAppTexto(phoneClean, msg);
    cerrarModalCompartirTicket();
}

function abrirFallbackWhatsAppTexto(phoneClean, msg) {
    const url = phoneClean 
        ? `https://wa.me/${phoneClean}?text=${encodeURIComponent(msg)}`
        : `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

async function descargarTicketImagen() {
    const c = state.clientes.find(cli => cli.id === selectedTicketClienteId);
    if (!c) return;
    const ticketEl = document.getElementById('ticket-visual-preview');
    try {
        showToast("Generando descarga...");
        const canvas = await window.html2canvas(ticketEl, { scale: 2, backgroundColor: '#FAF8FD' });
        const link = document.createElement('a');
        link.download = `ticket_${c.nombre.replace(/\s+/g, '_')}_p${state.periodoActual}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        showToast("¡Foto de ticket descargada!");
    } catch (e) {
        showToast("Error descargando la imagen", true);
    }
}

function copiarTextoTicket() {
    const c = state.clientes.find(cli => cli.id === selectedTicketClienteId);
    if (!c) return;
    const msg = generarMensajeTextoTicket(c);
    if (navigator.clipboard) {
        navigator.clipboard.writeText(msg);
    }
    showToast("¡Texto del estado de cuenta copiado!");
}
