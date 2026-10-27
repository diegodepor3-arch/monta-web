// Protección de menores: solo estas categorías muestran foto, diga lo que diga data.js.
const CATEGORIAS_CON_FOTO = new Set(["senior", "juvenil"]);

const app = document.getElementById("app");
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const icono = (id, cls = "icono") => `<svg class="${cls}" aria-hidden="true"><use href="#${id}"/></svg>`;
const normal = (s) => String(s).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");

// --- Fechas -------------------------------------------------------------
const dia = (f) => new Date(`${f}T12:00`); // mediodía: sin líos de zona horaria
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmt = (f, op) => dia(f).toLocaleDateString("es-ES", op).replace(".", "");
const fechaCorta = (f) => `${fmt(f, { weekday: "short" })}, ${fmt(f, { day: "numeric", month: "short" })}`;
const hoy = () => { const d = new Date(); d.setHours(12, 0, 0, 0); return d; };
const sumarDias = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

// --- Equipos ------------------------------------------------------------
const categoria = (id) => CATEGORIAS.find((c) => c.id === id);
const equipo = (id) => EQUIPOS.find((e) => e.id === id);
const nombreEquipo = (e) => e.categoria === "senior" ? "Primer equipo"
  : `${categoria(e.categoria).singular} ${e.letra}${e.liga.includes("F-11") ? " F-11" : ""}`;
const rutaEquipo = (e) => `#/equipo/${e.id}`;
const filaPropia = (e) => e.clasificacion.findIndex((f) => f.propio);
const proximo = (e) => e.partidos.find((p) => !p.resultado);
const todosLosPartidos = () => EQUIPOS.flatMap((e) => e.partidos.map((p) => ({ ...p, e })));
// Plantilla de la federación + jugadores de otros equipos del club que salen convocados en las actas
// en al menos 2 partidos (p. ej. un juvenil que hace de segundo portero en el primer equipo)
const CONVOCATORIAS_MIN = 2;
const jugadoresDe = (e) => e._jugadores ??= (() => {
  const ya = new Set(e.plantilla.map(normal)), veces = {};
  for (const a of Object.values(e.actas || {})) for (const n of new Set([...a.t, ...a.s])) if (!ya.has(normal(n))) veces[n] = (veces[n] || 0) + 1;
  return [...e.plantilla, ...Object.keys(veces).filter((n) => veces[n] >= CONVOCATORIAS_MIN)];
})();
// Dorsales sacados de las actas; se comparan sin tildes por si las dos fuentes escriben distinto
const dorsal = (e, nombre) => Object.entries(e.dorsales || {}).find(([k]) => normal(k) === normal(nombre))?.[1];

function marcador(p) {
  const [l, v] = p.resultado.split("-").map(Number);
  const nos = p.local ? l : v, ellos = p.local ? v : l;
  return { l, v, res: nos > ellos ? "G" : nos < ellos ? "P" : "E" };
}

const iniciales = (n) => n.replace(/[^A-ZÁÉÍÓÚÑ ]/gi, "").trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join("").toUpperCase();
// Escudo sin fondo (escudos.py lo recorta y lo guarda en img/escudos); si aún no está, el de la federación
const sinFondo = (url) => (typeof ESCUDOS === "object" && ESCUDOS[url]) || url;
const escudoDe = (e, nombre) => e.escudos?.[nombre]
  ? `<img class="escudo" src="${esc(sinFondo(e.escudos[nombre]))}" alt="" loading="lazy">`
  : `<span class="escudo escudo--vacio" aria-hidden="true">${esc(iniciales(nombre))}</span>`;
const nuestro = `<img class="escudo" src="img/escudo.png" alt="">`;
const vacio = (txt) => `<p class="vacio">${txt}</p>`;

// --- Piezas comunes -----------------------------------------------------
function cuentaAtras(p) {
  if (!p.hora) return "";
  return `<div class="cuenta" data-objetivo="${p.fecha}T${p.hora}" aria-label="Cuenta atrás">
    ${["días", "horas", "min"].map((u) => `<span><b>--</b><small>${u}</small></span>`).join("")}</div>`;
}

// El enfrentamiento: escudo y nombre de cada lado, VS en medio
function versus(p, conHora = true) {
  const casa = p.local ? { n: CLUB.corto, img: nuestro } : { n: p.rival, img: escudoDe(p.e, p.rival) };
  const fuera = p.local ? { n: p.rival, img: escudoDe(p.e, p.rival) } : { n: CLUB.corto, img: nuestro };
  const m = p.resultado && marcador(p);
  return `
    <div class="versus">
      <div class="versus-equipo">${casa.img}<strong>${esc(casa.n)}</strong></div>
      <div class="versus-centro">
        ${m ? `<span class="versus-marcador versus-marcador--${m.res}">${m.l} – ${m.v}</span>` : `<span class="versus-vs">VS</span>`}
        ${conHora ? `<small>${esc(fechaCorta(p.fecha))}${p.hora ? ` · ${esc(p.hora)}` : ""}</small>` : ""}
      </div>
      <div class="versus-equipo">${fuera.img}<strong>${esc(fuera.n)}</strong></div>
    </div>`;
}

function tarjetaProximo(p) {
  return `
    <div class="tarjeta-proximo">
      <div class="tarjeta-cab"><span>Próximo partido</span><span>Jornada ${p.jornada}</span></div>
      <div class="tarjeta-cuerpo">
        ${versus(p)}
        ${cuentaAtras(p)}
      </div>
      <p class="tarjeta-pie">${icono("i-pin")}${p.campo ? esc(p.campo) : "Campo por confirmar"} · ${p.local ? "en casa" : "fuera"}${p.hora ? "" : " · hora por confirmar"}</p>
    </div>`;
}

// --- Inicio: próximo partido del primer equipo, cinta y la semana de la cantera ---
function inicio() {
  const lunes = sumarDias(hoy(), -((hoy().getDay() + 6) % 7)), domingo = sumarDias(lunes, 6);
  const todos = todosLosPartidos().filter((p) => p.fecha);
  const tira = todos.filter((p) => dia(p.fecha) >= sumarDias(lunes, -7) && dia(p.fecha) <= domingo)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  // De mayores a pequeños (juvenil A, B, C, cadete A…), como en CATEGORIAS; dentro de cada equipo, por fecha
  const orden = (p) => CATEGORIAS.findIndex((c) => c.id === p.e.categoria);
  const cantera = todos.filter((p) => !p.resultado && p.e.categoria !== "senior" && dia(p.fecha) >= lunes && dia(p.fecha) <= domingo)
    .sort((a, b) => orden(a) - orden(b) || a.e.letra.localeCompare(b.e.letra) || EQUIPOS.indexOf(a.e) - EQUIPOS.indexOf(b.e)
      || (a.fecha + (a.hora || "99")).localeCompare(b.fecha + (b.hora || "99")));
  const primer = equipo("primer-equipo"), pp = primer && proximo(primer), pos = primer ? filaPropia(primer) : -1;

  return `
    <section class="cabecera">
      <div class="contenedor cabecera-dentro">
        <div>
          <h1>Atlético Coruña Montañeros</h1>
          <p class="cabecera-liga">Primer equipo · ${esc(primer?.competicion || "Tercera Federación")}${pos >= 0 ? ` · ${pos + 1}º con ${primer.clasificacion[pos].pts} pts` : ""}</p>
          <p class="cabecera-fuente"><span class="punto"></span><b>En directo</b> · Datos de futgal.es</p>
        </div>
        ${pp ? tarjetaProximo({ ...pp, e: primer }) : ""}
      </div>
    </section>
    ${tira.length ? cinta(tira) : ""}
    <div class="contenedor">
      <section class="bloque">
        <div class="bloque-cab"><h2>Esta semana en la Cantera</h2><a href="#/canteira">Todos los equipos</a></div>
        ${cantera.length ? semanaPorCategorias(cantera)
          : vacio("La federación aún no ha publicado partidos de la cantera para esta semana.")}
      </section>
      <section class="bloque">
        <div class="bloque-cab"><h2>Últimas noticias</h2><a href="#/noticias">Ver todas</a></div>
        ${listaNoticias(NOTICIAS.slice(0, 3))}
      </section>
    </div>`;
}

