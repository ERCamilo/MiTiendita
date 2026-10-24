// js/db.js — Repository Layer: IndexedDB persistence with sync-ready schema
// Replace this single file to switch to Firebase / Supabase.

const DB_NAME = 'storeflow_db';
const DB_VERSION = 2;
const STORES = {
    config:           { keyPath: 'key' },
    clientes:         { keyPath: 'id', indices: ['nombre', '_syncStatus'] },
    productos:        { keyPath: 'id', indices: ['nombre', '_syncStatus'] },
    ventas:           { keyPath: 'id', indices: ['clienteId', 'productoId', 'periodo', '_syncStatus'] },
    pagos:            { keyPath: 'id', indices: ['clienteId', 'periodo', '_syncStatus'] },
    historicoCierres: { keyPath: 'id', indices: ['periodo'] },
    gastos:           { keyPath: 'id', indices: ['periodo', 'categoria', '_syncStatus'] },
};

let dbInstance = null;

// ─── Open / Create Database ───────────────────────────────────────────

function openDB() {
    if (dbInstance) return Promise.resolve(dbInstance);

    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            Object.entries(STORES).forEach(([name, opts]) => {
                if (!db.objectStoreNames.contains(name)) {
                    const store = db.createObjectStore(name, { keyPath: opts.keyPath });
                    if (opts.indices) {
                        opts.indices.forEach(idx => {
                            store.createIndex(idx, idx, { unique: false });
                        });
                    }
                }
            });
        };

        request.onsuccess = (event) => {
            dbInstance = event.target.result;
            dbInstance.onversionchange = () => {
                dbInstance.close();
                dbInstance = null;
            };
            resolve(dbInstance);
        };

        request.onerror = (event) => {
            console.error('IndexedDB open error:', event.target.error);
            reject(event.target.error);
        };
    });
}

// ─── Low-level CRUD ───────────────────────────────────────────────────

function tx(storeName, mode = 'readonly') {
    return dbInstance.transaction(storeName, mode).objectStore(storeName);
}

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function getAll(storeName) {
    await openDB();
    return promisifyRequest(tx(storeName).getAll());
}

async function putRecord(storeName, record) {
    await openDB();
    return promisifyRequest(tx(storeName, 'readwrite').put(record));
}

async function putAllRecords(storeName, records) {
    await openDB();
    const store = tx(storeName, 'readwrite');
    const promises = records.map(r => promisifyRequest(store.put(r)));
    return Promise.all(promises);
}

async function clearStore(storeName) {
    await openDB();
    return promisifyRequest(tx(storeName, 'readwrite').clear());
}

// ─── Sync Metadata Helpers ────────────────────────────────────────────

const ISO_NOW = () => new Date().toISOString();

export function withSyncMeta(record, isNew = true) {
    const now = ISO_NOW();
    return {
        ...record,
        createdAt:     isNew ? now : (record.createdAt || now),
        updatedAt:     now,
        _syncStatus:   record._syncStatus || 'pending',
        _lastSyncedAt: record._lastSyncedAt || null,
        _deleted:      record._deleted || false,
    };
}

export function stampUpdated(record) {
    return { ...record, updatedAt: ISO_NOW(), _syncStatus: 'pending' };
}

// ─── High-level State I/O ─────────────────────────────────────────────

const CONFIG_KEYS = ['nombreTienda', 'simboloMoneda', 'colorTema', 'periodoActual', 'gastosOperativos'];

/**
 * Load the entire app state from IndexedDB into a plain object.
 * Falls back to localStorage migration if IndexedDB is empty.
 */
export async function loadAllState() {
    await openDB();

    // Check if we need to migrate from localStorage
    const existingClientes = await getAll('clientes');
    const previousConfig = await getAll('config');
    if (existingClientes.length === 0 && previousConfig.length === 0) {
        const migrated = await migrarDesdeLocalStorage();
        if (migrated) {
            return loadAllState(); // re-read after migration
        }
    }

    // Load config
    const configRecords = await getAll('config');
    const config = {};
    configRecords.forEach(r => { config[r.key] = r.value; });

    return {
        nombreTienda:     config.nombreTienda     || 'StoreFlow',
        simboloMoneda:    config.simboloMoneda     || '$',
        colorTema:        config.colorTema         || 'azul',
        periodoActual:    config.periodoActual     || 1,
        gastosOperativos: config.gastosOperativos  || 0,
        clientes:         await getAll('clientes'),
        productos:        await getAll('productos'),
        ventas:           await getAll('ventas'),
        pagos:            await getAll('pagos'),
        historicoCierres: await getAll('historicoCierres'),
        gastos:           await getAll('gastos'),
    };
}

// All writes in this section are one transaction, including configurations.
// An abort leaves all previous records intact; no partial clear/rewrite.
const ENTITIES = ['clientes', 'productos', 'ventas', 'pagos', 'historicoCierres', 'gastos'];

function writeTransaction(mutator) {
    return openDB().then(db => new Promise((resolve, reject) => {
        const transaction = db.transaction(Object.keys(STORES), 'readwrite');
        transaction.oncomplete = () => resolve();
        transaction.onabort = () => reject(transaction.error || new Error('Transacción cancelada'));
        transaction.onerror = () => { /* onabort rejects; do not resolve on request success */ };
        try { mutator(transaction); }
        catch (error) {
            transaction.abort();
            reject(error);
        }
    }));
}

