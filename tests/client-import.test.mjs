// Ejecutar: node --test tests/client-import.test.mjs (Node 18+)
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// El proyecto no usa package.json: importar el módulo ESM sin cambiar su configuración.
const source = await readFile(new URL('../js/clientImport.js', import.meta.url), 'utf8');
const { normalizarNumeroOrden, claveNumeroOrden, planificarImportacionClientes, compararClientesPorNumero } =
    await import('data:text/javascript;charset=utf-8,' + encodeURIComponent(source));

test('conserva ceros iniciales y reconoce números equivalentes', () => {
    assert.equal(normalizarNumeroOrden('001'), '001');
    assert.equal(claveNumeroOrden('001'), claveNumeroOrden('1'));
    assert.equal(normalizarNumeroOrden('000'), '000');
    assert.equal(normalizarNumeroOrden('12.1'), null);
    assert.equal(normalizarNumeroOrden(-2), null);
});

test('se extraen solo number y name; paused y sueldo nunca pasan al cliente', () => {
    const plan = planificarImportacionClientes([
        { number: '001', name: 'Ana Ejemplo', paused: true, sueldo: '900', position: 'Operador' },
        { number: '005', name: 'Luis Ejemplo', paused: false }
    ]);
    assert.deepEqual(plan.nuevos, [
        { numeroOrden: '001', nombre: 'Ana Ejemplo' },
        { numeroOrden: '005', nombre: 'Luis Ejemplo' }
    ]);
    assert.equal(plan.omitidos.length, 0);
});

test('se omiten números equivalentes existentes y repetidos en la misma lista', () => {
    const plan = planificarImportacionClientes([
        { number: '001', name: 'Persona A' },
        { number: '002', name: 'Persona B' },
        { number: '2', name: 'Persona C' },
        { number: '003', name: 'Persona D' },
    ], [{ numeroOrden: '1', nombre: 'Persona antigua' }]);
    assert.deepEqual(plan.nuevos.map(c => c.numeroOrden), ['002', '003']);
    assert.equal(plan.omitidos.length, 2);
    assert(plan.omitidos.every(x => x.motivo.includes('Número')));
});

test('no se fusionan dos personas con el mismo nombre si tienen números distintos', () => {
    const plan = planificarImportacionClientes([
        { number: '114', name: 'Nombre Coincidente' },
        { number: '120', name: 'Nombre Coincidente' }
    ]);
    assert.equal(plan.nuevos.length, 2);
});

test('filas inválidas se omiten y el formato ajeno se rechaza', () => {
    const plan = planificarImportacionClientes([
        { number: '004', name: 'Cliente válido' },
        { number: 'abc', name: 'No válido' },
        { number: '005', name: '' },
        { name: 'Sin número' },
        null,
        { number: '006', name: '<script>alert(1)</script>' },
    ]);
    assert.equal(plan.nuevos.length, 1);
    assert.equal(plan.omitidos.length, 5);
    assert.throws(() => planificarImportacionClientes({ clientes: [] }), /lista JSON/);
});

test('permite objeto employees y coloca la lista en orden numérico', () => {
    const plan = planificarImportacionClientes({ employees: [
        { number: '100', name: 'C' }, { number: '005', name: 'A' },
        { number: '34', name: 'B' }
    ] });
    assert.equal(plan.nuevos.length, 3);
    const sorted = [
        { numeroOrden: '100', nombre: 'C' }, { numeroOrden: '005', nombre: 'A' },
        { numeroOrden: '34', nombre: 'B' }, { nombre: 'Sin número' }
    ].sort(compararClientesPorNumero);
    assert.deepEqual(sorted.map(c => c.numeroOrden || '-'), ['005','34','100','-']);
});
