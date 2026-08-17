// js/modals/modalConfirm.js - Diálogo genérico de confirmación
let confirmCallback = null;

export function initModalConfirm() {
    if (document.getElementById('modal-confirm')) return;

    const modal = document.createElement('div');
    modal.id = 'modal-confirm';
    modal.className = 'fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 hidden';
    modal.innerHTML = `
        <div class="bg-white w-full max-w-sm rounded-3xl p-6 space-y-4 shadow-2xl border border-m3-outlineVariant/30 animate-in fade-in zoom-in-95 duration-150">
            <div class="flex items-center space-x-2.5 text-m3-primary" id="confirm-icon-container">
                <i data-lucide="alert-triangle" class="w-6 h-6"></i>
                <h3 class="text-lg font-bold text-m3-onSurface" id="confirm-title">¿Estás seguro?</h3>
            </div>
            <p class="text-sm text-m3-onSurfaceVariant" id="confirm-message">Esta acción no se puede deshacer.</p>
            <div class="flex space-x-2 pt-2">
                <button type="button" id="btn-confirm-cancel" class="flex-1 py-3 text-sm font-semibold rounded-full border border-m3-outlineVariant text-m3-onSurface hover:bg-m3-surface active:scale-95 transition-all cursor-pointer">Cancelar</button>
                <button type="button" id="btn-confirm-ok" class="flex-1 py-3 text-sm font-semibold rounded-full bg-m3-primary text-white hover:bg-m3-primary/95 active:scale-95 transition-all cursor-pointer">Aceptar</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    document.getElementById('btn-confirm-cancel').addEventListener('click', cerrarModalConfirm);
    document.getElementById('btn-confirm-ok').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        cerrarModalConfirm();
    });
}

export function customConfirm(titulo, mensaje, onConfirm, icon = 'alert-triangle') {
    confirmCallback = onConfirm;
    document.getElementById('confirm-title').innerText = titulo;
    document.getElementById('confirm-message').innerText = mensaje;
    
    const iconContainer = document.getElementById('confirm-icon-container');
    if (iconContainer) {
        iconContainer.innerHTML = `<i data-lucide="${icon}" class="w-6 h-6"></i><h3 class="text-lg font-bold text-m3-onSurface" id="confirm-title">${titulo}</h3>`;
    }

    document.getElementById('modal-confirm').classList.remove('hidden');
    if (window.lucide) window.lucide.createIcons();
}

export function cerrarModalConfirm() {
    const modal = document.getElementById('modal-confirm');
    if (modal) modal.classList.add('hidden');
    confirmCallback = null;
}
