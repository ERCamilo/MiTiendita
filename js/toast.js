// js/toast.js - Sistema de Notificaciones Flotantes

export function initToastContainer() {
    if (!document.getElementById('toast-container')) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 space-y-2 pointer-events-none w-11/12 max-w-xs';
        document.body.appendChild(container);
    }
}

export function showToast(mensaje, esError = false) {
    initToastContainer();
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `p-3.5 rounded-2xl shadow-xl text-center text-xs font-bold flex items-center justify-center space-x-2 transition-all duration-300 translate-y-4 opacity-0 scale-90 ${
        esError ? 'bg-m3-errorContainer text-m3-onErrorContainer' : 'bg-[#313033] text-[#F4EFF4]'
    }`;
    toast.innerHTML = `
        <i data-lucide="${esError ? 'alert-triangle' : 'info'}" class="w-4 h-4"></i>
        <span>${mensaje}</span>
    `;
    container.appendChild(toast);
    if (window.lucide) window.lucide.createIcons();

    setTimeout(() => {
        toast.classList.remove('translate-y-4', 'opacity-0', 'scale-90');
    }, 10);

    setTimeout(() => {
        toast.classList.add('opacity-0', 'scale-90');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}
