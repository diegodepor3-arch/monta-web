// Datos que mantiene el club a mano. Equipos, plantillas, partidos y clasificaciones
// vienen de la federación en federacion.js (lo genera actualizar.py).

const CLUB = {
  nombre: "Atlético Coruña Montañeros C.F.",
  corto: "Montañeros",
  email: "atleticocorunacf@gmail.com",
  direccion: "Avenida New York, nº 1, bajo · 15008 A Coruña",
};

const CATEGORIAS = [
  { id: "senior", nombre: "Primer equipo", singular: "Primer equipo" },
  { id: "juvenil", nombre: "Juveniles", singular: "Juvenil" },
  { id: "cadete", nombre: "Cadetes", singular: "Cadete" },
  { id: "infantil", nombre: "Infantiles", singular: "Infantil" },
  { id: "alevin", nombre: "Alevines", singular: "Alevín" },
  { id: "benjamin", nombre: "Benjamines", singular: "Benjamín" },
  { id: "prebenjamin", nombre: "Prebenjamines", singular: "Prebenjamín" },
];

// Por equipo (id de federacion.js): vídeos y fotos.
// Fotos: solo se muestran en primer equipo y juveniles; app.js lo fuerza aunque aquí haya otras.
// fotos: { "Nombre Como Sale En La Plantilla": "img/jugadores/archivo.jpg" }
// videos: tipo "highlight" | "entrevista", youtube = id del vídeo (canal de TVG / Tivigal)
// jugadores: lo que la federación no publica (sale "–" en la ficha si falta):
//   { "Nombre Como Sale En La Plantilla": { posicion: "Delantero", altura: "1,82 m", nacimiento: "2003-05-14", mvp: 2 } }
// Partidos, titularidades, goles, tarjetas y dorsal salen solos de las actas de la federación.
const EXTRA = {
  "primer-equipo": {
    fotos: {},
    videos: [],
    jugadores: {},
  },
};

const NOTICIAS = [
  {
    id: "nueva-web",
    fecha: "2026-10-19",
    titulo: "Estrenamos web",
    resumen: "Toda la información del primer equipo y de la Canteira Morada en un solo sitio, con los partidos y clasificaciones al día.",
    cuerpo: "Texto de ejemplo: sustituir por la noticia real.\n\nCada línea en blanco separa párrafos.",
  },
];