// Partidos de la semana de la cantera: una tarjeta por categoría; al pulsarla se despliegan sus partidos
let semanaAbierta = "";
function semanaPorCategorias(partidos) {
  const cats = CATEGORIAS.filter((c) => partidos.some((p) => p.e.categoria === c.id));
  if (!cats.some((c) => c.id === semanaAbierta)) semanaAbierta = "";
  return `
    <div class="semana-cats">${cats.map((c) => {
      const suyos = partidos.filter((p) => p.e.categoria === c.id);
      const equipos = [...new Set(suyos.map((p) => p.e))];
      const abierta = c.id === semanaAbierta;
      return `
        <button type="button" class="semana-cat${abierta ? " semana-cat--abierta" : ""}" data-semana="${c.id}" aria-expanded="${abierta}" aria-controls="semana-${c.id}">
          <strong>${esc(c.nombre)}</strong>
          <span class="tarjeta-letras">${equipos.map((e) => `<span>${esc(e.letra)}${e.liga.includes("F-11") ? "<small>11</small>" : ""}</span>`).join("")}</span>
          <small>${suyos.length} partido${suyos.length > 1 ? "s" : ""} esta semana</small>
          ${icono("i-der", "icono semana-flecha")}
        </button>
        <div class="semana-panel" id="semana-${c.id}"${abierta ? "" : " hidden"}>
          <div class="partidos">${suyos.map((p) => tarjetaPartido(p, false, true)).join("")}</div>
        </div>`;
    }).join("")}</div>`;
}

// Cinta de partidos de la semana: se desplaza sola, en bucle; la segunda copia es solo visual
function cinta(partidos) {
  let lista = partidos;
  while (lista.length < 8) lista = [...lista, ...partidos];
  const item = (p, copia) => {
    const m = p.resultado && marcador(p);
    return `
      <a class="cinta-item" href="${rutaEquipo(p.e)}"${copia ? ' tabindex="-1"' : ""}>
        ${escudoDe(p.e, p.rival)}
        <span class="cinta-texto">
          <span class="cinta-etiqueta">${m ? esc(nombreEquipo(p.e)) : `Próximo · ${esc(nombreEquipo(p.e))}`}</span>
          <span class="cinta-partido">${p.local ? "vs" : "en"} ${esc(p.rival)} ${m
            ? `<b class="cinta-res cinta-res--${m.res}">${p.local ? m.l : m.v}-${p.local ? m.v : m.l}</b>`
            : `<span class="cinta-cuando">· ${esc(fechaCorta(p.fecha))}${p.hora ? ` ${esc(p.hora)}` : ""}</span>`}</span>
        </span>
      </a>`;
  };
  return `
    <section class="cinta" aria-label="Partidos y resultados de la semana">
      <div class="cinta-pista" style="--duracion:${lista.length * 4}s">
        <div class="cinta-grupo">${lista.map((p) => item(p, false)).join("")}</div>
        <div class="cinta-grupo" aria-hidden="true">${lista.map((p) => item(p, true)).join("")}</div>
      </div>
    </section>`;
}

