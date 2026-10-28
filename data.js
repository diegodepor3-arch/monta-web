// Datos que mantiene el club a mano. Equipos, plantillas, partidos y clasificaciones
// vienen de la federación en federacion.js (lo genera actualizar.py).

const CLUB = {
  nombre: "Atlético Coruña Montañeros C.F.",
  corto: "Montañeros",
  email: "atleticocorunacf@gmail.com",
  direccion: "Avenida New York, nº 1, bajo · 15008 A Coruña",
  // Campaña de abonados en Cluber: precio tal como sale allí (revisar cada temporada)
  abono: { temporada: "2026-27", precio: "82,90 €", url: "https://app.cluber.es/clubs/69b7e4f4120ae140806761/members/join" },
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
// Fotos: salen en la ficha del jugador en lugar de la camiseta. Solo primer equipo y juveniles;
// app.js lo fuerza aunque aquí haya otras. Se recortan con fotos.py (sin fondo, por la cintura).
// fotos: { "Nombre Como Sale En La Plantilla": "img/jugadores/archivo.webp" }
// videos: tipo "highlight" | "entrevista", youtube = id del vídeo (canal de TVG / Tivigal)
// jugadores: lo que la federación no publica. Edad y posición del primer equipo salen solas de
// lapreferente.com; lo que pongáis aquí tiene prioridad (sale "–" en la ficha si no hay dato):
//   { "Nombre Como Sale En La Plantilla": { posicion: "Delantero", nacimiento: "2003-05-14", mvp: 2 } }
// Partidos, titularidades, goles, tarjetas y dorsal salen solos de las actas de la federación.
const EXTRA = {
  "primer-equipo": {
    fotos: {
      "Adrián Ogando Olivares": "img/jugadores/adrian-ogando.webp",
      "Adrián Otero Calviño": "img/jugadores/adrian-otero.webp",
      "Antonio Garda Patiño": "img/jugadores/anton-garda.webp",
      "Axel Sánchez Iglesias": "img/jugadores/axel.webp",
      "Brais Pérez Moreta": "img/jugadores/brais-moreta.webp",
      "Daniel Buide Modia": "img/jugadores/daniel-buide.webp",
      "Daniel Fernández Río": "img/jugadores/daniel-fernandez.webp",
      "Diego Rodríguez Sánchez": "img/jugadores/diego-rodriguez.webp",
      "Diego Longueira Enjamio": "img/jugadores/enjamio.webp",
      "Iago Pérez Ferreiro": "img/jugadores/iago.webp",
      "Jesús Cañizares Sánchez": "img/jugadores/jesus-canizares.webp",
      "Jorge Longueira Fernández": "img/jugadores/jorge-longueira.webp",
      "Marcos Moreno García": "img/jugadores/marcos-moreno.webp",
      "Pape Massokhna Gaye": "img/jugadores/pape.webp",
      "Jorge Otero Cortés": "img/jugadores/jorge-otero.webp",
      "Jorge Tomé Vila": "img/jugadores/jorge-tome.webp",
      "Luis Castro Lois": "img/jugadores/luis-castro.webp",
      "Mario Constenla Couceiro": "img/jugadores/mario-constenla.webp",
      "Pablo Fernández De Miguel": "img/jugadores/pablo-fernandez.webp",
      "Pablo Martínez García": "img/jugadores/pablo-martinez.webp",
      "Samuel Rey Corral": "img/jugadores/samu-rey.webp",
      "Xoel Vilariño Escariz": "img/jugadores/xoel-vilarino.webp",
      "Óscar Fernández Hidalgo": "img/jugadores/oscar-fernandez.webp",
    },
    videos: [],
    jugadores: {},
  },
};

// Salón de la fama: jugadores que pasaron por la cantera y llegaron a profesionales.
// instagram (opcional): enlace a una publicación pública; se inserta en lugar de la foto.
// Datos a 28-10-2026 (Wikipedia y BDFutbol). temporadas: [temporada, partidos de liga, goles de liga, clubes];
// los totales de la página salen de aquí. Fotos de Wikimedia Commons: la licencia obliga a citar autor y licencia.
const LEYENDAS = [
  {
    id: "nico-gonzalez",
    nombre: "Nico González",
    completo: "Nicolás González Iglesias",
    nacimiento: "2002-01-03",
    lugar: "A Coruña",
    posicion: "Mediocentro",
    actual: "Newcastle United · Premier League",
    monta: { años: "2009–2013", texto: "Se formó en Montañeros de los 7 a los 11 años, hasta que el Barcelona se lo llevó a La Masia." },
    foto: "img/leyendas/nico.webp",
    instagram: "https://www.instagram.com/p/DFoNlp0s8iV/",
    credito: { autor: "Werner100359", licencia: "CC0", url: "https://commons.wikimedia.org/wiki/File:FC_Red_Bull_Salzburg_gegen_CF_Barcelona_(Testspiel_4._August_2021)_44.jpg" },
    titulos: [
      { nombre: "Copa de la Liga inglesa", club: "Manchester City", temporada: "2025-26" },
      { nombre: "Copa de Portugal", club: "Oporto", temporada: "2023-24" },
      { nombre: "Supercopa de Portugal", club: "Oporto", temporada: "2024" },
    ],
    destacados: ["Debutó con el Barcelona B con 17 años", "Mejor centrocampista del mes de la liga portuguesa (diciembre de 2024)", "Internacional sub-17 y sub-21 con España"],
    clubes: [
      { club: "Barcelona", años: "2013–2023", nota: "La Masia, filial y primer equipo" },
      { club: "Valencia", años: "2022–2023", nota: "Cedido" },
      { club: "Oporto", años: "2023–2025" },
      { club: "Manchester City", años: "2025–2026" },
      { club: "Newcastle United", años: "2026–" },
    ],
    temporadas: [
      ["2018-19", 1, 0, "Barcelona B"], ["2020-21", 23, 0, "Barcelona B"], ["2021-22", 29, 2, "Barcelona y Barcelona B"],
      ["2022-23", 26, 1, "Valencia"], ["2023-24", 25, 2, "Oporto"], ["2024-25", 28, 6, "Oporto y Manchester City"],
      ["2025-26", 25, 1, "Manchester City"], ["2026-27", 5, 0, "Newcastle United"],
    ],
    fuentes: [{ nombre: "Wikipedia", url: "https://en.wikipedia.org/wiki/Nico_Gonz%C3%A1lez_(footballer,_born_2002)" }],
  },
  {
    id: "lucas-perez",
    nombre: "Lucas Pérez",
    completo: "Lucas Pérez Martínez",
    nacimiento: "1988-09-10",
    lugar: "A Coruña",
    posicion: "Delantero",
    actual: "Último club: Cádiz (2026)",
    monta: { años: "Juvenil", texto: "Volvió a Coruña desde el Alavés y jugó unos nueve partidos con el juvenil de Montañeros antes de dar el salto al Órdenes, en Tercera." },
    foto: "img/leyendas/lucas.webp",
    instagram: "https://www.instagram.com/p/C3iFyXiNTRk/",
    credito: { autor: "Estevoaei", licencia: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Partido_Galicia_-_Panam%C3%A1_en_Bala%C3%ADdos_20.jpg" },
    titulos: [
      { nombre: "FA Cup", club: "Arsenal", temporada: "2016-17" },
      { nombre: "Liga neerlandesa (Eredivisie)", club: "PSV", temporada: "2024-25" },
      { nombre: "Primera Federación", club: "Deportivo", temporada: "2023-24" },
    ],
    destacados: ["17 goles en Primera con el Deportivo en la 2015-16", "Jugó en España, Ucrania, Grecia, Inglaterra y Países Bajos", "Internacional con Galicia"],
    clubes: [
      { club: "Atlético de Madrid C", años: "2007–2009" }, { club: "Rayo Vallecano", años: "2009–2011" },
      { club: "Karpaty Lviv", años: "2011–2013" }, { club: "PAOK", años: "2013–2015" },
      { club: "Deportivo", años: "2014–2016" }, { club: "Arsenal", años: "2016–2018" },
      { club: "Deportivo", años: "2017–2018", nota: "Cedido" }, { club: "West Ham", años: "2018–2019" },
      { club: "Alavés", años: "2019–2021" }, { club: "Elche", años: "2021–2022" }, { club: "Cádiz", años: "2022" },
      { club: "Deportivo", años: "2023–2025" }, { club: "PSV", años: "2025" }, { club: "Cádiz", años: "2026" },
    ],
    temporadas: [
      ["2009-10", 2, 0, "Rayo Vallecano"], ["2010-11", 27, 6, "Rayo Vallecano, Rayo B y Karpaty"], ["2011-12", 26, 6, "Karpaty"],
      ["2012-13", 17, 8, "Karpaty"], ["2013-14", 32, 9, "PAOK"], ["2014-15", 21, 6, "Deportivo"], ["2015-16", 36, 17, "Deportivo"],
      ["2016-17", 12, 2, "Deportivo y Arsenal"], ["2017-18", 35, 8, "Deportivo"], ["2018-19", 15, 3, "West Ham"],
      ["2019-20", 34, 11, "Alavés"], ["2020-21", 28, 4, "Alavés"], ["2021-22", 33, 5, "Elche y Cádiz"],
      ["2022-23", 33, 11, "Cádiz y Deportivo"], ["2023-24", 31, 12, "Deportivo"], ["2024-25", 21, 4, "Deportivo y PSV"],
      ["2025-26", 7, 1, "Cádiz"],
    ],
    fuentes: [{ nombre: "Wikipedia", url: "https://en.wikipedia.org/wiki/Lucas_P%C3%A9rez" }, { nombre: "BDFutbol", url: "https://www.bdfutbol.com/es/j/j12511.html" },
      { nombre: "Líbero", url: "https://revistalibero.com/blogs/contenidos/lucas-perez-yo-soy-del-88-y-creo-que-el-ano-90-es-cuando-se-acaba-el-futbol-en-la-calle-empezaron-las-extraescolares-y-yo-creo-que-en-mi-epoca-no-existia-eso-de-ir-a-natacion-podria-existir-pero-en-mi-barrio-no-se-llevaba" }],
  },
  {
    id: "rober-pier",
    nombre: "Róber Pier",
    completo: "Roberto Suárez Pier",
    nacimiento: "1995-02-16",
    lugar: "Oleiros",
    posicion: "Defensa central",
    actual: "Cultural Leonesa · Primera Federación",
    // ponytail: las fuentes públicas solo citan la cantera del Deportivo; años en Montañeros pendientes del club
    monta: { años: "Fútbol base", texto: "Pasó por la cantera de Montañeros antes de llegar al Deportivo, donde subió hasta el primer equipo." },
    foto: "img/leyendas/rober.webp",
    credito: { autor: "Mjazick", licencia: "CC BY-SA 4.0", url: "https://commons.wikimedia.org/wiki/File:Roberpier2.jpg" },
    titulos: [{ nombre: "Segunda División", club: "Levante", temporada: "2016-17" }],
    destacados: ["Más de 100 partidos en Primera con el Levante", "Debutó en Primera con el Deportivo en la 2015-16", "Jugó en la liga mexicana con el Atlas"],
    clubes: [
      { club: "Deportivo Fabril", años: "2012–2016" }, { club: "Deportivo", años: "2015–2019" },
      { club: "Levante", años: "2016–2023", nota: "Cedido y después en propiedad" }, { club: "Sporting de Gijón", años: "2023–2025" },
      { club: "Atlas (México)", años: "2025–2026" }, { club: "Cultural Leonesa", años: "2026–" },
    ],
    temporadas: [
      ["2015-16", 2, 0, "Deportivo"], ["2016-17", 26, 1, "Levante"], ["2017-18", 25, 0, "Levante"], ["2018-19", 33, 1, "Levante"],
      ["2019-20", 4, 0, "Levante"], ["2020-21", 19, 0, "Levante"], ["2021-22", 27, 1, "Levante"], ["2022-23", 34, 0, "Levante"],
      ["2023-24", 39, 0, "Sporting de Gijón"], ["2024-25", 34, 2, "Sporting de Gijón"], ["2025-26", 5, 0, "Atlas"],
      ["2026-27", 4, 0, "Cultural Leonesa"],
    ],
    fuentes: [{ nombre: "Wikipedia", url: "https://en.wikipedia.org/wiki/R%C3%B3ber_Pier" }, { nombre: "BDFutbol", url: "https://www.bdfutbol.com/es/j/j20047.html" }],
  },
];

const NOTICIAS = [
  {
    id: "nueva-web",
    fecha: "2026-10-19",
    titulo: "Estrenamos web",
    resumen: "Toda la información del primer equipo y de la Cantera Morada en un solo sitio, con los partidos y clasificaciones al día.",
    cuerpo: "Texto de ejemplo: sustituir por la noticia real.\n\nCada línea en blanco separa párrafos.",
  },
];
