// js/state.js — Estado Global y Cálculos Contables de StoreFlow
// Persistence delegated to js/db.js (IndexedDB repository layer)

import {
    loadAllState,
    saveState,
    agregarClientesEnLote,
    clearAllStores,
    importarTodo,
    exportarTodo,
    withSyncMeta,
} from './db.js';

// ─── In-Memory State (synchronous reads) ──────────────────────────────

export let state = {
    nombreTienda: "Mi Tiendita",
    simboloMoneda: "$",
    colorTema: "coral",
    periodoActual: 1,
    gastosOperativos: 0,
    clientes: [],
    productos: [],
    ventas: [],
    pagos: [],
    historicoCierres: []
};

// ─── Persistence: Load / Save ─────────────────────────────────────────

/**
 * Load state from IndexedDB (async, call once at init).
 * Automatically migrates from localStorage if IndexedDB is empty.
 */
export async function cargarEstado() {
    try {
        const loaded = await loadAllState();
        state.nombreTienda     = loaded.nombreTienda     || "Mi Tiendita";
        state.simboloMoneda    = loaded.simboloMoneda     || "$";
        state.colorTema        = loaded.colorTema         || "coral";
        state.periodoActual    = loaded.periodoActual     || 1;
        state.gastosOperativos = loaded.gastosOperativos  || 0;
        state.clientes         = loaded.clientes          || [];
        state.productos        = loaded.productos         || [];
        state.ventas           = loaded.ventas            || [];
        state.pagos            = loaded.pagos             || [];
        state.historicoCierres = loaded.historicoCierres   || [];
    } catch (e) {
        console.error("[state.js] Error loading from IndexedDB:", e);
        // Fallback: try localStorage directly (shouldn't happen after migration)
        _fallbackCargarLocalStorage();
    }
}

/**
 * Persist in-memory state to IndexedDB (fire-and-forget).
 * Exported as `guardarEnLocalStorage` for backwards compatibility with modals.
 */
let _saveTimer = null;
let _saveInFlight = Promise.resolve();
function _encolarGuardado() {
    // Serializa los guardados: una importación no debe competir con un guardado previo.
    const current = _saveInFlight.catch(() => {}).then(() => saveState(state));
    _saveInFlight = current;
    current.catch(err => console.error("[state.js] Error saving to IndexedDB:", err));
    return current;
}

function _guardarEstado() {
    if (_saveTimer) clearTimeout(_saveTimer);
    _saveTimer = setTimeout(() => {
        _saveTimer = null;
        void _encolarGuardado();
    }, 50);
}

/** Agrega clientes de una lista externa sin reemplazar datos contables. */
export async function anexarClientesImportados(filas) {
    if (!Array.isArray(filas) || filas.length === 0) return 0;
    if (_saveTimer) {
        clearTimeout(_saveTimer);
        _saveTimer = null;
        await _encolarGuardado();
    } else {
        await _saveInFlight;
    }

    const clientes = filas.map((fila, index) => withSyncMeta({
        id: "c_import_" + (globalThis.crypto?.randomUUID?.() ||
            Date.now() + "_" + index + "_" + Math.random().toString(36).slice(2)),
        numeroOrden: fila.numeroOrden,
        nombre: fila.nombre,
        telefono: "",
        deuda_anterior: 0,
        pagado_en_periodo: false,
    }, true));

    await agregarClientesEnLote(clientes); // Una única transacción, éxito o nada.
    state.clientes.push(...clientes);
    return clientes.length;
}

// Backwards-compatible export name — all modals import this
export const guardarEnLocalStorage = _guardarEstado;
export const guardarEstado = _guardarEstado;

