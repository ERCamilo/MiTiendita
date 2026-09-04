// js/modals/modalAjustes.js - Modal de Ajustes, Personalización de Tienda y Gestión de Datos
import { state, guardarEnLocalStorage, resetearTodosLosDatos, cargarDatosDemostracion, aplicarTema, exportarTodo, importarTodo, cargarEstado } from '../state.js';
import { showToast } from '../toast.js';
import { customConfirm } from './modalConfirm.js';
import { instalarPWA, forzarActualizacion, esPWAInstalada, hayPromptInstalacionDisponible, onPWAStateChange } from '../pwa.js';

let onAjustesActualizadosCallback = null;

const COLORES_TEMA = {
    coral:   { label: 'Coral',   hex: '#D95338' },
    azul:    { label: 'Azul',    hex: '#1A73E8' },
    violeta: { label: 'Violeta', hex: '#7C3AED' },
    verde:   { label: 'Verde',   hex: '#0D9488' },
    rojo:    { label: 'Rojo',    hex: '#DC2626' },
    naranja: { label: 'Naranja', hex: '#EA580C' },
    rosa:    { label: 'Rosa',    hex: '#DB2777' },
};

export function initModalAjustes(onAjustesActualizados) {
    onAjustesActualizadosCallback = onAjustesActualizados;
    if (document.getElementById('modal-ajustes')) return;

    // Build theme swatches HTML
    const swatchesHtml = Object.entries(COLORES_TEMA).map(([key, v]) => `
        <button type="button" class="btn-tema flex flex-col items-center space-y-1 p-2 rounded-xl border-2 border-transparent hover:border-gray-300 transition active:scale-95 cursor-pointer" data-tema="${key}" title="${v.label}">
            <span class="w-8 h-8 rounded-full shadow-xs border-2 border-white" style="background:${v.hex}"></span>
            <span class="text-[10px] font-semibold text-gray-600">${v.label}</span>
        </button>
    `).join('');

    const modal = document.createElement('div');
    modal.id = 'modal-ajustes';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-5 space-y-4 shadow-2xl border border-m3-outlineVariant/30 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            <!-- Header Modal -->
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2 text-m3-primary">
                    <div class="w-8 h-8 rounded-xl bg-m3-primaryContainer flex items-center justify-center text-m3-onPrimaryContainer">
                        <i data-lucide="settings" class="w-4 h-4"></i>
                    </div>
                    <h3 class="text-base font-bold text-m3-onSurface">Ajustes y Configuración</h3>
                </div>
                <button type="button" id="btn-cerrar-ajustes" class="w-8 h-8 rounded-full bg-m3-surface flex items-center justify-center text-m3-outline hover:bg-m3-surfaceVariant transition cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Sección: Identidad del Negocio -->
            <div class="bg-m3-surface p-4 rounded-2xl space-y-3 border border-m3-outlineVariant/30">
                <h4 class="text-xs font-bold text-m3-onSurface flex items-center space-x-1.5">
                    <i data-lucide="store" class="w-3.5 h-3.5 text-m3-primary"></i>
                    <span>Identidad del Negocio</span>
                </h4>
                
                <div>
                    <label class="block text-[11px] font-semibold text-m3-onSurfaceVariant mb-1">Nombre de la Tienda</label>
                    <input type="text" id="ajustes-nombre-tienda" placeholder="Ej. Abarrotes La Esquina" class="w-full p-2.5 rounded-xl border border-m3-outlineVariant text-xs bg-white focus:outline-none focus:ring-2 focus:ring-m3-primary">
                </div>

                <div>
                    <label class="block text-[11px] font-semibold text-m3-onSurfaceVariant mb-1">Símbolo de Moneda</label>
                    <div class="grid grid-cols-4 gap-1.5">
                        <button type="button" class="btn-moneda py-1.5 rounded-xl text-xs font-bold bg-white border border-m3-outlineVariant/40 text-m3-onSurface" data-moneda="$">$ (USD/MXN)</button>
                        <button type="button" class="btn-moneda py-1.5 rounded-xl text-xs font-bold bg-white border border-m3-outlineVariant/40 text-m3-onSurface" data-moneda="€">€ (EUR)</button>
                        <button type="button" class="btn-moneda py-1.5 rounded-xl text-xs font-bold bg-white border border-m3-outlineVariant/40 text-m3-onSurface" data-moneda="S/">S/ (PEN)</button>
                        <button type="button" class="btn-moneda py-1.5 rounded-xl text-xs font-bold bg-white border border-m3-outlineVariant/40 text-m3-onSurface" data-moneda="Q">Q (GTQ)</button>
                    </div>
                </div>

                <!-- Color de Acento -->
                <div>
                    <label class="block text-[11px] font-semibold text-m3-onSurfaceVariant mb-1.5">Color de Acento</label>
                    <div class="flex items-center justify-between gap-1">
                        ${swatchesHtml}
                    </div>
                </div>

                <button type="button" id="btn-guardar-identidad" class="w-full py-2.5 rounded-xl bg-m3-primary text-white text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition cursor-pointer">
                    Guardar Cambios
                </button>
            </div>

            <!-- Sección: Aplicación & PWA (Instalación y Actualizaciones) -->
            <div class="bg-m3-surface p-4 rounded-2xl space-y-2.5 border border-m3-outlineVariant/30">
                <div class="flex items-center justify-between">
                    <h4 class="text-xs font-bold text-m3-onSurface flex items-center space-x-1.5">
                        <i data-lucide="smartphone" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>Aplicación & PWA</span>
                    </h4>
                    <span id="pwa-badge-status" class="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        Offline Ready
                    </span>
                </div>
                <p class="text-[10px] text-m3-outline">Instala Mi Tiendita en tu pantalla de inicio y gestiona actualizaciones con caché limpio.</p>

                <div class="space-y-2 pt-1">
                    <!-- Botón Instalar -->
                    <button type="button" id="btn-instalar-pwa" class="w-full py-2.5 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer">
                        <i data-lucide="download" class="w-4 h-4"></i>
                        <span id="btn-instalar-texto">Instalar en Dispositivo</span>
                    </button>

                    <!-- Botón Buscar Actualizaciones -->
                    <button type="button" id="btn-actualizar-pwa" class="w-full py-2.5 px-3 rounded-xl bg-white border border-m3-outlineVariant/40 text-m3-onSurface hover:bg-m3-surfaceVariant text-xs font-bold flex items-center justify-center space-x-2 shadow-2xs transition active:scale-95 cursor-pointer">
                        <i data-lucide="refresh-cw" class="w-4 h-4 text-m3-primary"></i>
                        <span>Buscar Actualizaciones</span>
                    </button>
                    <p class="text-[9px] text-gray-500 text-center">Forzará la limpieza del caché para descargar la versión más reciente sin tocar tus datos.</p>
                </div>
            </div>

            <!-- Sección: Copia de Seguridad (Backup) -->
            <div class="bg-m3-surface p-4 rounded-2xl space-y-2.5 border border-m3-outlineVariant/30">
                <h4 class="text-xs font-bold text-m3-onSurface flex items-center space-x-1.5">
                    <i data-lucide="database" class="w-3.5 h-3.5 text-m3-primary"></i>
                    <span>Copia de Seguridad</span>
                </h4>
                <p class="text-[10px] text-m3-outline">Exporta tus clientes, cuentas y productos o restáuralos en otro dispositivo.</p>

                <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="btn-exportar-backup" class="py-2.5 px-3 rounded-xl bg-white border border-m3-outlineVariant/40 text-m3-onSurface hover:bg-m3-surfaceVariant text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95 cursor-pointer">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>Exportar JSON</span>
                    </button>
                    
                    <button type="button" id="btn-importar-backup" class="py-2.5 px-3 rounded-xl bg-white border border-m3-outlineVariant/40 text-m3-onSurface hover:bg-m3-surfaceVariant text-xs font-bold flex items-center justify-center space-x-1.5 shadow-2xs transition active:scale-95 cursor-pointer">
                        <i data-lucide="upload" class="w-3.5 h-3.5 text-m3-primary"></i>
                        <span>Restaurar</span>
                    </button>
                    <input type="file" id="input-archivo-backup" accept=".json" class="hidden">
                </div>
            </div>

            <!-- Sección: Zona de Peligro & Pruebas -->
            <div class="p-3.5 rounded-2xl space-y-2 border border-m3-outlineVariant/30 bg-white">
                <h4 class="text-xs font-bold text-m3-onSurface flex items-center space-x-1.5">
                    <i data-lucide="sliders" class="w-3.5 h-3.5 text-m3-outline"></i>
                    <span>Mantenimiento</span>
                </h4>

                <button type="button" id="btn-cargar-demo" class="w-full py-2 px-3 rounded-xl bg-m3-surface text-m3-onSurface hover:bg-m3-surfaceVariant text-[11px] font-semibold flex items-center justify-center space-x-1.5 border border-m3-outlineVariant/30 transition cursor-pointer">
                    <i data-lucide="sparkles" class="w-3.5 h-3.5 text-amber-600"></i>
                    <span>Cargar Datos de Demostración</span>
                </button>

                <button type="button" id="btn-reset-datos" class="w-full py-2 px-3 rounded-xl bg-red-50 text-m3-error hover:bg-red-100 text-[11px] font-bold flex items-center justify-center space-x-1.5 border border-red-200 transition cursor-pointer">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    <span>Borrar Todos los Datos (Reset)</span>
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    // Eventos
    document.getElementById('btn-cerrar-ajustes').addEventListener('click', cerrarModalAjustes);
    document.getElementById('btn-guardar-identidad').addEventListener('click', guardarIdentidadTienda);
    document.getElementById('btn-exportar-backup').addEventListener('click', ejecutarExportarBackup);
    
    const inputBackup = document.getElementById('input-archivo-backup');
    document.getElementById('btn-importar-backup').addEventListener('click', () => inputBackup.click());
    inputBackup.addEventListener('change', ejecutarImportarBackup);

    document.getElementById('btn-cargar-demo').addEventListener('click', () => {
        customConfirm(
            "Cargar Demostración", 
            "Se reemplazarán los datos actuales con clientes y productos de ejemplo. ¿Deseas continuar?",
            () => {
                cargarDatosDemostracion();
                cerrarModalAjustes();
                if (onAjustesActualizadosCallback) onAjustesActualizadosCallback();
                showToast("¡Datos de demostración cargados!");
            },
            "sparkles"
        );
    });

    document.getElementById('btn-reset-datos').addEventListener('click', () => {
        customConfirm(
            "Borrar Todos los Datos", 
            "⚠️ ATENCIÓN: Se eliminarán permanentemente todos los clientes, productos, ventas e historial. Esta acción no se puede deshacer.",
            async () => {
                await resetearTodosLosDatos();
                cerrarModalAjustes();
                if (onAjustesActualizadosCallback) onAjustesActualizadosCallback();
                showToast("Todos los datos han sido borrados.");
            },
            "trash-2"
        );
    });

    // Eventos PWA
    document.getElementById('btn-instalar-pwa').addEventListener('click', () => {
        instalarPWA();
    });

    document.getElementById('btn-actualizar-pwa').addEventListener('click', () => {
        customConfirm(
            "Actualizar Aplicación", 
            "Se limpiará el caché local y se descargará la última versión de la app. Tus clientes, ventas y deudas NO se verán afectados. ¿Continuar?",
            () => {
                forzarActualizacion();
            },
            "refresh-cw"
        );
    });

    onPWAStateChange(() => {
        actualizarEstadoPWAEnModal();
    });

    modal.querySelectorAll('.btn-moneda').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const moneda = e.currentTarget.getAttribute('data-moneda');
            seleccionarMonedaUI(moneda);
        });
    });

    modal.querySelectorAll('.btn-tema').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const tema = e.currentTarget.getAttribute('data-tema');
            seleccionarTemaUI(tema);
            // Live preview: apply theme immediately without saving
            aplicarTema(tema);
        });
    });
}