export async function saveState(state) {
    // Snapshot before any asynchronous operation.
    const config = CONFIG_KEYS.map(key => ({ key, value: state[key] }));
    const contents = Object.fromEntries(ENTITIES.map(key => [key, (typeof structuredClone === 'function' ? structuredClone(state[key] || []) : JSON.parse(JSON.stringify(state[key] || [])))]));
    await writeTransaction(transaction => {
        const configStore = transaction.objectStore('config');
        configStore.clear();
        config.forEach(record => configStore.put(record));
        for (const name of ENTITIES) {
            const store = transaction.objectStore(name);
            store.clear();
            contents[name].forEach(record => store.put(record));
        }
    });
}

/** Remove everything atomically for explicit factory reset. */
export function clearAllStores() {
    return writeTransaction(transaction => {
        Object.keys(STORES).forEach(name => transaction.objectStore(name).clear());
    });
}

// ─── Backup Export / Import ────────────────────────────────────────────

export async function exportarTodo() {
    return loadAllState();
}

/** Restore the entire backup atomically; malformed records abort all changes. */
export async function importarTodo(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.clientes) ||
        !Array.isArray(data.productos)) {
        throw new Error('Formato de copia no válido');
    }
    const contents = Object.fromEntries(ENTITIES.map(key => {
        const rows = data[key] || [];
        if (!Array.isArray(rows)) throw new Error('Lista inválida: ' + key);
        return [key, rows.map(record => withSyncMeta(record, !record.createdAt))];
    }));
    await writeTransaction(transaction => {
        for (const name of Object.keys(STORES)) transaction.objectStore(name).clear();
        const configStore = transaction.objectStore('config');
        CONFIG_KEYS.forEach(key => {
            if (data[key] !== undefined) configStore.put({ key, value: data[key] });
        });
        ENTITIES.forEach(key => {
            const store = transaction.objectStore(key);
            contents[key].forEach(record => store.put(record));
        });
    });
}

// ─── localStorage Migration ──────────────────────────────────────────

async function migrarDesdeLocalStorage() {
    if (typeof localStorage === 'undefined') return false;
    const raw = localStorage.getItem('storeflow_ledger_state_v2');
    if (!raw) return false;

    try {
        const parsed = JSON.parse(raw);
        console.log('[db.js] Migrating from localStorage to IndexedDB...');

        // Enrich records with sync metadata
        const enrich = (arr) => (arr || []).map(r => withSyncMeta(r, !r.createdAt));

        await importarTodo({
            nombreTienda:     parsed.nombreTienda     || 'StoreFlow',
            simboloMoneda:    parsed.simboloMoneda     || '$',
            colorTema:        parsed.colorTema         || 'azul',
            periodoActual:    parsed.periodoActual     || 1,
            gastosOperativos: parsed.gastosOperativos  || 0,
            clientes:         enrich(parsed.clientes),
            productos:        enrich(parsed.productos),
            ventas:           enrich(parsed.ventas),
            pagos:            enrich(parsed.pagos),
            historicoCierres: enrich(parsed.historicoCierres),
            gastos:           enrich(parsed.gastos),
        });

        // Remove old localStorage key after successful migration
        localStorage.removeItem('storeflow_ledger_state_v2');
        console.log('[db.js] Migration complete. localStorage key removed.');
        return true;
    } catch (e) {
        console.error('[db.js] Migration from localStorage failed:', e);
        return false;
    }
}

/**
 * Añade solamente clientes nuevos, en una única transacción atómica de IndexedDB.
 * No borra clientes, productos, ventas, pagos ni configuraciones existentes.
 */
export async function agregarClientesEnLote(clientes) {
    if (!Array.isArray(clientes) || !clientes.length) return;
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction('clientes', 'readwrite');
        const store = transaction.objectStore('clientes');
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error || new Error('Fallo al guardar clientes.'));
        transaction.onabort = () => reject(transaction.error || new Error('Importación cancelada por IndexedDB.'));
        for (const cliente of clientes) store.add(cliente);
    });
}

// ─── Individual Record Operations (for future granular sync) ─────────

export async function upsertRecord(storeName, record) {
    const enriched = withSyncMeta(record, !record.createdAt);
    await putRecord(storeName, enriched);
    return enriched;
}

export async function softDeleteRecord(storeName, id) {
    await openDB();
    const store = tx(storeName, 'readwrite');
    const existing = await promisifyRequest(store.get(id));
    if (existing) {
        existing._deleted = true;
        existing._syncStatus = 'pending';
        existing.updatedAt = ISO_NOW();
        await promisifyRequest(tx(storeName, 'readwrite').put(existing));
    }
}

export async function getByIndex(storeName, indexName, value) {
    await openDB();
    const store = tx(storeName);
    const index = store.index(indexName);
    return promisifyRequest(index.getAll(value));
}

export async function getPendingSync(storeName) {
    return getByIndex(storeName, '_syncStatus', 'pending');
}