// Legacy sync loader (fallback only)
function _fallbackCargarLocalStorage() {
    const dataGuardada = localStorage.getItem('storeflow_ledger_state_v2');
    if (dataGuardada) {
        try {
            const parsed = JSON.parse(dataGuardada);
            state.nombreTienda     = parsed.nombreTienda     || "StoreFlow";
            state.simboloMoneda    = parsed.simboloMoneda     || "$";
            state.colorTema        = parsed.colorTema         || "azul";
            state.periodoActual    = parsed.periodoActual     || 1;
            state.gastosOperativos = parsed.gastosOperativos  || 0;
            state.clientes         = parsed.clientes         || [];
            state.productos        = parsed.productos        || [];
            state.ventas           = parsed.ventas            || [];
            state.pagos            = parsed.pagos             || [];
            state.historicoCierres = parsed.historicoCierres  || [];
        } catch (e) {
            console.error("Error loading localStorage fallback", e);
        }
    }
}

// Legacy alias kept for any straggling imports
export function cargarDeLocalStorage() {
    _fallbackCargarLocalStorage();
}

// ─── Reset & Demo Data ────────────────────────────────────────────────

export async function resetearTodosLosDatos() {
    state.nombreTienda = "Mi Tiendita";
    state.simboloMoneda = "$";
    state.colorTema = "coral";
    state.periodoActual = 1;
    state.gastosOperativos = 0;
    state.clientes = [];
    state.productos = [];
    state.ventas = [];
    state.pagos = [];
    state.historicoCierres = [];
    await clearAllStores();
}

