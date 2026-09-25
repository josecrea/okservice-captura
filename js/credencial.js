// La credencial del técnico, guardada en su móvil.
//
// 🔴 No hay forma de guardar un secreto en una aplicación que corre entera en
// el navegador. Por eso el testigo NO viaja en el código —este repositorio es
// público— sino que lo pega el técnico una vez y se queda en SU aparato.
//
// Lo que eso implica, y que la pantalla de ajustes dice con todas las letras:
//   · el testigo tiene que dar acceso SOLO al repositorio de datos
//   · con caducidad, para que perder el móvil tenga fecha de caducidad
//   · y se revoca desde GitHub en cuanto haga falta
//
// Cuando esto pase a servidor propio, aquí vivirá una sesión con caducidad
// corta en vez de un testigo de larga vida, y el resto de la aplicación no se
// entera.

const CLAVE = 'okservice-captura-ajustes';

const POR_DEFECTO = {
  destino: 'github',
  repo: '',          // «usuario/repositorio» del repositorio PRIVADO de datos
  rama: 'main',
  testigo: '',
  tecnico: ''
};

export function leerAjustes() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (!crudo) return { ...POR_DEFECTO };
    return { ...POR_DEFECTO, ...JSON.parse(crudo) };
  } catch {
    return { ...POR_DEFECTO };
  }
}

export function guardarAjustes(cambios) {
  const nuevos = { ...leerAjustes(), ...cambios };
  localStorage.setItem(CLAVE, JSON.stringify(nuevos));
  return nuevos;
}

export function olvidarAjustes() {
  localStorage.removeItem(CLAVE);
}

export function hayCredencial(ajustes = leerAjustes()) {
  return Boolean(ajustes.testigo && ajustes.repo);
}

// «usuario/repositorio» y nada más: un repo mal escrito falla en la primera
// llamada con un 404 que no dice qué está mal.
export function validarRepo(repo) {
  if (!repo) return 'Hace falta el repositorio de datos.';
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return 'Escríbelo como «usuario/repositorio».';
  return null;
}

export function validarTestigo(testigo) {
  if (!testigo) return 'Hace falta el testigo de acceso.';
  if (testigo.length < 20) return 'Ese testigo es demasiado corto para ser válido.';
  return null;
}