let temaSeleccionadoEnModal = null;

export function abrirModalAjustes() {
    const inputNombre = document.getElementById('ajustes-nombre-tienda');
    if (inputNombre) {
        inputNombre.value = state.nombreTienda || "Mi Tiendita";
    }
    seleccionarMonedaUI(state.simboloMoneda || "$");
    temaSeleccionadoEnModal = state.colorTema || "coral";
    seleccionarTemaUI(temaSeleccionadoEnModal);
    actualizarEstadoPWAEnModal();

    document.getElementById('modal-ajustes').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

function actualizarEstadoPWAEnModal() {
    const btnInstalar = document.getElementById('btn-instalar-pwa');
    const textoInstalar = document.getElementById('btn-instalar-texto');
    const badgeStatus = document.getElementById('pwa-badge-status');
    if (!btnInstalar || !textoInstalar) return;

    if (esPWAInstalada()) {
        btnInstalar.className = "w-full py-2.5 px-3 rounded-xl bg-gray-100 border border-gray-200 text-gray-500 text-xs font-semibold flex items-center justify-center space-x-2 cursor-default";
        btnInstalar.disabled = true;
        textoInstalar.textContent = "✓ Aplicación ya instalada";
        if (badgeStatus) {
            badgeStatus.textContent = "Modo App Instalada";
            badgeStatus.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800";
        }
    } else if (hayPromptInstalacionDisponible()) {
        btnInstalar.className = "w-full py-2.5 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer";
        btnInstalar.disabled = false;
        textoInstalar.textContent = "Instalar en Dispositivo";
        if (badgeStatus) {
            badgeStatus.textContent = "Listo para instalar";
            badgeStatus.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
        }
    } else {
        btnInstalar.className = "w-full py-2.5 px-3 rounded-xl bg-m3-primary hover:bg-m3-primary/90 text-white text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition active:scale-95 cursor-pointer";
        btnInstalar.disabled = false;
        textoInstalar.textContent = "Instalar Aplicación";
        if (badgeStatus) {
            badgeStatus.textContent = "Offline Ready";
            badgeStatus.className = "text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800";
        }
    }
}

export function cerrarModalAjustes() {
    const modal = document.getElementById('modal-ajustes');
    if (modal) modal.classList.add('hidden');
    // Revert live preview if not saved
    aplicarTema(state.colorTema || 'azul');
}

function seleccionarMonedaUI(moneda) {
    document.querySelectorAll('#modal-ajustes .btn-moneda').forEach(btn => {
        if (btn.getAttribute('data-moneda') === moneda) {
            btn.className = "btn-moneda py-1.5 rounded-xl text-xs font-bold bg-m3-primary text-white border border-m3-primary shadow-xs";
        } else {
            btn.className = "btn-moneda py-1.5 rounded-xl text-xs font-bold bg-white border border-m3-outlineVariant/40 text-m3-onSurface hover:bg-m3-surfaceVariant";
        }
    });
}

function seleccionarTemaUI(tema) {
    temaSeleccionadoEnModal = tema;
    document.querySelectorAll('#modal-ajustes .btn-tema').forEach(btn => {
        if (btn.getAttribute('data-tema') === tema) {
            btn.classList.remove('border-transparent');
            btn.classList.add('border-gray-900', 'bg-gray-100');
        } else {
            btn.classList.add('border-transparent');
            btn.classList.remove('border-gray-900', 'bg-gray-100');
        }
    });
}

function guardarIdentidadTienda() {
    const inputNombre = document.getElementById('ajustes-nombre-tienda');
    const nuevoNombre = inputNombre.value.trim() || "StoreFlow";

    const btnMonedaActivo = document.querySelector('#modal-ajustes .btn-moneda.bg-m3-primary');
    const nuevaMoneda = btnMonedaActivo ? btnMonedaActivo.getAttribute('data-moneda') : "$";

    state.nombreTienda = nuevoNombre;
    state.simboloMoneda = nuevaMoneda;
    state.colorTema = temaSeleccionadoEnModal || "azul";
    aplicarTema(state.colorTema);
    guardarEnLocalStorage();

    cerrarModalAjustes();
    if (onAjustesActualizadosCallback) onAjustesActualizadosCallback();
    showToast(`¡Configuración de "${nuevoNombre}" guardada!`);
}

async function ejecutarExportarBackup() {
    try {
        const data = await exportarTodo();
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
        const ahora = new Date().toISOString().split('T')[0];
        const fileName = `storeflow_backup_${ahora}.json`;

        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", fileName);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        showToast("¡Copia de seguridad exportada con éxito!");
    } catch (err) {
        console.error(err);
        showToast("Error al exportar la copia de seguridad", true);
    }
}

function ejecutarImportarBackup(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const dataImportada = JSON.parse(event.target.result);
            if (dataImportada && Array.isArray(dataImportada.clientes) && Array.isArray(dataImportada.productos)) {
                customConfirm(
                    "Restaurar Copia",
                    `Se importarán ${dataImportada.clientes.length} clientes y ${dataImportada.productos.length} productos. ¿Deseas sobrescribir los datos actuales?`,
                    async () => {
                        await importarTodo(dataImportada);
                        await cargarEstado(); // Reload in-memory state from IndexedDB
                        cerrarModalAjustes();
                        if (onAjustesActualizadosCallback) onAjustesActualizadosCallback();
                        showToast("¡Copia de seguridad restaurada!");
                    },
                    "upload"
                );
            } else {
                showToast("El archivo no tiene el formato válido de StoreFlow", true);
            }
        } catch (err) {
            console.error(err);
            showToast("Error leyendo el archivo JSON", true);
        }
    };
    reader.readAsText(file);
    e.target.value = '';
}

export { COLORES_TEMA, ejecutarExportarBackup, ejecutarImportarBackup };
