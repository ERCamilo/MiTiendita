// js/modals/modalNuevoCliente.js - Modal para registrar nuevos clientes
import { state, guardarEnLocalStorage } from '../state.js';
import { showToast } from '../toast.js';

let onClienteCreadoCallback = null;

export function initModalNuevoCliente(onClienteCreado) {
    onClienteCreadoCallback = onClienteCreado;
    if (document.getElementById('modal-nuevo-cliente')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-nuevo-cliente';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-m3-outlineVariant/30 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center space-x-2.5 text-m3-primary">
                <i data-lucide="user-plus" class="w-6 h-6"></i>
                <h3 class="text-lg font-bold text-m3-onSurface">Registrar Cliente</h3>
            </div>
            <div class="space-y-3">
                <div>
                    <label class="block text-xs font-semibold text-m3-onSurfaceVariant mb-1">Nombre Completo</label>
                    <input type="text" id="nuevo-cliente-nombre" placeholder="Ej. Luis Ramírez" class="w-full p-3 rounded-2xl border border-m3-outlineVariant text-sm focus:outline-none focus:ring-2 focus:ring-m3-primary">
                </div>
                <div>
                    <label class="block text-xs font-semibold text-m3-onSurfaceVariant mb-1">Teléfono (Opcional)</label>
                    <input type="text" id="nuevo-cliente-telefono" placeholder="Ej. +52 1 55..." class="w-full p-3 rounded-2xl border border-m3-outlineVariant text-sm focus:outline-none focus:ring-2 focus:ring-m3-primary">
                </div>
            </div>
            <div class="flex space-x-2 pt-2">
                <button type="button" id="btn-cerrar-nuevo-cliente" class="flex-1 py-3 text-sm font-semibold rounded-full border border-m3-outlineVariant text-m3-onSurface hover:bg-m3-surface active:scale-95 transition-all cursor-pointer">Cancelar</button>
                <button type="button" id="btn-crear-nuevo-cliente" class="flex-1 py-3 text-sm font-semibold rounded-full bg-m3-primary text-white hover:bg-m3-primary/95 active:scale-95 transition-all cursor-pointer">Crear</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cerrar-nuevo-cliente').addEventListener('click', cerrarModalNuevoCliente);
    document.getElementById('btn-crear-nuevo-cliente').addEventListener('click', ejecutarCrearCliente);
}

export function abrirModalNuevoCliente() {
    const inputNombre = document.getElementById('nuevo-cliente-nombre');
    const inputTel = document.getElementById('nuevo-cliente-telefono');
    if (inputNombre) inputNombre.value = '';
    if (inputTel) inputTel.value = '';
    
    document.getElementById('modal-nuevo-cliente').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    if (inputNombre) inputNombre.focus();
}

export function cerrarModalNuevoCliente() {
    document.getElementById('modal-nuevo-cliente').classList.add('hidden');
}

function ejecutarCrearCliente() {
    const nombre = document.getElementById('nuevo-cliente-nombre').value.trim();
    const telefono = document.getElementById('nuevo-cliente-telefono').value.trim();

    if (!nombre) {
        showToast("Por favor ingresa el nombre del cliente", true);
        return;
    }

    const nuevoCliente = {
        id: "c_" + Date.now(),
        nombre,
        telefono,
        deuda_anterior: 0,
        pagado_en_periodo: false
    };

    state.clientes.push(nuevoCliente);
    guardarEnLocalStorage();
    cerrarModalNuevoCliente();
    if (onClienteCreadoCallback) onClienteCreadoCallback(nuevoCliente);
    showToast(`¡Cliente ${nombre} registrado con éxito!`);
}