export function cargarDatosDemostracion() {
    const ahora = new Date().toISOString();
    state.nombreTienda = "Mi Tiendita";
    state.simboloMoneda = "$";
    state.colorTema = "coral";
    state.periodoActual = 1;
    state.gastosOperativos = 0;
    state.clientes = [
        { id: "c_1", nombre: "Juan Pérez", telefono: "555-0192", deuda_anterior: 0, pagado_en_periodo: false, createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "c_2", nombre: "María Gómez", telefono: "555-0143", deuda_anterior: 120, pagado_en_periodo: false, createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "c_3", nombre: "Carlos Flores", telefono: "", deuda_anterior: 0, pagado_en_periodo: false, createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false }
    ];
    state.productos = [
        { id: "p_1", nombre: "Pastel de Chocolate", precio: 80, costo: 30, emoji: "🍰", imagen: "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=120&auto=format&fit=crop&q=60", createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "p_2", nombre: "Café Americano", precio: 45, costo: 15, emoji: "☕", imagen: "https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=120&auto=format&fit=crop&q=60", createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "p_3", nombre: "Sándwich Especial", precio: 90, costo: 40, emoji: "🥪", imagen: "https://images.unsplash.com/photo-1509722747041-616f39b57569?w=120&auto=format&fit=crop&q=60", createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "p_4", nombre: "Refresco", precio: 30, costo: 18, emoji: "🥤", imagen: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=120&auto=format&fit=crop&q=60", createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false }
    ];
    state.ventas = [
        { id: "v_1", clienteId: "c_1", productoId: "p_2", cantidad: 1, periodo: 1, fecha: "13/07, 08:30 AM", fechaIso: ahora, createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false },
        { id: "v_2", clienteId: "c_2", productoId: "p_1", cantidad: 2, periodo: 1, fecha: "13/07, 09:15 AM", fechaIso: ahora, createdAt: ahora, updatedAt: ahora, _syncStatus: 'pending', _lastSyncedAt: null, _deleted: false }
    ];
    state.pagos = [];
    state.historicoCierres = [];
    guardarEnLocalStorage();
}

// ─── Backup Export / Import (delegated to db.js) ──────────────────────

export { exportarTodo, importarTodo };

// ─── Accounting Calculations (pure, synchronous) ─────────────────────

// 1. Total consumed by client in active period
export function calcularConsumoCliente(clienteId) {
    return state.ventas
        .filter(v => v.clienteId === clienteId && v.periodo === state.periodoActual && !v._deleted)
        .reduce((total, v) => {
            const prod = state.productos.find(p => p.id === v.productoId);
            return total + (prod ? (prod.precio * v.cantidad) : 0);
        }, 0);
}

// 2. Payments by client in active period
export function calcularPagosCliente(clienteId) {
    if (!state.pagos) return 0;
    return state.pagos
        .filter(p => p.clienteId === clienteId && p.periodo === state.periodoActual && !p._deleted)
        .reduce((total, p) => total + (parseFloat(p.monto) || 0), 0);
}

// 3. Count orders and items in current period
export function contarPedidosCliente(clienteId) {
    const ventasPeriodo = state.ventas.filter(v => v.clienteId === clienteId && v.periodo === state.periodoActual && !v._deleted);
    const totalPedidos = ventasPeriodo.length;
    const totalArticulos = ventasPeriodo.reduce((sum, v) => sum + v.cantidad, 0);
    return { totalPedidos, totalArticulos };
}

// 4. Today's consumption by client
export function calcularConsumoHoyCliente(clienteId) {
    const hoyStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    const hoyFullStr = new Date().toLocaleDateString('es-ES');
    
    return state.ventas
        .filter(v => {
            if (v.clienteId !== clienteId || v.periodo !== state.periodoActual || v._deleted) return false;
            if (v.fechaIso) {
                const f = new Date(v.fechaIso).toLocaleDateString('es-ES');
                return f === hoyFullStr;
            }
            if (v.fecha) {
                return v.fecha.startsWith(hoyStr) || v.fecha.includes(hoyFullStr);
            }
            return false;
        })
        .reduce((total, v) => {
            const prod = state.productos.find(p => p.id === v.productoId);
            return total + (prod ? (prod.precio * v.cantidad) : 0);
        }, 0);
}

// 5. Net balance remaining
export function calcularMontoRestanteCliente(clienteId) {
    const c = state.clientes.find(cli => cli.id === clienteId);
    if (!c) return 0;
    const consumoPeriodo = calcularConsumoCliente(clienteId);
    const pagosPeriodo = calcularPagosCliente(clienteId);
    return Math.max(0, (c.deuda_anterior + consumoPeriodo) - pagosPeriodo);
}

// 6. Global Statistics
export function calcularTotalVendidoHoy() {
    const hoyFullStr = new Date().toLocaleDateString('es-ES');
    const hoyStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    return state.ventas
        .filter(v => {
            if (v._deleted) return false;
            if (v.fechaIso) {
                const f = new Date(v.fechaIso).toLocaleDateString('es-ES');
                return f === hoyFullStr;
            }
            if (v.fecha) {
                return v.fecha.startsWith(hoyStr) || v.fecha.includes(hoyFullStr);
            }
            return false;
        })
        .reduce((total, v) => {
            const prod = state.productos.find(p => p.id === v.productoId);
            return total + (prod ? (prod.precio * v.cantidad) : 0);
        }, 0);
}

export function calcularTotalPendienteCiclo() {
    return state.clientes.reduce((total, c) => total + calcularMontoRestanteCliente(c.id), 0);
}

export function calcularTotalPagadoCiclo() {
    if (!state.pagos) return 0;
    return state.pagos
        .filter(p => p.periodo === state.periodoActual && !p._deleted)
        .reduce((total, p) => total + (parseFloat(p.monto) || 0), 0);
}

export function calcularTotalVendidoCiclo() {
    return state.ventas
        .filter(v => v.periodo === state.periodoActual && !v._deleted)
        .reduce((total, v) => {
            const prod = state.productos.find(p => p.id === v.productoId);
            return total + (prod ? (prod.precio * v.cantidad) : 0);
        }, 0);
}

// 7. Quick Order Functions
export function calcularCantidadVendidaHoyProducto(productoId) {
    const hoyFullStr = new Date().toLocaleDateString('es-ES');
    const hoyStr = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });

    return state.ventas
        .filter(v => {
            if (v.productoId !== productoId || v._deleted) return false;
            if (v.fechaIso) {
                const f = new Date(v.fechaIso).toLocaleDateString('es-ES');
                return f === hoyFullStr;
            }
            if (v.fecha) {
                return v.fecha.startsWith(hoyStr) || v.fecha.includes(hoyFullStr);
            }
            return false;
        })
        .reduce((sum, v) => sum + v.cantidad, 0);
}