// --- Equipo -------------------------------------------------------------
// Cada equipo tiene portada con dos tarjetas: plantilla / partidos y clasificación.
function vistaEquipo(id, sub = "", jugador = "") {
  const e = equipo(id);
  if (!e) return noEncontrado();
  if (sub === "plantilla" && jugador) return vistaFicha(e, jugador);
  const p = proximo(e) && { ...proximo(e), e };
  const pendientes = e.partidos.filter((x) => !x.resultado).map((x) => ({ ...x, e }));
  const jugados = e.partidos.filter((x) => x.resultado).map((x) => ({ ...x, e })).reverse();
  const extra = EXTRA[e.id] || {};
  const videos = (tipo) => (extra.videos || []).filter((v) => v.tipo === tipo && v.youtube);
  const cantera = e.categoria === "senior" ? [] : [`<a href="#/canteira">Cantera Morada</a>`, `<a href="#/canteira/${e.categoria}">${esc(categoria(e.categoria).nombre)}</a>`];
  const trozos = [...cantera, ...(sub ? [`<a href="${rutaEquipo(e)}">${esc(nombreEquipo(e))}</a>`] : [])];
  const migas = trozos.length ? `<p class="migas">${trozos.join(" / ")}</p>` : "";
  const mesProx = p ? fmt(p.fecha, { month: "long" }) : "";
  const pos = filaPropia(e);

  const cabecera = (titulo) => `
    <section class="cabecera">
      <div class="contenedor cabecera-dentro">
        <div>
          ${migas}
          <h1>${esc(titulo)}</h1>
          <p class="cabecera-liga">${esc(e.competicion || e.liga)}</p>
          <p class="cabecera-fuente"><span class="punto"></span><b>En directo</b> · Datos de futgal.es${e.descargado ? ` · actualizado ${esc(new Date(e.descargado).toLocaleString("es-ES", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }))}` : ""}</p>
        </div>
        ${p ? tarjetaProximo(p) : ""}
      </div>
    </section>`;

  const seccionPartidos = `
      <section class="bloque" id="clasificacion">
        <div class="bloque-cab"><h2>Clasificación</h2>${e.urlClasificacion ? `<a href="${esc(e.urlClasificacion)}" target="_blank" rel="noopener">futgal.es ${icono("i-externo")}</a>` : ""}</div>
        ${e.clasificacion.length ? `
          <div class="tabla-marco"><table class="tabla">
            <thead><tr><th scope="col">#</th><th scope="col">Equipo</th><th scope="col"><abbr title="Partidos jugados">PJ</abbr></th><th scope="col" class="opc-movil"><abbr title="Ganados">G</abbr></th><th scope="col" class="opc-movil"><abbr title="Empatados">E</abbr></th><th scope="col" class="opc-movil"><abbr title="Perdidos">P</abbr></th><th scope="col" class="opc"><abbr title="Goles a favor">GF</abbr></th><th scope="col" class="opc"><abbr title="Goles en contra">GC</abbr></th><th scope="col"><abbr title="Diferencia de goles">DG</abbr></th><th scope="col"><abbr title="Puntos">Pts</abbr></th></tr></thead>
            <tbody>${e.clasificacion.map((f, i) => `
              <tr${f.propio ? ' class="propio"' : ""}>
                <td class="tabla-pos">${i + 1}</td>
                <th scope="row"><span class="tabla-equipo">${f.propio ? nuestro : escudoDe(e, f.equipo)}${esc(f.equipo)}</span></th>
                <td>${f.pj}</td><td class="opc-movil">${f.g}</td><td class="opc-movil">${f.e}</td><td class="opc-movil">${f.p}</td><td class="opc">${f.gf}</td><td class="opc">${f.gc}</td>
                <td>${f.gf - f.gc > 0 ? "+" : ""}${f.gf - f.gc}</td><td class="tabla-pts">${f.pts}</td>
              </tr>`).join("")}
            </tbody>
          </table></div>`
        : vacio("La federación todavía no ha publicado la clasificación.")}
      </section>

      <section class="bloque" id="proximos">
        <div class="bloque-cab"><h2>Próximos partidos${mesProx ? ` · ${esc(mesProx)}` : ""}</h2></div>
        ${pendientes.length ? tresYResto(pendientes, (x, i) => tarjetaPartido(x, i === 0), "Ver calendario completo") : vacio("No hay partidos pendientes.")}
      </section>

      <section class="bloque" id="jugados">
        <div class="bloque-cab"><h2>Resultados recientes</h2></div>
        ${jugados.length ? tresYResto(jugados, (x) => tarjetaPartido(x), "Ver todos los resultados") : vacio("Aún no se ha jugado ningún partido.")}
      </section>
`;
  const seccionVideos = `
      ${videos("highlight").length ? `<section class="bloque"><div class="bloque-cab"><h2>Highlights</h2></div>${listaVideos(videos("highlight"))}</section>` : ""}
      ${videos("entrevista").length ? `<section class="bloque"><div class="bloque-cab"><h2>Entrevistas</h2></div>${listaVideos(videos("entrevista"))}</section>` : ""}
`;

  if (sub === "plantilla") {
    return `${cabeceraSimple("Plantilla", `${esc(nombreEquipo(e))} · ${esc(e.competicion || e.liga)}`, migas)}
      <div class="contenedor">${plantilla(e, "Temporada 2026-27")}</div>`;
  }
  if (sub === "partidos") return `${cabecera("Partidos")}<div class="contenedor">${seccionPartidos}</div>`;
  const num = jugadoresDe(e).map((n) => dorsal(e, n)).filter((d) => d != null).sort((x, y) => x - y)[0] ?? "";
  return `
    ${cabecera(nombreEquipo(e))}
    <div class="contenedor">
      <div class="hub">
        <a class="hub-tarjeta" href="${rutaEquipo(e)}/plantilla">
          <span class="hub-camiseta">${camiseta(num, false, "", patrocinioDe(e))}</span>
          <span class="hub-texto">
            <strong>Plantilla</strong>
            <small>${jugadoresDe(e).length} jugadores · cuerpo técnico</small>
          </span>
          ${icono("i-flecha", "icono hub-flecha")}
        </a>
        <a class="hub-tarjeta" href="${rutaEquipo(e)}/partidos">
          <span class="hub-pos" aria-hidden="true">${pos >= 0 ? `<b>${pos + 1}º</b><small>${e.clasificacion[pos].pts} pts</small>` : "<b>VS</b>"}</span>
          <span class="hub-texto">
            <strong>Partidos y clasificación</strong>
            <small>Calendario, resultados y la tabla de la liga</small>
          </span>
          ${icono("i-flecha", "icono hub-flecha")}
        </a>
      </div>
      ${seccionVideos}
    </div>`;
}

// Los 3 primeros a la vista; el resto, plegado tras un botón (details nativo)
const tresYResto = (lista, tarjeta, texto) => `
  <div class="partidos">${lista.slice(0, 3).map(tarjeta).join("")}</div>
  ${lista.length > 3 ? `<details class="resto"><summary>${texto} (${lista.length})</summary>
    <div class="partidos">${lista.slice(3).map((x, i) => tarjeta(x, i + 3)).join("")}</div></details>` : ""}`;

// conEquipo: en la portada la tarjeta dice qué equipo juega y lleva a su página
const tarjetaPartido = (p, destacado = false, conEquipo = false) => {
  const etiqueta = conEquipo ? "a" : "article";
  return `
  <${etiqueta} class="partido${destacado ? " partido--proximo" : ""}"${conEquipo ? ` href="${rutaEquipo(p.e)}"` : ""}>
    <div class="partido-cab"><span>${conEquipo ? `<b>${esc(nombreEquipo(p.e))}</b>` : `Jornada ${p.jornada}`}</span>${destacado ? "<span>Próximo</span>" : conEquipo ? `<span>J${p.jornada}</span>` : ""}</div>
    ${versus(p)}
    ${p.resultado ? "" : `<p class="partido-campo">${p.campo ? esc(p.campo) : ""}</p>`}
  </${etiqueta}>`;
};

// --- Plantilla: carrusel de camisetas (o fotos donde se permiten) --------
// ponytail: la federación no dice quién es portero; sin posición conocida se usan los dorsales habituales
const PORTEROS = new Set([1, 13, 25]);

// Edad y posición: lo que ponga el club en data.js manda; si no, lapreferente.com (solo primer equipo)
function perfil(e, n) {
  const manual = ((EXTRA[e.id] || {}).jugadores || {})[n] || {};
  const lista = Object.entries(e.perfiles?.jugadores || {});
  const k = normal(n), trozos = new Set(k.split(/\s+/));
  // mismo nombre sin tildes, o todas las palabras de La Preferente dentro del nombre de la federación
  const lp = (lista.find(([x]) => normal(x) === k) || lista.find(([x]) => normal(x).split(/\s+/).every((t) => trozos.has(t))) || [])[1] || {};
  return { ...manual, posicion: manual.posicion || lp.posicion, edad: manual.nacimiento ? edad(manual.nacimiento) : lp.edad };
}
const esPortero = (e, n) => { const p = perfil(e, n).posicion; return p ? p === "Portero" : PORTEROS.has(dorsal(e, n)); };

