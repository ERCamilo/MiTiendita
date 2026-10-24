// Importa de forma local un JSON de empleados/lista de personas como clientes.
import { state, anexarClientesImportados } from '../state.js';
import { planificarImportacionClientes } from '../clientImport.js';
import { showToast } from '../toast.js';

let datos = null;
let onImportados = null;
let ocupado = false;
const get = id => document.getElementById(id);

function limpiarVista() {
    datos = null;
    get('clientes-import-preview').classList.add('hidden');
    get('clientes-import-error').textContent = '';
    get('clientes-import-confirm').disabled = true;
}

function mostrarVista(plan) {
    const vista = get('clientes-import-preview');
    vista.classList.remove('hidden');
    get('clientes-import-resumen').textContent =
        plan.total + ' registros · ' + plan.nuevos.length + ' nuevos · ' + plan.omitidos.length + ' omitidos';
    const lista = get('clientes-import-lista');
    lista.replaceChildren();
    for (const item of plan.nuevos.slice(0, 10)) {
        const row = document.createElement('li');
        row.className = 'p-2 rounded-xl bg-white border border-gray-200 text-sm';
        row.textContent = '#' + item.numeroOrden + ' · ' + item.nombre;
        lista.appendChild(row);
    }
    if (plan.nuevos.length > 10) {
        const more = document.createElement('li');
        more.textContent = 'Y ' + (plan.nuevos.length - 10) + ' clientes más...';
        lista.appendChild(more);
    }
    const errores = get('clientes-import-omitidos');
    errores.replaceChildren();
    for (const item of plan.omitidos.slice(0, 12)) {
        const row = document.createElement('p');
        row.textContent = 'Fila ' + item.fila + ' (' + (item.numeroOrden || '?') +
            ', ' + (item.nombre || 'sin nombre') + '): ' + item.motivo;
        row.className = 'text-xs text-amber-900';
        errores.appendChild(row);
    }
    if (plan.omitidos.length > 12) {
        const more = document.createElement('p');
        more.textContent = 'Y ' + (plan.omitidos.length - 12) + ' omitidos más...';
        errores.appendChild(more);
    }
    const button = get('clientes-import-confirm');
    button.disabled = !plan.nuevos.length;
    button.textContent = 'Importar ' + plan.nuevos.length + ' clientes';
}

function analizar() {
    limpiarVista();
    const source = get('clientes-import-json').value;
    if (!source.trim()) {
        get('clientes-import-error').textContent = 'Pega el JSON o elige un archivo.';
        return;
    }
    if (new Blob([source]).size > 2_000_000) {
        get('clientes-import-error').textContent = 'El contenido supera los 2 MB permitidos.';
        return;
    }
    try {
        datos = JSON.parse(source);
        mostrarVista(planificarImportacionClientes(datos, state.clientes));
    } catch (error) {
        datos = null;
        get('clientes-import-error').textContent = error instanceof SyntaxError
            ? 'El texto no es JSON válido.' : error.message;
    }
}

async function seleccionarArchivo(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    limpiarVista();
    if (file.size > 2_000_000) {
        get('clientes-import-error').textContent = 'Máximo 2 MB por archivo.';
        return;
    }
    try {
        let content;
        if (file.text) content = await file.text();
        else content = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        });
        get('clientes-import-json').value = content;
        analizar();
    } catch (error) {
        console.error('[importar-clientes] Error de lectura:', error);
        get('clientes-import-error').textContent = 'No se pudo leer el archivo.';
    }
}

async function confirmar() {
    if (ocupado || !datos) return;
    ocupado = true;
    get('clientes-import-confirm').disabled = true;
    try {
        // Revisar de nuevo los duplicados contra el estado actual.
        const plan = planificarImportacionClientes(datos, state.clientes);
        if (!plan.nuevos.length) {
            mostrarVista(plan);
            showToast('No hay clientes nuevos en esta lista.');
            return;
        }
        const total = await anexarClientesImportados(plan.nuevos);
        ocupado = false;
        cerrarModalImportarClientes();
        onImportados?.();
        showToast('Se importaron ' + total + ' clientes nuevos.');
    } catch (error) {
        console.error('[importar-clientes] Error guardando:', error);
        get('clientes-import-error').textContent = 'No se pudo guardar la lista. No se modificaron los clientes existentes.';
    } finally {
        ocupado = false;
    }
}

