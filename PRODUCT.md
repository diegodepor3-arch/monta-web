# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

HTML, CSS y JavaScript estáticos, sin frameworks. Código en GitHub, publicado en Vercel con dominio propio (pendiente). Los datos de la federación los genera `actualizar.py` en `federacion.js`, pensado para ejecutarse de forma programada (GitHub Actions) y redesplegar.

## Users

Todos por igual (confirmado por el club):
- Familias de la cantera: a qué hora y en qué campo juega su hijo el fin de semana, sobre todo desde el móvil.
- Aficionados del primer equipo (Tercera Federación): resultados, clasificación, vídeos.
- Jugadores y entrenadores: plantilla, rivales, calendario.
- Patrocinadores y prensa: imagen del club, noticias.

## Product Purpose

Web informativa oficial del Atlético Coruña Montañeros C.F. (A Coruña). Reúne en un sitio el primer equipo y toda la cantera ("Canteira Morada", de prebenjamín a juvenil), con partidos, resultados y clasificaciones sacados automáticamente de la Real Federación Galega de Fútbol (futgal.es). Éxito: nadie tiene que entrar en futgal para saber cuándo y dónde juega un equipo del club.

## Positioning

Es el único sitio con los 20 equipos del club juntos y al día: un padre ve el partido de su hijo de benjamín al lado del partido del primer equipo, en una sola portada de la semana.

## Operating Context

- Uso principal: el fin de semana de partidos, en el móvil, a menudo en la banda del campo.
- Los datos vienen de futgal.es (club código 1175). futgal bloquea temporalmente la IP si se le piden páginas demasiado rápido.
- Campos habituales: Grela, Torre, etc. (vienen de la federación).

## Capabilities and Constraints

- Secciones: Inicio (carrusel de partidos de la semana de todas las categorías + noticias), Primer equipo (plantilla, clasificación, partidos, highlights y entrevistas de TVG/Tivigal vía YouTube), Canteira Morada (tarjeta por categoría → subtarjeta por equipo A/B/C/D → plantilla, entrenadores, clasificación, partidos), Noticias, buscador interno.
- Protección de menores: fotos de jugadores solo en juvenil y primer equipo; el código lo fuerza.
- La federación no publica dorsales ni fotos de jugadores, ni una ficha individual pública por jugador: el enlace va a la ficha del equipo en futgal.
- Highlights: se insertan, no se copian, los vídeos de TVG/Tivigal.

## Brand Commitments

- Nombre: Atlético Coruña Montañeros C.F. Cantera: "Canteira Morada".
- Color del club: morado (camiseta, pantalón y medias morados según la federación).
- Idioma: castellano (con términos gallegos propios como "Canteira").

## Evidence on Hand

- El club tiene escudo en buena calidad, fotos de jugadores y fotos de partidos/campo, pero aún no las ha entregado: se usan marcadores claramente señalados para sustituir.
- Datos reales de la federación en `federacion.js`.
- No inventar resultados, fichajes, patrocinadores ni declaraciones.

## Product Principles

1. Lo primero es cuándo y dónde se juega: fecha, hora, campo y rival a un vistazo.
2. Toda la cantera tiene el mismo peso que el primer equipo.
3. Datos automáticos de la federación; lo manual se limita a noticias, vídeos y fotos.
4. La seguridad de los menores no es negociable.

## Accessibility & Inclusion

Público general de todas las edades, muy de móvil y al aire libre (sol en la banda): contraste alto y textos legibles.