// Réplica de la equipación 2026-27: jugador morado de manga corta con rayas blancas en los costados;
// portero amarillo de manga larga con detalles negros. Mismo dibujo de frente: marca, escudo bordado,
// patrocinador y parche RFEF en la manga. Patrocinador según la categoría (PATROCINIO).
const SILUETA = {
  corta: "M62 8 30 20 4 52l22 30 18-12v130h112V70l18 12 22-30-26-32-32-12c-4 14-20 24-38 24S66 22 62 8z",
  larga: "M62 8 30 20C18 40 10 90 8 150l22 4c4-42 10-68 14-82v128h112V72c4 14 10 40 14 82l22-4c-2-60-10-110-22-130L138 8c-4 14-20 24-38 24S66 22 62 8z",
};
// Primer equipo: INZO · juveniles: sin patrocinador · de cadete a prebenjamín: JAECOO
const PATROCINIO = { senior: "inzo", juvenil: "", cadete: "jaecoo", infantil: "jaecoo", alevin: "jaecoo", benjamin: "jaecoo", prebenjamin: "jaecoo" };
const patrocinioDe = (e) => PATROCINIO[e.categoria] ?? "";
const LOGO = {
  inzo: (det) => `
      <g stroke="${det}" stroke-width="3.6" fill="none" stroke-linejoin="miter">
        <path d="M66 91v26M74 117V91l15 26V91M95 91h16l-16 26h16"/>
        <circle cx="125" cy="104" r="11.5"/>
      </g>
      <path d="M128.9 93.2A11.5 11.5 0 0 1 121.1 114.8Z" fill="${det}"/>
      <text x="101" y="129" text-anchor="middle" fill="${det}" class="camiseta-sponsor">COFFEE DESIGNER</text>`,
  // Letras geométricas como en la camiseta: J con gancho, A sin palo, E, C y O redondeadas
  jaecoo: (det) => {
    const x = (i) => 69 + i * 10.6;
    return `<path transform="translate(100 100) scale(1.22) translate(-100 -100)" stroke="${det}" stroke-width="2.3" fill="none" d="
      M${x(0)} 101v4h8v-10
      M${x(1)} 105l4-10 4 10
      M${x(2) + 8} 95h-8v10h8M${x(2)} 100h7
      M${x(3) + 8} 95h-5.5a2.5 2.5 0 0 0-2.5 2.5v5a2.5 2.5 0 0 0 2.5 2.5h5.5
      ${[4, 5].map((i) => `M${x(i) + 2.5} 95h3a2.5 2.5 0 0 1 2.5 2.5v5a2.5 2.5 0 0 1-2.5 2.5h-3a2.5 2.5 0 0 1-2.5-2.5v-5a2.5 2.5 0 0 1 2.5-2.5z`).join("")}"/>`;
  },
};
// La cantera con JAECOO lleva otra equipación: azul morado oscuro y lisa; portero verde de manga corta.
function camiseta(num, portero = false, espalda = "", patrocinio = "inzo") {
  const cantera = patrocinio === "jaecoo";
  const forma = SILUETA[portero && !cantera ? "larga" : "corta"];
  const tela = `tela-${portero ? "portero" : "jugador"}${cantera ? "-cantera" : ""}`;
  const det = portero && !cantera ? "#16140d" : "#fff";
  const cuello = cantera ? (portero ? "#2d7445" : "#1b1c4c") : portero ? "#cdbf1c" : "#2c1273";
  const barras = [0, 1, 2].map((i) => { // logo de la marca: tres barras inclinadas
    const x = 64 + i * 4.6, h = 5 + i * 3.5;
    return `<path d="M${x} 59h3.4l${h * 0.58} -${h}h-3.4z"/>`;
  }).join("");
  const base = `
      <path d="${forma}" fill="url(#${tela})"/>
      <path d="${forma}" fill="url(#pliegues)"/>
      <g class="camiseta-textura"><path d="${forma}" fill="url(#trama)"/><path d="${forma}" fill="url(#malla)"/><path d="${forma}" fill="url(#brillo)"/></g>`;
  const rayas = cantera ? "" : `<g stroke="${det}" stroke-width="1.3" fill="none" opacity="0.95"><path d="M45.5 76v122M48 74v124M50.5 72v126M149.5 72v126M152 74v124M154.5 76v122"/></g>`;
  if (espalda) {
    return `
    <svg class="camiseta" viewBox="0 0 200 210" aria-hidden="true">${base}
      <path d="M62 8c6 7 20 10 38 10s32-3 38-10" fill="none" stroke="${cuello}" stroke-width="6"/>
      ${rayas}
      <text x="100" y="64" class="camiseta-dorso" fill="${det}">${esc(espalda.toUpperCase())}</text>
      <text x="100" y="168" class="camiseta-num camiseta-num--dorso" fill="${det}">${num ?? ""}</text>
    </svg>`;
  }
  return `
    <svg class="camiseta" viewBox="0 0 200 210" aria-hidden="true">${base}
      <path d="M62 8c4 14 20 24 38 24s34-10 38-24" fill="none" stroke="${cuello}" stroke-width="6"/>
      ${rayas}
      <g fill="${det}">${barras}</g>
      <image href="img/escudo-blanco.png" x="121" y="39" width="22" height="29"${det !== "#fff" ? ' style="filter: brightness(0)"' : ""}/>
      ${portero || cantera ? "" : `<g transform="translate(24 46)"><circle r="7" fill="#e9ecdf"/><path d="M-4 3a6 6 0 0 1 8-6M-2 4a4 4 0 0 1 6-4" stroke="#7da36b" stroke-width="1.1" fill="none"/></g>`}
      ${LOGO[patrocinio]?.(det) ?? ""}
      ${num != null && num !== "" ? `<text x="100" y="182" class="camiseta-num" fill="${det}">${num}</text>` : ""}
    </svg>`;
}
function plantilla(e, titulo = "Plantilla") {
  if (!jugadoresDe(e).length && !e.entrenadores.length) {
    return `<section class="bloque" id="plantilla"><div class="bloque-cab"><h2>${titulo}</h2></div>${vacio("Plantilla pendiente de la federación.")}</section>`;
  }
  const conFoto = CATEGORIAS_CON_FOTO.has(e.categoria);
  const fotos = (EXTRA[e.id] || {}).fotos || {};
  const jugadores = ordenJugadores(e);
  const inicial = Math.max(0, jugadores.findIndex((n) => slug(n) === ultimaFicha[e.id]));
  const carta = (n, i) => {
    const num = dorsal(e, n), foto = conFoto && fotos[n];
    return `
      <button type="button" class="carta${esPortero(e, n) ? " carta--portero" : ""}" data-carta="${i}" data-ficha="${rutaFicha(e, n)}" aria-label="${esc(n)}${num != null ? `, dorsal ${num}` : ""}">
        ${foto ? `<img src="${esc(foto)}" alt="" loading="lazy">` : camiseta(num ?? iniciales(n), esPortero(e, n), "", patrocinioDe(e))}
      </button>`;
  };
  return `
    <section class="bloque" id="plantilla">
      <div class="bloque-cab">
        <h2>${titulo}</h2>
        <div class="chips" role="tablist" aria-label="Plantilla">
          <button type="button" role="tab" data-pestana="jugadores" aria-selected="true">Jugadores (${jugadores.length})</button>
          <button type="button" role="tab" data-pestana="tecnicos" aria-selected="false">Cuerpo técnico</button>
        </div>
      </div>
      <div data-panel="jugadores">
        ${jugadores.length ? `
          <div class="carrusel" data-activo="${inicial}">
            <button type="button" class="redondo carrusel-flecha" data-paso="-1" aria-label="Jugador anterior">${icono("i-izq")}</button>
            <div class="carrusel-pista">${jugadores.map(carta).join("")}</div>
            <button type="button" class="redondo carrusel-flecha" data-paso="1" aria-label="Jugador siguiente">${icono("i-der")}</button>
          </div>
          <p class="carrusel-nombre" aria-live="polite"></p>
          <ul class="lista-jugadores">${jugadores.map((n) => `<li><a href="${rutaFicha(e, n)}"><b>${dorsal(e, n) ?? ""}</b>${esc(n)}</a></li>`).join("")}</ul>`
        : vacio("Plantilla pendiente de la federación.")}
      </div>
      <div data-panel="tecnicos" hidden>
        <ul class="lista-jugadores">
          ${e.entrenadores.map((n) => `<li><b>Téc.</b>${esc(n)}</li>`).join("")}
          ${e.delegados.map((n) => `<li><b>Del.</b>${esc(n)}</li>`).join("")}
        </ul>
      </div>
      <a class="enlace-fed" href="${esc(e.urlFederacion)}" target="_blank" rel="noopener">Ficha del equipo en la federación ${icono("i-externo")}</a>
    </section>`;
}

