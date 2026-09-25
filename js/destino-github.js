// Las visitas a un repositorio PRIVADO de GitHub.
//
// Se sube por la API de datos de Git y no por la de contenidos: la de
// contenidos hace un commit por fichero, así que una visita de trece fotos
// entraría en catorce trozos y un corte de cobertura a la mitad dejaría en la
// oficina media visita que parece entera. Aquí es un commit o ninguno.

export function rutaDeVisita(sesion) {
  const fecha = new Date(sesion?.creada ?? Date.now());
  const anio = fecha.getUTCFullYear();
  const mes = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  // El identificador acaba siendo una ruta dentro del repositorio: un id que
  // fuese «..» subiría la visita un nivel por encima de su carpeta.
  const id = String(sesion?.id ?? '')
    .replace(/[^\w.-]/g, '-')
    .replace(/^\.+/, '');
  return `visitas/${anio}/${mes}/${id || 'visita'}`;
}

export function nombreDeFoto(clave) {
  return `${String(clave).replace(/[^\w.-]/g, '-')}.jpg`;
}

export function base64De(dataUri) {
  const coma = String(dataUri).indexOf(',');
  return coma === -1 ? '' : String(dataUri).slice(coma + 1);
}

// La sesión tal cual no se puede serializar: las fotos son Blobs y
// JSON.stringify los deja en «{}». Aquí cada foto se cambia por el nombre del
// fichero que la acompaña, que es lo que la oficina necesita para encontrarla.
export function sinFotos(sesion, tecnico = '', ilegibles = []) {
  const respuestas = {};
  for (const [clave, r] of Object.entries(sesion?.respuestas ?? {})) {
    const esFoto = r?.origen === 'foto' && r?.valor;
    if (!esFoto) {
      respuestas[clave] = r;
      continue;
    }
    // Apuntar un fichero que no se ha podido subir sería un JSON que miente:
    // la oficina buscaría una foto que no está y no sabría por qué.
    respuestas[clave] = ilegibles.includes(clave)
      ? { origen: 'foto', fichero: null, error: 'la foto no se pudo leer en el móvil', bytes: r.bytes ?? null }
      : { origen: 'foto', fichero: `fotos/${nombreDeFoto(clave)}`, bytes: r.bytes ?? null };
  }
  return {
    id: sesion?.id ?? '',
    guion: sesion?.guion ?? '',
    cliente: sesion?.cliente ?? '',
    creada: sesion?.creada ?? null,
    terminada: sesion?.terminada ?? null,
    gps: sesion?.gps ?? null,
    indice: sesion?.indice ?? 0,
    tecnico,
    subidaEl: new Date().toISOString(),
    respuestas
  };
}

export function ficherosDe(sesion, fotos = {}, tecnico = '', ilegibles = []) {
  const ruta = rutaDeVisita(sesion);
  const ficheros = [{
    ruta: `${ruta}/visita.json`,
    contenido: JSON.stringify(sinFotos(sesion, tecnico, ilegibles), null, 2),
    codificacion: 'utf-8'
  }];

  for (const [clave, dataUri] of Object.entries(fotos)) {
    ficheros.push({
      ruta: `${ruta}/fotos/${nombreDeFoto(clave)}`,
      contenido: base64De(dataUri),
      codificacion: 'base64'
    });
  }
  return ficheros;
}

const MENSAJES = {
  401: 'El testigo no vale o ha caducado. Vuelve a ponerlo en Ajustes.',
  403: 'GitHub ha rechazado la petición: revisa que el testigo tenga permiso de escritura sobre el repositorio.',
  404: 'No se encuentra el repositorio de datos. Revisa el nombre en Ajustes.',
  409: 'Otra subida se adelantó. Inténtalo otra vez.',
  422: 'GitHub ha rechazado el contenido de la subida.'
};

export class GitHubDestino {
  constructor({ repo, rama = 'main', testigo, tecnico } = {}, buscar) {
    this.repo = repo;
    this.rama = rama || 'main';
    this.testigo = testigo;
    this.tecnico = tecnico ?? '';
    // Inyectable para poder probar la secuencia entera sin red.
    this.buscar = buscar ?? ((...a) => fetch(...a));
  }

  configurado() {
    return Boolean(this.repo && this.testigo);
  }