export function initModalImportarClientes(callback) {
    onImportados = callback;
    if (get('modal-importar-clientes')) return;
    const modal = document.createElement('div');
    modal.id = 'modal-importar-clientes';
    modal.className = 'hidden fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4';
    modal.innerHTML = `
        <section role="dialog" aria-modal="true" aria-labelledby="clientes-import-title"
            class="bg-white rounded-3xl w-full max-w-lg p-5 space-y-3 max-h-[92vh] overflow-y-auto shadow-xl">
            <div class="flex justify-between items-start gap-2">
                <div>
                    <h2 id="clientes-import-title" class="text-lg font-bold text-gray-900">Importar clientes desde JSON</h2>
                    <p class="text-xs text-gray-600 mt-1">Solo se toman <code>number</code> y <code>name</code>.</p>
                </div>
                <button id="clientes-import-close" type="button" aria-label="Cerrar" class="w-11 h-11 rounded-xl bg-gray-100 shrink-0">✕</button>
            </div>
            <p class="text-xs bg-orange-50 p-3 rounded-xl text-gray-700">
                Ejemplo: <code>[{"number":"001","name":"Cliente de ejemplo"}]</code><br>
                Los números 001 y 1 son equivalentes para detectar duplicados. Se ignoran sueldo, puesto y pausas.
            </p>
            <button id="clientes-import-file-button" type="button" class="w-full min-h-11 rounded-xl bg-m3-primary text-white font-bold p-3 text-sm">Elegir archivo JSON</button>
            <input id="clientes-import-file" type="file" accept=".json,application/json" class="hidden">
            <label for="clientes-import-json" class="block font-bold text-sm text-gray-800">O pegar el contenido del JSON</label>
            <textarea id="clientes-import-json" rows="4" spellcheck="false" class="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono" placeholder='[{"number":"001","name":"Cliente de ejemplo"}]'></textarea>
            <button id="clientes-import-analizar" type="button" class="w-full min-h-11 rounded-xl bg-gray-100 text-gray-800 font-bold p-3 text-sm">Verificar y previsualizar</button>
            <p id="clientes-import-error" role="alert" class="text-red-700 text-xs" aria-live="polite"></p>
            <div id="clientes-import-preview" class="hidden space-y-3">
                <p id="clientes-import-resumen" class="text-sm font-bold text-gray-900" role="status"></p>
                <ul id="clientes-import-lista" class="max-h-44 overflow-y-auto space-y-1"></ul>
                <div id="clientes-import-omitidos" class="max-h-28 overflow-y-auto space-y-1"></div>
                <button id="clientes-import-confirm" disabled type="button" class="w-full min-h-11 p-3 rounded-xl bg-m3-primary text-white font-bold disabled:opacity-50">Importar clientes nuevos</button>
            </div>
            <p class="text-xs text-gray-600">Se añade solamente el número y el nombre, con saldo inicial cero. Nada se envía al repositorio. No sustituye el respaldo de datos.</p>
        </section>
`;
    document.body.appendChild(modal);
    get('clientes-import-close').addEventListener('click', cerrarModalImportarClientes);
    get('clientes-import-file-button').addEventListener('click', () => get('clientes-import-file').click());
    get('clientes-import-file').addEventListener('change', seleccionarArchivo);
    get('clientes-import-json').addEventListener('input', limpiarVista);
    get('clientes-import-analizar').addEventListener('click', analizar);
    get('clientes-import-confirm').addEventListener('click', confirmar);
    modal.addEventListener('click', event => {
        if (event.target === modal && !ocupado) cerrarModalImportarClientes();
    });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !ocupado) cerrarModalImportarClientes();
    });
}

export function abrirModalImportarClientes() {
    get('modal-importar-clientes')?.classList.remove('hidden');
    get('clientes-import-file-button')?.focus();
}

export function cerrarModalImportarClientes() {
    if (ocupado) return;
    get('modal-importar-clientes')?.classList.add('hidden');
    const textarea = get('clientes-import-json');
    if (textarea) textarea.value = '';
    limpiarVista();
}
