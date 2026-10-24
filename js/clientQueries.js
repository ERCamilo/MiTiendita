// Consultas de clientes independientes de la interfaz: HU02.
export function normalizarBusqueda(texto) {
    return String(texto ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim().toLocaleLowerCase('es');
}

export function buscarClientes(clientes, termino, { max = 1000 } = {}) {
    const q = normalizarBusqueda(termino);
    if (!q) return [...clientes].slice(0, max);
    return clientes.filter(c =>
        !c._deleted && [c.nombre, c.telefono, c.numeroOrden]
            .some(v => normalizarBusqueda(v).includes(q))).slice(0, max);
}

export function ordenarPorSaldo(clientes, saldoDe) {
    return [...clientes].sort((a, b) =>
        saldoDe(b) - saldoDe(a) ||
        String(a.nombre || '').localeCompare(String(b.nombre || ''), 'es', { sensitivity: 'base' }));
}

export function movimientosCronologicos({ ventas = [], pagos = [] }, clienteId) {
    const de = registro => registro.clienteId === clienteId && !registro._deleted;
    const fecha = registro => Date.parse(registro.fechaIso || registro.createdAt || '') || 0;
    return [
        ...ventas.filter(de).map(v => ({ tipo: 'pedido', registro: v, instante: fecha(v) })),
        ...pagos.filter(de).map(p => ({ tipo: 'pago', registro: p, instante: fecha(p) }))
    ].sort((a, b) => a.instante - b.instante);
}