  async api(ruta, opciones = {}, tolerar404 = false) {
    const respuesta = await this.buscar(`https://api.github.com/repos/${this.repo}${ruta}`, {
      ...opciones,
      headers: {
        Authorization: `Bearer ${this.testigo}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
        ...opciones.headers
      }
    });

    if (respuesta.status === 404 && tolerar404) return null;
    if (!respuesta.ok) {
      // El mensaje de GitHub es en inglés y habla de «refs» y «blobs». El
      // técnico necesita saber qué hacer, no qué parte de la API falló.
      throw new Error(MENSAJES[respuesta.status] ?? `GitHub respondió ${respuesta.status}.`);
    }
    return respuesta.status === 204 ? null : respuesta.json();
  }

  async comprobar() {
    if (!this.configurado()) return { ok: false, error: 'Faltan el repositorio o el testigo.' };
    try {
      const repo = await this.api('');
      if (!repo.private) {
        return {
          ok: false,
          error: 'Ese repositorio es PÚBLICO. Las fotos de clientes no pueden ir a un repositorio público.'
        };
      }
      if (repo.permissions && !repo.permissions.push) {
        return { ok: false, error: 'El testigo puede leer pero no escribir en ese repositorio.' };
      }
      return { ok: true, quien: repo.full_name };
    } catch (e) {
      return { ok: false, error: e.message };
    }
  }

  async subir(sesion, fotos = {}, ilegibles = []) {
    if (!this.configurado()) throw new Error('Sin repositorio ni testigo no se puede subir.');

    const ficheros = ficherosDe(sesion, fotos, this.tecnico, ilegibles);
    const ref = await this.api(`/git/ref/heads/${this.rama}`, {}, true);

    const arbol = [];
    for (const fichero of ficheros) {
      const blob = await this.api('/git/blobs', {
        method: 'POST',
        body: JSON.stringify({ content: fichero.contenido, encoding: fichero.codificacion })
      });
      arbol.push({ path: fichero.ruta, mode: '100644', type: 'blob', sha: blob.sha });
    }

    // Un repositorio recién creado no tiene rama todavía: el primer commit no
    // tiene padre y la referencia hay que crearla, no actualizarla.
    const padre = ref?.object?.sha ?? null;
    const base = padre ? (await this.api(`/git/commits/${padre}`)).tree.sha : undefined;

    const arbolCreado = await this.api('/git/trees', {
      method: 'POST',
      body: JSON.stringify(base ? { base_tree: base, tree: arbol } : { tree: arbol })
    });

    const commit = await this.api('/git/commits', {
      method: 'POST',
      body: JSON.stringify({
        message: mensajeDeCommit(sesion, ficheros.length - 1, this.tecnico),
        tree: arbolCreado.sha,
        parents: padre ? [padre] : []
      })
    });

    if (padre) {
      await this.api(`/git/refs/heads/${this.rama}`, {
        method: 'PATCH',
        body: JSON.stringify({ sha: commit.sha })
      });
    } else {
      await this.api('/git/refs', {
        method: 'POST',
        body: JSON.stringify({ ref: `refs/heads/${this.rama}`, sha: commit.sha })
      });
    }

    const ruta = rutaDeVisita(sesion);
    return {
      ruta,
      commit: commit.sha,
      url: `https://github.com/${this.repo}/tree/${this.rama}/${ruta}`,
      cuando: new Date().toISOString()
    };
  }

  // Lo que hay en la oficina, para que el panel lo liste.
  async listar() {
    const arbol = await this.api(`/git/trees/${this.rama}?recursive=1`, {}, true);
    if (!arbol) return [];
    return arbol.tree
      .filter(n => n.type === 'blob' && n.path.endsWith('/visita.json'))
      .map(n => ({ id: n.path.split('/').at(-2), ruta: n.path.replace(/\/visita\.json$/, ''), sha: n.sha }));
  }
}

function mensajeDeCommit(sesion, cuantasFotos, tecnico) {
  const cliente = sesion?.cliente || 'sin cliente';
  const quien = tecnico ? ` · ${tecnico}` : '';
  return `visita: ${sesion?.guion ?? '?'} · ${cliente} (${cuantasFotos} fotos)${quien}`;
}
