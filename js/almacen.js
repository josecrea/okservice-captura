// Guarda la sesión de captura en el propio móvil.
// Sin red no se pierde nada: el trabajo sigue y la subida espera.

const BASE = 'okservice-captura';
const ALMACEN = 'sesiones';
const VERSION = 1;

function abrir() {
  return new Promise((resolve, reject) => {
    const peticion = indexedDB.open(BASE, VERSION);
    peticion.onupgradeneeded = () => {
      const db = peticion.result;
      if (!db.objectStoreNames.contains(ALMACEN)) {
        db.createObjectStore(ALMACEN, { keyPath: 'id' });
      }
    };
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

function transaccion(db, modo, trabajo) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(ALMACEN, modo);
    const peticion = trabajo(tx.objectStore(ALMACEN));
    peticion.onsuccess = () => resolve(peticion.result);
    peticion.onerror = () => reject(peticion.error);
  });
}

export async function guardarSesion(sesion) {
  const db = await abrir();
  try {
    return await transaccion(db, 'readwrite', almacen => almacen.put(sesion));
  } finally {
    db.close();
  }
}

export async function leerSesion(id) {
  const db = await abrir();
  try {
    return await transaccion(db, 'readonly', almacen => almacen.get(id));
  } finally {
    db.close();
  }
}

export async function listarSesiones() {
  const db = await abrir();
  try {
    return await transaccion(db, 'readonly', almacen => almacen.getAll());
  } finally {
    db.close();
  }
}

export async function borrarSesion(id) {
  const db = await abrir();
  try {
    return await transaccion(db, 'readwrite', almacen => almacen.delete(id));
  } finally {
    db.close();
  }
}
