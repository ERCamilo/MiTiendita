import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
    clearAllStores, saveState, loadAllState, importarTodo, exportarTodo
} from '../js/db.js';
import {
    state, registrarPedidoConfirmado, registrarAbonoConfirmado,
    calcularMontoRestanteCliente, cerrarPeriodoConfirmado, registrarGasto,
    registrarPedidoConfirmado as registrarPedido, calcularConsumoCliente,
    exportarTodo as respaldoConfirmado, reducirVentaRapida
} from '../js/state.js';
import { buscarClientes, ordenarPorSaldo, movimientosCronologicos } from '../js/clientQueries.js';

const cliente = () => ({
    id: 'c1', nombre: 'Ana Sánchez', telefono: '8091234567',
    numeroOrden: '001', deuda_anterior: 40, pagado_en_periodo: false
});
const producto = () => ({ id: 'p1', nombre: 'Plato', precio: 100, costo: 45 });

beforeEach(async () => {
    await clearAllStores();
    Object.assign(state, {
        nombreTienda: 'Pruebas', simboloMoneda: '$', colorTema: 'coral',
        periodoActual: 1, gastosOperativos: 0, gastos: [],
        clientes: [cliente()], productos: [producto()], ventas: [], pagos: [], historicoCierres: []
    });
    await saveState(state);
});

test('HU01: pedidos conservan precio y costo del momento de la venta', async () => {
    const total = await registrarPedidoConfirmado('c1', [{ productoId: 'p1', cantidad: 2 }]);
    assert.equal(total, 200);
    assert.equal(calcularMontoRestanteCliente('c1'), 240);
    assert.equal(state.ventas[0].precioUnitario, 100);
    assert.equal(state.ventas[0].costoUnitario, 45);
    state.productos[0].precio = 999;
    assert.equal(calcularMontoRestanteCliente('c1'), 240);
    const data = await loadAllState();
    assert.equal(data.ventas.length, 1);
    assert.equal(data.ventas[0].precioUnitario, 100);
});

test('HU03: abono y estado de deuda persisten juntos, sin borrar deuda anterior', async () => {
    await registrarPedido('c1', [{ productoId: 'p1', cantidad: 1 }]);
    await registrarAbonoConfirmado('c1', 140);
    assert.equal(calcularMontoRestanteCliente('c1'), 0);
    assert.equal(state.clientes[0].deuda_anterior, 40);
    assert.equal(state.clientes[0].pagado_en_periodo, true);
    const data = await loadAllState();
    assert.equal(data.pagos.length, 1);
    assert.equal(data.pagos[0].monto, 140);
    assert.equal(data.clientes[0].deuda_anterior, 40);
    await assert.rejects(registrarAbonoConfirmado('c1', 1), /Abono inválido/);
    assert.equal((await loadAllState()).pagos.length, 1);
});

test('HU03: guardado íntegro; un registro inválido revierte toda la transacción', async () => {
    const anterior = await loadAllState();
    const dañado = { ...anterior, nombreTienda: 'No debería guardarse',
        clientes: [{ nombre: 'Sin id' }] };
    await assert.rejects(saveState(dañado));
    const luego = await loadAllState();
    assert.deepEqual(luego.clientes, anterior.clientes);
    assert.equal(luego.nombreTienda, anterior.nombreTienda);
});

test('HU03/HU05: restauración malformada no pierde los registros actuales', async () => {
    await assert.rejects(importarTodo({
        nombreTienda: 'Borrado', clientes: [{ nombre: 'sin id' }], productos: []
    }));
    assert.equal((await loadAllState()).clientes[0].nombre, 'Ana Sánchez');
    assert.equal((await loadAllState()).nombreTienda, 'Pruebas');
});

test('HU04: gasto categorizado, respaldo y total son coherentes', async () => {
    await registrarGasto(150, 'transporte', 'Envío');
    await registrarGasto(30, 'empaques', 'Bolsas');
    assert.equal(state.gastosOperativos, 180);
    assert.equal(state.gastos.length, 2);
    const respaldo = await respaldoConfirmado();
    assert.equal(respaldo.gastos.length, 2);
    assert.equal(respaldo.gastosOperativos, 180);
    assert.deepEqual(respaldo.gastos.map(x => x.categoria).sort(), ['empaques', 'transporte']);
});

test('HU01/HU03/HU04: cierre conserva deuda y deja ventas y gastos en su período', async () => {
    await registrarPedido('c1', [{ productoId: 'p1', cantidad: 2 }]);
    await registrarAbonoConfirmado('c1', 50);
    await registrarGasto(20, 'insumos');
    assert.equal(calcularMontoRestanteCliente('c1'), 190);
    assert.equal(await cerrarPeriodoConfirmado(), 1);
    assert.equal(state.periodoActual, 2);
    assert.equal(calcularMontoRestanteCliente('c1'), 190);
    assert.equal(state.gastosOperativos, 0);
    assert.equal(state.gastos[0].periodo, 1);
    assert.equal(state.historicoCierres[0].gananciaNeta, '90.00');
    assert.equal((await loadAllState()).periodoActual, 2);
});

test('HU01: reducir consumo retorna el estado y lo persiste', async () => {
    await registrarPedido('c1', [{ productoId: 'p1', cantidad: 2 }]);
    assert.equal(await reducirVentaRapida('c1', 'p1'), true);
    assert.equal(calcularConsumoCliente('c1'), 100);
    assert.equal((await loadAllState()).ventas[0].cantidad, 1);
    assert.equal(await reducirVentaRapida('c1', 'p1'), true);
    assert.equal((await loadAllState()).ventas.length, 0);
});

test('HU02: búsqueda sin tildes, orden por saldo y cronología', () => {
    const clientes = [cliente(), { id: 'c2', nombre: 'Jose Garcia', telefono: '8297654321', numeroOrden: '002' }];
    assert.equal(buscarClientes(clientes, 'sanchez')[0].id, 'c1');
    assert.equal(buscarClientes(clientes, '002')[0].id, 'c2');
    assert.equal(buscarClientes(clientes, '829')[0].id, 'c2');
    assert.deepEqual(ordenarPorSaldo(clientes, c => c.id === 'c1' ? 200 : 500).map(c => c.id),
        ['c2', 'c1']);
    assert.deepEqual(movimientosCronologicos({ ventas: [
        { clienteId: 'c1', fechaIso: '2026-10-24T12:00:00Z' }
    ], pagos: [
        { clienteId: 'c1', fechaIso: '2026-10-24T14:00:00Z' }
    ] }, 'c1').map(x => x.tipo), ['pedido', 'pago']);
});