// arrastre: cuántas camisetas se ha movido el dedo (con decimales) mientras desliza
function colocarCarrusel(c, arrastre = 0) {
  const activo = Number(c.dataset.activo), cartas = [...c.querySelectorAll(".carta")];
  cartas.forEach((carta, i) => {
    const d = i - activo + arrastre, a = Math.abs(i - activo), x = Math.min(Math.abs(d), 3);
    carta.style.transform = `translateX(calc(-50% + ${d * 72}%)) scale(${x <= 1 ? 1 - 0.22 * x : Math.max(0.62, 0.78 - 0.16 * (x - 1))})`;
    carta.style.zIndex = 10 - Math.round(Math.abs(d));
    carta.style.opacity = x >= 3 ? 0 : x <= 1 ? 1 - 0.25 * x : x <= 2 ? 0.75 : 0.75 * (3 - x);
    carta.tabIndex = a === 0 ? 0 : -1;
    carta.classList.toggle("carta--activa", a === 0);
  });
  const nombre = c.parentElement.querySelector(".carrusel-nombre");
  const lab = cartas[activo]?.getAttribute("aria-label") || "";
  const [n, num] = lab.split(", dorsal ");
  nombre.innerHTML = `${num ? `<small>Dorsal ${esc(num)}</small>` : ""}<strong>${esc(n)}</strong>
    ${cartas[activo] ? `<a class="boton-ficha" href="${cartas[activo].dataset.ficha}">Ver ficha ${icono("i-flecha")}</a>` : ""}`;
}

// --- Ficha del jugador (se abre al pulsar su camiseta) -------------------
const slug = (n) => normal(n).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const ordenJugadores = (e) => [...jugadoresDe(e)].sort((a, b) => (dorsal(e, a) ?? 999) - (dorsal(e, b) ?? 999));
const rutaFicha = (e, n) => `${rutaEquipo(e)}/plantilla/${slug(n)}`;
const ultimaFicha = {}; // al volver, el carrusel queda centrado en el último jugador visto

// Minutos de partido. Infantil y menores quedan fuera: se puede volver a entrar y la federación no publica los cambios
const DURACION = { senior: 90, juvenil: 90, cadete: 80 };

// Cuenta lo que hizo el jugador en las actas guardadas
function estadisticas(e, n) {
  const k = normal(n), es = (x) => normal(x) === k, dura = DURACION[e.categoria];
  const r = { actas: 0, convocado: 0, titular: 0, jugados: 0, goles: 0, amarillas: 0, rojas: 0, minutos: null, jornadas: [] };
  for (const [j, a] of Object.entries(e.actas || {}).sort((x, y) => x[0] - y[0])) {
    const t = a.t.some(es), s = a.s.some(es), en = a.e.some(es);
    const g = Object.entries(a.g).filter(([x]) => es(x)).reduce((suma, [, v]) => suma + v, 0);
    r.actas++; r.convocado += t || s; r.titular += t; r.jugados += t || en; r.goles += g;
    r.amarillas += a.a.filter(es).length; r.rojas += a.r.filter(es).length;
    r.jornadas.push({ j, estado: t ? "titular" : en ? "entra" : s ? "banquillo" : "no", g });
    if (dura && a.c) { // actas leídas antes de guardar los cambios no tienen "c": no cuentan
      const entra = t ? 0 : a.c.find(([x]) => es(x))?.[2];
      const sale = Math.min(dura, a.c.find(([, x]) => es(x))?.[2] ?? dura,
        Object.entries(a.rm || {}).find(([x]) => es(x))?.[1] ?? dura);
      r.minutos = (r.minutos ?? 0) + (entra == null ? 0 : Math.max(0, sale - Math.min(entra, dura)));
    }
  }
  return r;
}

const anillo = (valor, maximo, texto, etiqueta) => {
  const pct = maximo ? Math.min(1, valor / maximo) : 0;
  return `<div class="anillo">
    <svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="44"/><circle cx="50" cy="50" r="44" class="anillo-valor" style="--pct:${pct}"/></svg>
    <b>${texto}</b><small>${etiqueta}</small></div>`;
};

