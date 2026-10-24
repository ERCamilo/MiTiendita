import 'fake-indexeddb/auto';
import test from 'node:test';
import assert from 'node:assert/strict';

function openLegacyDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('storeflow_db', 1);
        request.onupgradeneeded = () => {
            const db = request.result;
            for (const name of ['config', 'clientes', 'productos', 'ventas', 'pagos', 'historicoCierres']) {
                db.createObjectStore(name, { keyPath: name === 'config' ? 'key' : 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

test('HU05: upgrade IndexedDB v1→v2 preserva clientes, saldos y pagos', async () => {
    const old = await openLegacyDB();
    await new Promise((resolve, reject) => {
        const t = old.transaction(['config', 'clientes', 'pagos'], 'readwrite');
        t.objectStore('config').put({ key: 'nombreTienda', value: 'Negocio antiguo' });
        t.objectStore('clientes').put({
            id: 'c1', nombre: 'Cliente anterior', deuda_anterior: 110
        });
        t.objectStore('pagos').put({
            id: 'pg1', clienteId: 'c1', monto: 20, periodo: 1
        });
        t.oncomplete = resolve;
        t.onabort = () => reject(t.error);
    });
    old.close();

    const { loadAllState, saveState } = await import('../js/db.js');
    const state = await loadAllState();
    assert.equal(state.nombreTienda, 'Negocio antiguo');
    assert.equal(state.clientes[0].deuda_anterior, 110);
    assert.equal(state.pagos[0].monto, 20);
    assert.deepEqual(state.gastos, []);
    state.gastos.push({ id: 'g1', categoria: 'otros', monto: 5, periodo: 1 });
    await saveState(state);
    assert.equal((await loadAllState()).gastos.length, 1);
});