export function calcularCantidadProductoCliente(clienteId, productoId) {
    return state.ventas
        .filter(v => v.clienteId === clienteId && v.productoId === productoId && v.periodo === state.periodoActual && !v._deleted)
        .reduce((sum, v) => sum + v.cantidad, 0);
}

export function agregarVentaRapida(clienteId, productoId, cantidad = 1) {
    const ahora = new Date();
    const fechaStr = `${ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}, ${ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    state.ventas.push(withSyncMeta({
        id: "v_" + Date.now() + "_" + Math.random().toString(36).substr(2, 4),
        clienteId,
        productoId,
        cantidad,
        periodo: state.periodoActual,
        fecha: fechaStr,
        fechaIso: ahora.toISOString()
    }, true));

    guardarEnLocalStorage();
}

export function reducirVentaRapida(clienteId, productoId) {
    const idx = state.ventas.map(v => v).reverse().findIndex(
        v => v.clienteId === clienteId && v.productoId === productoId && v.periodo === state.periodoActual && !v._deleted
    );

    if (idx !== -1) {
        const realIdx = state.ventas.length - 1 - idx;
        const venta = state.ventas[realIdx];
        if (venta.cantidad > 1) {
            venta.cantidad -= 1;
            venta.updatedAt = new Date().toISOString();
            venta._syncStatus = 'pending';
        } else {
            state.ventas.splice(realIdx, 1);
        }
        guardarEnLocalStorage();
        return true;
    }
    return false;
}

// 8. Theme System
const TEMAS = {
    coral: {
        accent: '#D95338',
        hover: '#C2410C',
        container: '#FBE8E4',
        onContainer: '#7A1C0E',
        light: '#FFF5F3',
        paper: '#F8F5F0',
        card: '#FFFFFF',
    },
    azul: {
        accent: '#1A73E8',
        hover: '#1765CC',
        container: '#D2E3FC',
        onContainer: '#174EA6',
        light: '#E8F0FE',
        paper: '#F8F9FA',
        card: '#FFFFFF',
    },
    violeta: {
        accent: '#7C3AED',
        hover: '#6D28D9',
        container: '#EDE9FE',
        onContainer: '#4C1D95',
        light: '#F5F3FF',
        paper: '#FAF9FC',
        card: '#FFFFFF',
    },
    verde: {
        accent: '#0D9488',
        hover: '#0F766E',
        container: '#CCFBF1',
        onContainer: '#134E4A',
        light: '#F0FDFA',
        paper: '#F7FAF9',
        card: '#FFFFFF',
    },
    rojo: {
        accent: '#DC2626',
        hover: '#B91C1C',
        container: '#FEE2E2',
        onContainer: '#7F1D1D',
        light: '#FEF2F2',
        paper: '#FAF8F8',
        card: '#FFFFFF',
    },
    naranja: {
        accent: '#EA580C',
        hover: '#C2410C',
        container: '#FFEDD5',
        onContainer: '#7C2D12',
        light: '#FFF7ED',
        paper: '#FAF8F5',
        card: '#FFFFFF',
    },
    rosa: {
        accent: '#DB2777',
        hover: '#BE185D',
        container: '#FCE7F3',
        onContainer: '#831843',
        light: '#FDF2F8',
        paper: '#FAF8F9',
        card: '#FFFFFF',
    },
};

export function aplicarTema(nombreTema) {
    const tema = TEMAS[nombreTema] || TEMAS.coral || TEMAS.azul;
    const root = document.documentElement.style;
    root.setProperty('--sf-accent', tema.accent);
    root.setProperty('--sf-accent-hover', tema.hover);
    root.setProperty('--sf-accent-container', tema.container);
    root.setProperty('--sf-accent-on-container', tema.onContainer);
    root.setProperty('--sf-accent-light', tema.light);
    root.setProperty('--sf-bg-paper', tema.paper || '#F8F5F0');
    root.setProperty('--sf-bg-card', tema.card || '#FFFFFF');
    document.body.style.backgroundColor = tema.paper || '#F8F5F0';
}

export function obtenerNombresTemas() {
    return Object.keys(TEMAS);
}