// Gráfica "Goles por jornada": una línea; el punto dice si fue titular (lleno), entró (anillo) o no jugó (gris)
function graficaGoles(jornadas) {
  if (!jornadas.length) return `<p class="ficha-aviso">Sin partidos aún</p>`;
  const W = 680, H = 170, iz = 22, de = 12, ar = 16, ab = 24;
  const max = Math.max(1, ...jornadas.map((x) => x.g));
  const x = (i) => iz + (jornadas.length === 1 ? (W - iz - de) / 2 : (i * (W - iz - de)) / (jornadas.length - 1));
  const y = (g) => ar + (1 - g / max) * (H - ar - ab);
  const ESTADO = { titular: "titular", entra: "entró desde el banquillo", banquillo: "en el banquillo, no jugó", no: "no convocado" };
  const linea = jornadas.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(p.g).toFixed(1)}`).join("");
  const paso = jornadas.length > 12 ? 2 : 1;
  return `
    <svg class="grafica" viewBox="0 0 ${W} ${H}" role="img" aria-label="Goles por jornada: ${jornadas.map((p) => `J${p.j} ${p.g}`).join(", ")}">
      <line x1="${iz}" x2="${W - de}" y1="${y(0)}" y2="${y(0)}" class="grafica-base"/>
      <line x1="${iz}" x2="${W - de}" y1="${y(max)}" y2="${y(max)}" class="grafica-rejilla"/>
      <text x="${iz - 6}" y="${y(max) + 4}" class="grafica-eje" text-anchor="end">${max}</text>
      <text x="${iz - 6}" y="${y(0) + 4}" class="grafica-eje" text-anchor="end">0</text>
      <path d="${linea}" class="grafica-linea"/>
      ${jornadas.map((p, i) => `
        <g class="grafica-punto grafica-punto--${p.estado}">
          <title>Jornada ${p.j}: ${p.g} gol${p.g === 1 ? "" : "es"} · ${ESTADO[p.estado]}</title>
          <circle cx="${x(i)}" cy="${y(p.g)}" r="11" class="grafica-zona"/>
          <circle cx="${x(i)}" cy="${y(p.g)}" r="${p.estado === "no" || p.estado === "banquillo" ? 3 : 4.5}"/>
          ${p.g && p.g === max ? `<text x="${x(i)}" y="${y(p.g) - 9}" class="grafica-valor" text-anchor="middle">${p.g}</text>` : ""}
        </g>
        ${i % paso === 0 ? `<text x="${x(i)}" y="${H - 6}" class="grafica-eje" text-anchor="middle">J${p.j}</text>` : ""}`).join("")}
    </svg>
    <p class="ficha-leyenda"><i class="ley ley--titular"></i>Titular <i class="ley ley--entra"></i>Entró <i class="ley ley--no"></i>No jugó</p>`;
}

const edad = (nacimiento) => {
  if (!nacimiento) return "–";
  const n = new Date(`${nacimiento}T12:00`), h = new Date();
  return h.getFullYear() - n.getFullYear() - (h < new Date(h.getFullYear(), n.getMonth(), n.getDate()) ? 1 : 0);
};

const tarjetaProxima = (p) => `
  <article class="proxima">
    ${p.local ? `<div class="proxima-equipo">${nuestro}<strong>${esc(CLUB.corto)}</strong></div>` : `<div class="proxima-equipo">${escudoDe(p.e, p.rival)}<strong>${esc(p.rival)}</strong></div>`}
    <div class="proxima-centro">
      <small>${esc(fmt(p.fecha, { day: "numeric", month: "long" }))}</small>
      <b>${p.hora || "--:--"}</b>
      <small>Jornada ${p.jornada}</small>
    </div>
    ${p.local ? `<div class="proxima-equipo">${escudoDe(p.e, p.rival)}<strong>${esc(p.rival)}</strong></div>` : `<div class="proxima-equipo">${nuestro}<strong>${esc(CLUB.corto)}</strong></div>`}
  </article>`;

function vistaFicha(e, id) {
  const jugadores = ordenJugadores(e), i = jugadores.findIndex((n) => slug(n) === id);
  if (i < 0) return noEncontrado();
  const n = jugadores[i], num = dorsal(e, n), portero = esPortero(e, n);
  const manual = perfil(e, n);
  ultimaFicha[e.id] = id;
  const est = estadisticas(e, n);
  const volver = `${rutaEquipo(e)}/plantilla`;
  const ant = jugadores[(i - 1 + jugadores.length) % jugadores.length], sig = jugadores[(i + 1) % jugadores.length];
  const proximos = e.partidos.filter((x) => !x.resultado).slice(0, 6).map((x) => ({ ...x, e }));
  const cifra = (v, t) => `<div><b>${v}</b><small>${t}</small></div>`;
  const palma = (icono_, t, v) => `<div class="palma"><svg class="palma-icono" aria-hidden="true"><use href="#${icono_}"/></svg><small>${t}</small><b>${v}</b></div>`;
  const posicion = manual.posicion || (portero ? "Portero" : "Jugador");

  return `
    <section class="ficha" data-anterior="${rutaFicha(e, ant)}" data-siguiente="${rutaFicha(e, sig)}" data-volver="${volver}">
      <div class="contenedor ficha-rejilla">
        <div class="ficha-info">
          <a class="pastilla" href="${volver}">${icono("i-izq")} Volver a la plantilla</a>
          <p class="ficha-etiquetas"><span class="etiqueta">${esc(posicion)}</span>${nuestro}<span>Atlético Coruña Montañeros · ${esc(nombreEquipo(e))}</span></p>
          <div class="ficha-nombre">
            <h1>${esc(n)}</h1>
            <span class="ficha-mini">${camiseta(num ?? iniciales(n), portero, "", patrocinioDe(e))}</span>
          </div>

          <div class="ficha-panel">
            <div class="ficha-columnas">
              <div>
                <h3>Palmarés</h3>
                <div class="palmares">
                  ${palma("i-balon", "Goles", est.goles)}${palma("i-estrella", "MVP", manual.mvp ?? 0)}
                  ${palma("i-trofeo", "Titular", est.titular)}${palma("i-amarilla", "Amarillas", est.amarillas)}
                </div>
              </div>
              <div class="ficha-cifras">
                ${cifra(est.jugados, "Partidos")}${cifra(est.goles, "Goles")}${est.minutos != null ? cifra(est.minutos, "Minutos") : cifra(num ?? "–", "Dorsal")}
                ${cifra(manual.edad ?? "–", "Edad")}${cifra(est.convocado, "Convocatorias")}${cifra(est.rojas, "Rojas")}
              </div>
            </div>

            <h3>Goles por jornada</h3>
            ${graficaGoles(est.jornadas)}

            ${proximos.length ? `
              <div class="ficha-cab-proximos">
                <h3>Próximos partidos</h3>
                <span>
                  <button type="button" class="mini-flecha" data-desliza="-1" aria-label="Partidos anteriores">${icono("i-izq")}</button>
                  <button type="button" class="mini-flecha" data-desliza="1" aria-label="Más partidos">${icono("i-der")}</button>
                </span>
              </div>
              <div class="desliza">${proximos.map(tarjetaProxima).join("")}</div>` : ""}
            <p class="ficha-fuente">Partidos, goles y tarjetas: actas de la federación (futgal.es)${est.actas ? ` · ${est.actas} acta${est.actas > 1 ? "s" : ""} leída${est.actas > 1 ? "s" : ""}` : " · actas pendientes de descargar"}.</p>
          </div>
        </div>

        <div class="ficha-visual">
          <div class="ficha-flechas">
            <a class="redondo" href="${volver}" aria-label="Cerrar la ficha">✕</a>
            <a class="redondo" href="${rutaFicha(e, ant)}" aria-label="Jugador anterior: ${esc(ant)}">${icono("i-izq")}</a>
            <a class="redondo" href="${rutaFicha(e, sig)}" aria-label="Jugador siguiente: ${esc(sig)}">${icono("i-der")}</a>
          </div>
          <div class="ficha-camiseta${portero ? " carta--portero" : ""}">${camiseta(num, portero, n.split(" ")[0], patrocinioDe(e))}</div>
          <div class="ficha-anillos">
            ${anillo(est.jugados, est.actas, est.actas ? `${Math.round((est.jugados / est.actas) * 100)}%` : "0%", "Participación")}
            ${anillo(est.goles, est.jugados || 1, (est.jugados ? est.goles / est.jugados : 0).toFixed(2).replace(".", ","), "Goles por partido")}
          </div>
        </div>
      </div>
    </section>`;
}

// --- Cantera -----------------------------------------------------------
function canteira(catId) {
  if (!catId) {
    const cats = CATEGORIAS.filter((c) => c.id !== "senior" && EQUIPOS.some((e) => e.categoria === c.id));
    return `${cabeceraSimple("Cantera Morada", "De prebenjamín a juvenil")}
      <div class="contenedor bloque"><div class="rejilla-tarjetas">${cats.map((c) => {
        const eqs = EQUIPOS.filter((e) => e.categoria === c.id);
        return `<a class="tarjeta-cat" href="#/canteira/${c.id}">
          <strong>${esc(c.nombre)}</strong>
          <span class="tarjeta-letras">${eqs.map((e) => `<span>${esc(e.letra)}${e.liga.includes("F-11") ? "<small>11</small>" : ""}</span>`).join("")}</span>
          <small>${eqs.length} equipo${eqs.length > 1 ? "s" : ""}</small>
        </a>`;
      }).join("")}</div></div>`;
  }
  const c = categoria(catId);
  if (!c) return noEncontrado();
  const eqs = EQUIPOS.filter((e) => e.categoria === catId);
  return `${cabeceraSimple(c.nombre, `${eqs.length} equipo${eqs.length > 1 ? "s" : ""} esta temporada`, `<p class="migas"><a href="#/canteira">Cantera Morada</a></p>`)}
    <div class="contenedor bloque"><div class="rejilla-tarjetas">${eqs.map((e) => {
      const p = proximo(e), pos = filaPropia(e);
      return `<a class="tarjeta-equipo" href="${rutaEquipo(e)}">
        <span class="tarjeta-letra" aria-hidden="true">${esc(e.letra)}</span>
        <strong>${esc(nombreEquipo(e))}</strong>
        <small>${esc(e.liga)}</small>
        ${pos >= 0 ? `<span class="tarjeta-pos"><b>${pos + 1}º</b> · ${e.clasificacion[pos].pts} pts</span>` : ""}
        <span class="tarjeta-prox">${p ? `${esc(fechaCorta(p.fecha))}${p.hora ? ` · ${esc(p.hora)}` : ""} · ${p.local ? "vs" : "en"} ${esc(p.rival)}` : "Sin partidos pendientes"}</span>
      </a>`;
    }).join("")}</div></div>`;
}

// --- Noticias y búsqueda ------------------------------------------------
const listaNoticias = (ns) => ns.length ? `<div class="rejilla-tarjetas">${ns.map((n) => `
  <a class="tarjeta-noticia" href="#/noticia/${esc(n.id)}">
    <time datetime="${esc(n.fecha)}">${esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" }))}</time>
    <strong>${esc(n.titulo)}</strong>
    <p>${esc(n.resumen)}</p>
  </a>`).join("")}</div>` : vacio("Todavía no hay noticias.");

const listaVideos = (vs) => `<div class="rejilla-tarjetas">${vs.map((v) => `
  <figure class="video"><iframe src="https://www.youtube-nocookie.com/embed/${esc(v.youtube)}" title="${esc(v.titulo)}" loading="lazy" allowfullscreen></iframe>
  <figcaption>${esc(v.titulo)}</figcaption></figure>`).join("")}</div>`;

const cabeceraSimple = (titulo, sub = "", migas = "") => `
  <section class="cabecera cabecera--simple"><div class="contenedor">${migas}<h1>${esc(titulo)}</h1>${sub ? `<p class="cabecera-liga">${sub}</p>` : ""}</div></section>`;

function noticia(id) {
  const n = NOTICIAS.find((x) => x.id === id);
  if (!n) return noEncontrado();
  return `${cabeceraSimple(n.titulo, esc(fmt(n.fecha, { day: "numeric", month: "long", year: "numeric" })), `<p class="migas"><a href="#/noticias">Noticias</a></p>`)}
    <article class="contenedor articulo">${n.cuerpo.split(/\n\s*\n/).map((p) => `<p>${esc(p)}</p>`).join("")}</article>`;
}

function buscar(q) {
  const t = normal(q.trim());
  if (!t) return cabeceraSimple("Buscar", "Escribe un nombre en el buscador.");
  const coincide = (...s) => normal(s.join(" ")).includes(t);
  const personas = EQUIPOS.flatMap((e) => [...jugadoresDe(e), ...e.entrenadores].filter((n) => coincide(n)).map((n) => ({ n, e })));
  const equipos = EQUIPOS.filter((e) => coincide(nombreEquipo(e), e.liga, categoria(e.categoria).nombre));
  const noticias = NOTICIAS.filter((n) => coincide(n.titulo, n.resumen, n.cuerpo));
  const total = personas.length + equipos.length + noticias.length;
  const lista = (items) => `<ul class="lista-busqueda">${items}</ul>`;
  return `${cabeceraSimple(`“${q.trim()}”`, total ? `${total} resultado${total === 1 ? "" : "s"}` : "Sin resultados. Prueba con otro nombre o apellido.")}
    <div class="contenedor">
      ${personas.length ? `<section class="bloque"><div class="bloque-cab"><h2>Personas</h2></div>${lista(personas.map(({ n, e }) =>
        `<li><a href="${jugadoresDe(e).includes(n) ? rutaFicha(e, n) : `${rutaEquipo(e)}/plantilla`}"><strong>${esc(n)}</strong><span>${esc(nombreEquipo(e))}</span></a></li>`).join(""))}</section>` : ""}
      ${equipos.length ? `<section class="bloque"><div class="bloque-cab"><h2>Equipos</h2></div>${lista(equipos.map((e) =>
        `<li><a href="${rutaEquipo(e)}"><strong>${esc(nombreEquipo(e))}</strong><span>${esc(e.liga)}</span></a></li>`).join(""))}</section>` : ""}
      ${noticias.length ? `<section class="bloque"><div class="bloque-cab"><h2>Noticias</h2></div>${listaNoticias(noticias)}</section>` : ""}
    </div>`;
}

// --- Socios -------------------------------------------------------------
// Pendiente: precios, ventajas y forma de pago los confirma el club.
const socios = () => `${cabeceraSimple("Hazte socio", "Apoya al club y ven a ver los partidos")}
  <article class="contenedor articulo">
    <p>Con el carné de socio del Atlético Coruña Montañeros entras a ver los partidos del club y ayudas a que la Cantera Morada siga creciendo.</p>
    <p class="vacio">Precios y ventajas: pendiente de confirmar con el club.</p>
    <p><a class="pastilla" href="mailto:${esc(CLUB.email)}?subject=${encodeURIComponent("Quiero hacerme socio")}">Escríbenos para hacerte socio ${icono("i-flecha")}</a></p>

    <h2>Merchandising</h2>
    <img src="img/merchandising.webp" alt="Camiseta oficial morada (40 €) y bufanda del club (8 €), a la venta bajo pedido" width="900" height="896" loading="lazy" style="width: 100%; height: auto; max-width: 560px; border-radius: 16px;">
    <p>Lleva los colores del club. A la venta bajo pedido, con recogida en nuestras oficinas (${esc(CLUB.direccion)}).</p>
    <ul>
      <li><strong>Camiseta oficial:</strong> 40 €</li>
      <li><strong>Bufanda:</strong> 8 €</li>
    </ul>
    <p>Pídela por correo a <a href="mailto:${esc(CLUB.email)}">${esc(CLUB.email)}</a> o por Instagram en <a href="https://www.instagram.com/atlcorunamonta/" target="_blank" rel="noopener">@atlcorunamonta</a>.</p>
    <p><a class="pastilla" href="mailto:${esc(CLUB.email)}?subject=${encodeURIComponent("Pedido de merchandising")}">Hacer un pedido ${icono("i-flecha")}</a></p>
  </article>`;

const noEncontrado = () => cabeceraSimple("Fuera de juego", `Esta página no existe. <a href="#/">Volver al inicio</a>`);

// --- Navegación ---------------------------------------------------------
function render() {
  const [camino, ancla] = location.hash.replace(/^#\/?/, "").split("#");
  const [ruta = "", a = "", sub = "", extra = ""] = camino.split("/").map(decodeURIComponent);
  app.innerHTML =
    !ruta ? inicio() :
    ruta === "equipo" ? vistaEquipo(a, sub, extra) :
    ruta === "canteira" ? canteira(a) :
    ruta === "noticias" ? `${cabeceraSimple("Noticias", "La actualidad del club")}<div class="contenedor bloque">${listaNoticias(NOTICIAS)}</div>` :
    ruta === "noticia" ? noticia(a) :
    ruta === "socios" ? socios() :
    ruta === "buscar" ? buscar(a) :
    noEncontrado();
  app.querySelectorAll(".carrusel").forEach(colocarCarrusel);
  tictac();
  document.title = `${ruta ? app.querySelector("h1")?.textContent.trim() + " · " : ""}${CLUB.nombre}`;
  document.querySelectorAll(".menu-enlaces a").forEach((l) => {
    const s = l.dataset.seccion;
    l.toggleAttribute("aria-current", s ? `${ruta}/${a}`.startsWith(s) || ruta === s : !ruta);
  });
  const destino = ancla && document.getElementById(ancla);
  destino ? destino.scrollIntoView() : scrollTo(0, 0);
}

function navegar() {
  document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches
    ? document.startViewTransition(render) : render();
}

function moverCarrusel(c, paso) {
  const total = c.querySelectorAll(".carta").length;
  c.dataset.activo = Math.min(total - 1, Math.max(0, Number(c.dataset.activo) + paso));
  colocarCarrusel(c);
}

app.addEventListener("click", (ev) => {
  const t = ev.target;
  const semana = t.closest("[data-semana]");
  if (semana) {
    semanaAbierta = semanaAbierta === semana.dataset.semana ? "" : semana.dataset.semana;
    const bloque = semana.closest(".bloque");
    bloque.querySelectorAll("[data-semana]").forEach((b) => {
      const si = b.dataset.semana === semanaAbierta;
      b.setAttribute("aria-expanded", si);
      b.classList.toggle("semana-cat--abierta", si);
    });
    bloque.querySelectorAll(".semana-panel").forEach((p) => (p.hidden = p.id !== `semana-${semanaAbierta}`));
    return;
  }
  const desliza = t.closest("[data-desliza]");
  if (desliza) {
    const fila = desliza.closest(".ficha-panel").querySelector(".desliza");
    return fila.scrollBy({ left: Number(desliza.dataset.desliza) * fila.clientWidth * 0.9, behavior: "smooth" });
  }
  const paso = t.closest("[data-paso]");
  if (paso) return moverCarrusel(paso.closest(".carrusel"), Number(paso.dataset.paso));
  const carta = t.closest("[data-carta]");
  if (carta) {
    if (Date.now() - deslizado < 400) return; // el dedo estaba deslizando, no tocando
    // en el móvil, tocar cualquier camiseta abre su ficha; con ratón, la de un lado se pone en el centro
    if (carta.classList.contains("carta--activa") || tocado) { location.hash = carta.dataset.ficha; return; }
    const c = carta.closest(".carrusel"); c.dataset.activo = carta.dataset.carta; return colocarCarrusel(c);
  }
  const pestana = t.closest("[data-pestana]");
  if (pestana) {
    const sec = pestana.closest(".bloque");
    sec.querySelectorAll("[data-pestana]").forEach((b) => b.setAttribute("aria-selected", b === pestana));
    sec.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== pestana.dataset.pestana));
  }
});

// Deslizar el dedo por las camisetas: siguen al dedo y al soltar se quedan en la más cercana
let arrastre = null, deslizado = 0, tocado = false;
app.addEventListener("pointerdown", (ev) => {
  tocado = ev.pointerType !== "mouse";
  const pista = ev.target.closest(".carrusel-pista");
  if (!pista || ev.pointerType === "mouse") return;
  const carta = pista.querySelector(".carta");
  arrastre = { c: pista.closest(".carrusel"), x: ev.clientX, y: ev.clientY, ancho: carta.offsetWidth * 0.72, movido: false };
});
app.addEventListener("pointermove", (ev) => {
  if (!arrastre) return;
  const dx = ev.clientX - arrastre.x;
  if (!arrastre.movido && Math.abs(dx) < 8) return;
  if (!arrastre.movido && Math.abs(ev.clientY - arrastre.y) > Math.abs(dx)) { arrastre = null; return; } // está bajando la página
  arrastre.movido = true;
  arrastre.c.classList.add("carrusel--arrastre");
  const total = arrastre.c.querySelectorAll(".carta").length, activo = Number(arrastre.c.dataset.activo);
  // en los extremos cuesta más (no hay más camisetas)
  const f = dx / arrastre.ancho, fuera = activo - f < 0 || activo - f > total - 1;
  colocarCarrusel(arrastre.c, fuera ? f / 3 : f);
});
const soltar = (ev) => {
  if (!arrastre) return;
  const { c, x, ancho, movido } = arrastre;
  arrastre = null;
  c.classList.remove("carrusel--arrastre");
  if (!movido) return;
  deslizado = Date.now();
  const dx = (ev.clientX ?? x) - x;
  // un toque rápido ya pasa a la siguiente; uno largo pasa varias
  const pasos = Math.abs(dx) < ancho * 0.5 ? Math.sign(dx) : Math.round(dx / ancho);
  moverCarrusel(c, -pasos);
};
app.addEventListener("pointerup", soltar);
app.addEventListener("pointercancel", soltar);

addEventListener("keydown", (ev) => {
  const f = app.querySelector(".ficha");
  if (!f || ev.target.closest?.("input")) return;
  if (ev.key === "ArrowLeft") location.hash = f.dataset.anterior;
  if (ev.key === "ArrowRight") location.hash = f.dataset.siguiente;
  if (ev.key === "Escape") location.hash = f.dataset.volver;
});

app.addEventListener("keydown", (ev) => {
  const c = ev.target.closest?.(".carrusel");
  if (c && (ev.key === "ArrowLeft" || ev.key === "ArrowRight")) {
    moverCarrusel(c, ev.key === "ArrowLeft" ? -1 : 1);
    c.querySelector(".carta--activa")?.focus();
  }
});

// Buscador: botón redondo que despliega el campo
const botonBuscar = document.querySelector(".menu-buscar"), buscador = document.getElementById("buscador");
botonBuscar.addEventListener("click", () => {
  buscador.hidden = !buscador.hidden;
  botonBuscar.setAttribute("aria-expanded", !buscador.hidden);
  if (!buscador.hidden) buscador.q.focus();
});
buscador.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const q = buscador.q.value.trim();
  if (q) location.hash = `#/buscar/${encodeURIComponent(q)}`;
  buscador.hidden = true;
  botonBuscar.setAttribute("aria-expanded", "false");
});

function tictac() {
  for (const c of document.querySelectorAll("[data-objetivo]")) {
    const falta = Math.max(0, new Date(c.dataset.objetivo) - Date.now()) / 1000;
    [falta / 86400, (falta % 86400) / 3600, (falta % 3600) / 60].forEach((v, i) =>
      (c.children[i].firstChild.textContent = String(Math.floor(v))));
  }
}
setInterval(tictac, 15000);

document.getElementById("pie-direccion").textContent = CLUB.direccion;
Object.assign(document.getElementById("pie-email"), { href: `mailto:${CLUB.email}`, textContent: CLUB.email });
document.getElementById("pie-fuente").textContent =
  `Partidos, plantillas y clasificaciones: Real Federación Galega de Fútbol (futgal.es)${typeof ACTUALIZADO === "string" && ACTUALIZADO ? ` · actualizado ${new Date(ACTUALIZADO).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}` : ""}.`;

addEventListener("hashchange", navegar);
render();
