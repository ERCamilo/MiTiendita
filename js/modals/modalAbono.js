// js/modals/modalAbono.js - Modal para registrar abonos y liquidaciones de clientes
import { state, guardarEnLocalStorage, calcularMontoRestanteCliente } from '../state.js';
import { showToast } from '../toast.js';

let selectedAbonoClienteId = null;
let onAbonoRegistradoCallback = null;

export function initModalAbono(onAbonoRegistrado) {
    onAbonoRegistradoCallback = onAbonoRegistrado;
    if (document.getElementById('modal-abono-cliente')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-abono-cliente';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-m3-outlineVariant/30 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center space-x-2.5 text-green-700">
                <i data-lucide="hand-coins" class="w-6 h-6"></i>
                <h3 class="text-lg font-bold text-m3-onSurface">Registrar Abono / Pago</h3>
            </div>
            
            <div>
                <p class="text-xs font-semibold text-m3-outline" id="abono-cliente-nombre">Cliente: -</p>
                <div class="flex justify-between items-center bg-m3-surface p-3 rounded-2xl mt-2 text-xs">
                    <span class="text-m3-onSurfaceVariant">Saldo restante a pagar:</span>
                    <span class="font-black text-sm text-m3-error" id="abono-saldo-pendiente">$0.00</span>
                </div>
            </div>

            <div class="space-y-2">
                <label class="block text-xs font-semibold text-m3-onSurfaceVariant">Monto a Abonar ($)</label>
                <input type="number" id="abono-monto" placeholder="0.00" class="w-full p-3.5 rounded-2xl border border-m3-outlineVariant text-base font-bold focus:outline-none focus:ring-2 focus:ring-green-600">
                
                <div class="flex justify-end">
                    <button type="button" id="btn-abono-total" class="text-[11px] text-green-700 font-bold hover:underline cursor-pointer">
                        Abonar saldo total completo
                    </button>
                </div>
            </div>

            <div class="flex space-x-2 pt-2">
                <button type="button" id="btn-cancelar-abono" class="flex-1 py-3 text-sm font-semibold rounded-full border border-m3-outlineVariant text-m3-onSurface hover:bg-m3-surface active:scale-95 transition-all cursor-pointer">Cancelar</button>
                <button type="button" id="btn-ejecutar-abono" class="flex-1 py-3 text-sm font-semibold rounded-full bg-green-700 text-white hover:bg-green-800 active:scale-95 transition-all shadow-md cursor-pointer">Registrar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-cancelar-abono').addEventListener('click', cerrarModalAbono);
    document.getElementById('btn-abono-total').addEventListener('click', llenarAbonoTotal);
    document.getElementById('btn-ejecutar-abono').addEventListener('click', ejecutarRegistrarAbono);
}

export function abrirModalAbono(clienteId) {
    selectedAbonoClienteId = clienteId;
    const c = state.clientes.find(cli => cli.id === clienteId);
    if (!c) return;

    const saldoPendiente = calcularMontoRestanteCliente(clienteId);
    document.getElementById('abono-cliente-nombre').innerText = `Cliente: ${c.nombre}`;
    document.getElementById('abono-saldo-pendiente').innerText = `$${saldoPendiente.toFixed(2)}`;
    
    const inputMonto = document.getElementById('abono-monto');
    if (inputMonto) {
        inputMonto.value = '';
        inputMonto.max = saldoPendiente;
    }

    document.getElementById('modal-abono-cliente').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
    if (inputMonto) inputMonto.focus();
}

export function cerrarModalAbono() {
    const modal = document.getElementById('modal-abono-cliente');
    if (modal) modal.classList.add('hidden');
    selectedAbonoClienteId = null;
}

function llenarAbonoTotal() {
    if (!selectedAbonoClienteId) return;
    const saldoPendiente = calcularMontoRestanteCliente(selectedAbonoClienteId);
    const inputMonto = document.getElementById('abono-monto');
    if (inputMonto) inputMonto.value = saldoPendiente.toFixed(2);
}

function ejecutarRegistrarAbono() {
    if (!selectedAbonoClienteId) return;
    const c = state.clientes.find(cli => cli.id === selectedAbonoClienteId);
    if (!c) return;

    const inputMonto = document.getElementById('abono-monto');
    const monto = parseFloat(inputMonto.value);
    const saldoPendiente = calcularMontoRestanteCliente(c.id);

    if (isNaN(monto) || monto <= 0) {
        showToast("Por favor ingresa un monto válido a abonar.", true);
        return;
    }

    if (monto > (saldoPendiente + 0.01)) {
        showToast(`El monto no puede exceder el saldo restante ($${saldoPendiente.toFixed(2)})`, true);
        return;
    }

    const ahora = new Date();
    const fechaStr = ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) + ", " + ahora.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    if (!state.pagos) state.pagos = [];
    state.pagos.push({
        id: 'pg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        clienteId: c.id,
        monto: monto,
        periodo: state.periodoActual,
        fecha: fechaStr
    });

    const nuevoRestante = calcularMontoRestanteCliente(c.id);
    if (nuevoRestante <= 0.009) {
        c.pagado_en_periodo = true;
    }

    guardarEnLocalStorage();
    cerrarModalAbono();
    if (onAbonoRegistradoCallback) onAbonoRegistradoCallback(c);
    showToast(`¡Abono de $${monto.toFixed(2)} registrado para ${c.nombre}!`);
}
