// js/modals/modalNuevoPedido.js - Modal para tomar pedidos con catálogo y preview de total
import { state, guardarEnLocalStorage } from '../state.js';
import { showToast } from '../toast.js';

let selectedPedidoClienteId = null;
let carroCompraPedido = {};
let onPedidoConfirmadoCallback = null;

export function initModalNuevoPedido(onPedidoConfirmado) {
    onPedidoConfirmadoCallback = onPedidoConfirmado;
    if (document.getElementById('modal-nuevo-pedido')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-nuevo-pedido';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-md rounded-t-[32px] sm:rounded-3xl p-5 space-y-4 shadow-2xl border-t sm:border border-m3-outlineVariant/30 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div class="w-12 h-1 bg-m3-outlineVariant rounded-full mx-auto sm:hidden"></div>
            
            <!-- Cabecera del Modal -->
            <div class="flex justify-between items-start">
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-2xl bg-m3-primary text-white flex items-center justify-center shadow-xs">
                        <i data-lucide="shopping-cart" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h3 class="text-base font-bold text-m3-onSurface">Agregar Pedido</h3>
                        <p id="pedido-modal-cliente-nombre" class="text-xs font-bold text-m3-primary">Para: -</p>
                    </div>
                </div>
                <button type="button" id="btn-cerrar-pedido-icon" class="w-8 h-8 rounded-full bg-m3-surface flex items-center justify-center text-m3-outline hover:bg-m3-surfaceVariant transition cursor-pointer">
                    <i data-lucide="x" class="w-4 h-4"></i>
                </button>
            </div>

            <!-- Listado de Artículos con Selección de Cantidades -->
            <div class="flex-1 overflow-y-auto pr-1 py-1 space-y-2 max-h-72" id="modal-pedido-grid-productos">
                <!-- Se llena dinámicamente -->
            </div>

            <!-- Previsualización del Monto y Botón Aceptar -->
            <div class="pt-3 border-t border-m3-outlineVariant/30 space-y-3 bg-white">
                <div class="bg-m3-surface p-3.5 rounded-2xl flex justify-between items-center text-xs">
                    <div>
                        <span class="text-m3-onSurfaceVariant block">Artículos seleccionados:</span>
                        <span id="pedido-modal-total-arts" class="font-bold text-m3-onSurface text-sm">0 artículos</span>
                    </div>
                    <div class="text-right">
                        <span class="text-m3-onSurfaceVariant block">Total del Pedido:</span>
                        <span id="pedido-modal-total-monto" class="text-xl font-black text-m3-primary">$0.00</span>
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <button type="button" id="btn-cancelar-pedido-modal" class="py-3 text-sm font-semibold rounded-full border border-m3-outlineVariant text-m3-onSurface hover:bg-m3-surface active:scale-95 transition-all cursor-pointer">
                        Cancelar
                    </button>
                    <button type="button" id="btn-confirmar-pedido-modal" disabled class="py-3 text-sm font-semibold rounded-full bg-m3-outlineVariant/50 text-m3-onSurfaceVariant flex items-center justify-center space-x-1.5 transition-all cursor-not-allowed">
                        <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                        <span>Aceptar</span>
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cerrar-pedido-icon').addEventListener('click', cerrarModalNuevoPedido);
    document.getElementById('btn-cancelar-pedido-modal').addEventListener('click', cerrarModalNuevoPedido);
    document.getElementById('btn-confirmar-pedido-modal').addEventListener('click', ejecutarConfirmarPedidoModal);
}

export function abrirModalNuevoPedido(clienteId) {
    selectedPedidoClienteId = clienteId;
    const c = state.clientes.find(cli => cli.id === clienteId);
    if (!c) return;

    document.getElementById('pedido-modal-cliente-nombre').innerText = `Para: ${c.nombre}`;
    carroCompraPedido = {};
    state.productos.forEach(p => {
        carroCompraPedido[p.id] = 0;
    });

    renderizarProductosPedidoModal();
    actualizarUIPedidoModal();
    document.getElementById('modal-nuevo-pedido').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function cerrarModalNuevoPedido() {
    const modal = document.getElementById('modal-nuevo-pedido');
    if (modal) modal.classList.add('hidden');
    selectedPedidoClienteId = null;
}

function cambiarCantidadPedidoModal(prodId, delta) {
    if (!carroCompraPedido[prodId] && carroCompraPedido[prodId] !== 0) {
        carroCompraPedido[prodId] = 0;
    }
    carroCompraPedido[prodId] = Math.max(0, carroCompraPedido[prodId] + delta);
    
    const counterEl = document.getElementById(`modal-counter-prod-${prodId}`);
    if (counterEl) {
        counterEl.innerText = carroCompraPedido[prodId];
    }
    const cardEl = document.getElementById(`modal-card-prod-${prodId}`);
    if (cardEl) {
        if (carroCompraPedido[prodId] > 0) {
            cardEl.classList.add('border-m3-primary', 'bg-m3-primaryContainer/10');
        } else {
            cardEl.classList.remove('border-m3-primary', 'bg-m3-primaryContainer/10');
        }
    }
    actualizarUIPedidoModal();
}

function renderizarProductosPedidoModal() {
    const grid = document.getElementById('modal-pedido-grid-productos');
    grid.innerHTML = '';

    if (state.productos.length === 0) {
        grid.innerHTML = `<p class="text-center text-xs text-m3-outline py-6">No hay productos registrados en el menú.</p>`;
        return;
    }

    state.productos.forEach(p => {
        const cant = carroCompraPedido[p.id] || 0;
        const tieneImagen = p.imagen && p.imagen.trim() !== "";
        const avatarImg = tieneImagen 
            ? `<img class="w-10 h-10 object-cover rounded-xl shrink-0" src="${p.imagen}" onerror="this.onerror=null; this.parentElement.innerHTML='<span class=\\'text-xl\\'>${p.emoji || '🍩'}</span>'"/>`
            : `<div class="w-10 h-10 bg-m3-surfaceVariant rounded-xl flex items-center justify-center text-xl shrink-0">${p.emoji || '🍩'}</div>`;

        const item = document.createElement('div');
        item.id = `modal-card-prod-${p.id}`;
        item.className = `bg-white border ${cant > 0 ? 'border-m3-primary bg-m3-primaryContainer/10' : 'border-m3-outlineVariant/30'} rounded-2xl p-3 flex items-center justify-between shadow-xs transition-all`;
        item.innerHTML = `
            <div class="flex items-center space-x-2.5 min-w-0">
                ${avatarImg}
                <div class="min-w-0">
                    <h4 class="font-bold text-xs text-m3-onSurface truncate">${p.nombre}</h4>
                    <p class="text-xs font-bold text-m3-primary">$${p.precio.toFixed(2)}</p>
                </div>
            </div>
            <div class="flex items-center space-x-1.5 bg-m3-surface rounded-xl p-1 shrink-0">
                <button type="button" class="btn-restar-cant w-7 h-7 rounded-lg bg-white border border-m3-outlineVariant/30 flex items-center justify-center font-bold text-m3-onSurface active:bg-m3-surfaceVariant transition-all cursor-pointer">
                    <i data-lucide="minus" class="w-3.5 h-3.5 text-m3-primary"></i>
                </button>
                <span id="modal-counter-prod-${p.id}" class="text-xs font-black text-m3-onSurface w-5 text-center">${cant}</span>
                <button type="button" class="btn-sumar-cant w-7 h-7 rounded-lg bg-white border border-m3-outlineVariant/30 flex items-center justify-center font-bold text-m3-onSurface active:bg-m3-surfaceVariant transition-all cursor-pointer">
                    <i data-lucide="plus" class="w-3.5 h-3.5 text-m3-primary"></i>
                </button>
            </div>
        `;
        
        item.querySelector('.btn-restar-cant').addEventListener('click', () => cambiarCantidadPedidoModal(p.id, -1));
        item.querySelector('.btn-sumar-cant').addEventListener('click', () => cambiarCantidadPedidoModal(p.id, 1));
        
        grid.appendChild(item);
    });
    if (window.lucide) window.lucide.createIcons();
}

function actualizarUIPedidoModal() {
    let totalMonto = 0;
    let totalArticulos = 0;

    state.productos.forEach(p => {
        const cant = carroCompraPedido[p.id] || 0;
        totalMonto += cant * p.precio;
        totalArticulos += cant;
    });

    const artsEl = document.getElementById('pedido-modal-total-arts');
    const montoEl = document.getElementById('pedido-modal-total-monto');
    if (artsEl) artsEl.innerText = `${totalArticulos} ${totalArticulos === 1 ? 'artículo' : 'artículos'}`;
    if (montoEl) montoEl.innerText = `$${totalMonto.toFixed(2)}`;

    const btnConfirmar = document.getElementById('btn-confirmar-pedido-modal');
    if (btnConfirmar) {
        if (totalArticulos > 0) {
            btnConfirmar.removeAttribute('disabled');
            btnConfirmar.className = "py-3 text-sm font-semibold rounded-full bg-m3-primary text-white hover:bg-m3-primary/95 flex items-center justify-center space-x-1.5 transition-all active:scale-95 shadow-md cursor-pointer";
            btnConfirmar.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i><span>Aceptar ($${totalMonto.toFixed(2)})</span>`;
        } else {
            btnConfirmar.setAttribute('disabled', 'true');
            btnConfirmar.className = "py-3 text-sm font-semibold rounded-full bg-m3-outlineVariant/50 text-m3-onSurfaceVariant flex items-center justify-center space-x-1.5 transition-all cursor-not-allowed";
            btnConfirmar.innerHTML = `<i data-lucide="check-circle-2" class="w-4 h-4"></i><span>Aceptar</span>`;
        }
    }
    if (window.lucide) window.lucide.createIcons();
}

function ejecutarConfirmarPedidoModal() {
    if (!selectedPedidoClienteId) return;
    const c = state.clientes.find(cli => cli.id === selectedPedidoClienteId);
    if (!c) return;

    const itemsAAgregar = [];
    state.productos.forEach(p => {
        const cant = carroCompraPedido[p.id] || 0;
        if (cant > 0) {
            itemsAAgregar.push({ prod: p, cantidad: cant });
        }
    });

    if (itemsAAgregar.length === 0) {
        showToast("No has seleccionado ningún artículo.", true);
        return;
    }

    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ", " + ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    let montoTotalPedido = 0;
    itemsAAgregar.forEach(item => {
        montoTotalPedido += item.prod.precio * item.cantidad;
        state.ventas.push({
            id: 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            clienteId: c.id,
            productoId: item.prod.id,
            cantidad: item.cantidad,
            periodo: state.periodoActual,
            fecha: fechaStr,
            fechaIso: ahora.toISOString()
        });
    });

    if (c.pagado_en_periodo) {
        c.pagado_en_periodo = false;
    }

    guardarEnLocalStorage();
    cerrarModalNuevoPedido();
    if (onPedidoConfirmadoCallback) onPedidoConfirmadoCallback(c);
    showToast(`¡Pedido de $${montoTotalPedido.toFixed(2)} agregado a la cuenta de ${c.nombre}!`);
}
