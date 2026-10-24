// js/db.js — Repository Layer: IndexedDB persistence with sync-ready schema
// Replace this single file to switch to Firebase / Supabase.

const DB_NAME = 'storeflow_db';
const DB_VERSION = 1;
const STORES = {
    config:           { keyPath: 'key' },
    clientes:         { keyPath: 'id', indices: ['nombre', '_syncStatus'] },
    productos:        { keyPath: 'id', indices: ['nombre', '_syncStatus'] },
    ventas:           { keyPath: 'id', indices: ['clienteId', 'productoId', 'periodo', '_syncStatus'] },
    pagos:            { keyPath: 'id', indices: ['clienteId', 'periodo', '_syncStatus'] },
    historicoCierres: { keyPath: 'id', indices: ['periodo'] },
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
    if (existingClientes.length === 0) {
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
    };
}

/**
 * Persist the entire in-memory state to IndexedDB.
 * Uses a single transaction per store for performance.
 */
export async function saveState(state) {
    await openDB();

    // Save config as key-value pairs
    const configStore = tx('config', 'readwrite');
    CONFIG_KEYS.forEach(key => {
        configStore.put({ key, value: state[key] });
    });

    // Save entity arrays (clear + re-put for simplicity and consistency)
    const entityStores = ['clientes', 'productos', 'ventas', 'pagos', 'historicoCierres'];
    for (const name of entityStores) {
        await clearStore(name);
        const records = state[name] || [];
        if (records.length > 0) {
            await putAllRecords(name, records);
        }
    }
}

/**
 * Clear all stores (factory reset).
 */
export async function clearAllStores() {
    await openDB();
    const allStores = Object.keys(STORES);
    for (const name of allStores) {
        await clearStore(name);
    }
}

// ─── Backup Export / Import ───────────────────────────────────────────

/**
 * Export entire DB as a plain JSON-serializable object.
 */
export async function exportarTodo() {
    return loadAllState();
}

/**
 * Import data from a backup object, overwriting all stores.
 */
export async function importarTodo(data) {
    await openDB();
    await clearAllStores();

    // Config
    const configStore = tx('config', 'readwrite');
    CONFIG_KEYS.forEach(key => {
        if (data[key] !== undefined) {
            configStore.put({ key, value: data[key] });
        }
    });

    // Entities
    const entityStores = ['clientes', 'productos', 'ventas', 'pagos', 'historicoCierres'];
    for (const name of entityStores) {
        const records = data[name] || [];
        if (records.length > 0) {
            const enriched = records.map(r => withSyncMeta(r, !r.createdAt));
            await putAllRecords(name, enriched);
        }
    }
}

// ─── localStorage Migration ──────────────────────────────────────────

async function migrarDesdeLocalStorage() {
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
