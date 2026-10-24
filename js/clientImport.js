// Importador independiente de nóminas/listas externas.
// Solo se leen number y name; nunca se incorporan sueldo, position ni paused.
const MAX_FILAS = 10000;
const MAX_NUMERO = 32;
const MAX_NOMBRE = 160;

export function normalizarNumeroOrden(value) {
    if (typeof value === 'number') {
        if (!Number.isSafeInteger(value) || value < 0) return null;
        return String(value);
    }
    if (typeof value !== 'string') return null;
    const numero = value.trim();
    return numero.length > 0 && numero.length <= MAX_NUMERO && /^\d+$/.test(numero)
        ? numero : null;
}

// Mismo número lógico: "001", "01" y "1". Conservar el original para mostrarlo.
export function claveNumeroOrden(value) {
    const numero = normalizarNumeroOrden(value);
    return numero === null ? null : numero.replace(/^0+(?=\d)/, '');
}

function claveNombre(nombre) {
    return String(nombre || '').normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
}

function obtenerFilas(data) {
    if (Array.isArray(data)) return data;
    if (data && typeof data === 'object') {
        for (const key of ['employees', 'empleados', 'personal']) {
            if (Array.isArray(data[key])) return data[key];
        }
    }
    throw new Error('Se espera una lista JSON de objetos con number y name.');
}

export function planificarImportacionClientes(data, clientesExistentes = []) {
    const filas = obtenerFilas(data);
    if (filas.length > MAX_FILAS) throw new Error('El archivo excede el máximo de 10,000 registros.');
    const numerosUsados = new Set(clientesExistentes.map(c => claveNumeroOrden(c.numeroOrden)).filter(c => c !== null));
    const nombresUsados = new Set(clientesExistentes.map(c => claveNombre(c.nombre)).filter(Boolean));
    const nuevos = [];
    const omitidos = [];

    filas.forEach((fila, index) => {
        const numeroOrden = fila && typeof fila === 'object'
            ? normalizarNumeroOrden(fila.number) : null;
        const nombre = fila && typeof fila.name === 'string'
            ? fila.name.trim().replace(/\s+/g, ' ') : '';
        const clave = claveNumeroOrden(numeroOrden);
        let motivo = null;
        if (numeroOrden === null) motivo = 'Número inválido o ausente';
        else if (!nombre || nombre.length > MAX_NOMBRE || /[\u0000-\u001F\u007F]/.test(nombre))
            motivo = 'Nombre inválido o ausente';
        else if (numerosUsados.has(clave)) motivo = 'Número de orden repetido';
        else if (nombresUsados.has(claveNombre(nombre))) motivo = 'Nombre ya existente o repetido';

        if (motivo) {
            omitidos.push({ fila: index + 1, numeroOrden: numeroOrden || '', nombre, motivo });
            return;
        }

        // Únicamente los dos campos solicitados; resto del JSON se descarta.
        nuevos.push({ numeroOrden, nombre });
        numerosUsados.add(clave);
        nombresUsados.add(claveNombre(nombre));
    });

    return { total: filas.length, nuevos, omitidos };
}

export function compararClientesPorNumero(a, b) {
    const an = claveNumeroOrden(a.numeroOrden);
    const bn = claveNumeroOrden(b.numeroOrden);
    if (an === null && bn !== null) return 1;
    if (bn === null && an !== null) return -1;
    if (an !== null && bn !== null) {
        if (an.length !== bn.length) return an.length - bn.length;
        if (an !== bn) return an < bn ? -1 : 1;
    }
    return String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' });
}
