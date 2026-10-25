"""Descarga de futgal.es los equipos, plantillas, partidos y clasificaciones del club
y los guarda en federacion.js. Uso: python actualizar.py

ponytail: lee el HTML de la federación con expresiones regulares; si futgal cambia
el diseño de sus páginas habrá que ajustar los patrones de este archivo.
"""
import html
import http.cookiejar
import json
import os
import re
import sys
import time
import urllib.request
from collections import Counter
from datetime import datetime
from itertools import count

BASE = "https://www.futgal.es/pnfg/NPcd/"
CLUB = 1175  # Atlético Coruña Montañeros C.F. en futgal
TEMPORADA = 22  # 2026-2027 (código interno de futgal)
MAX_ACTAS = int(os.environ.get("MAX_ACTAS", 3))  # actas nuevas por equipo y ejecución

jar = http.cookiejar.CookieJar()
web = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
web.addheaders = [("User-Agent", "Mozilla/5.0 (web Atletico Coruna Montaneros)")]


def get(url, intentos=2):
    """futgal devuelve una página vacía si no hay sesión: la (re)abre y reintenta."""
    for i in range(intentos):
        time.sleep(3 + 10 * i)  # futgal bloquea la IP si se le piden páginas demasiado rápido
        with web.open(url, timeout=30) as r:
            s = r.read().decode("cp1252", errors="replace")
        if len(s) > 2000:
            return s
        jar.clear()
        web.open("https://www.futgal.es/pnfg/", timeout=30).read()
    raise RuntimeError(f"futgal no responde (¿IP bloqueada? reintenta más tarde): {url}")


def texto(s):
    s = re.sub(r"<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s).replace("\xa0", " ")).strip()


def filas(s):
    return re.findall(r"<tr.*?</tr>", s, flags=re.S)


def celdas(fila):
    return [texto(c) for c in re.findall(r"<td.*?>(.*?)</td>", fila, flags=re.S)]


# La federación escribe muchos nombres sin tilde. Solo palabras sin duda; las dudosas se dejan como vienen.
ACENTOS = {w.translate(str.maketrans("áéíóúÁÓ", "aeiouAO")): w for w in """
    Aarón Adrián Alegría Álvarez Álvaro Andrés Ángel Antón Añón Arévalo Bermúdez Bernárdez Cibrán
    Cortés Darío Díaz Domínguez Durán Eirín Enríquez Fernández Galán García Gómez González Gundín
    Gutiérrez Hernández Ibáñez Iván Jesús Jiménez Joaquín José Lobón López Mantiñán María Martín
    Martínez Méndez Nicolás Óscar Pérez Piñón Ramírez Ramón Rifón Río Ríos Rodríguez Román Rubén
    Sánchez Santamaría Saúl Sebastián Simeón Solís Suárez Tomás Tomé Uría Uzcátegui Valentín
    Vázquez Yáñez""".split()}


def acentos(s):
    return re.sub(r"[^\W\d_]+", lambda m: ACENTOS.get(m.group(), m.group()), s)


def nombre_persona(s):
    apellidos, _, nombre = s.partition(",")
    return acentos(f"{nombre.strip()} {apellidos.strip()}".strip().title())


def es_club(nombre):
    return "MONTA" in nombre.upper() and "CORU" in nombre.upper()


def categoria(cat):
    c = cat.upper()
    for clave, cid in [("PREBENJAMIN", "prebenjamin"), ("BENJAMIN", "benjamin"), ("ALEVIN", "alevin"),
                       ("INFANTIL", "infantil"), ("CADETE", "cadete"), ("XUVENIL", "juvenil"), ("JUVENIL", "juvenil")]:
        if clave in c:
            return cid
    return "senior"


def equipos_del_club():
    s = get(f"{BASE}NFG_VerClub?cod_primaria=1000118&codigo_club={CLUB}")
    out = []
    for f in filas(s):
        m = re.search(r"Codigo_Equipo=(\d+)", f)
        if m:
            c = celdas(f)
            out.append((m.group(1), c[0], c[-1]))
    return out


def lista_personas(s, titulo):
    m = re.search(titulo + r".*?</thead>(.*?)</table>", s, flags=re.S)
    return [nombre_persona(texto(td)) for td in re.findall(r"<td>(.*?)</t[dr]>", m.group(1), flags=re.S)] if m else []


def competicion_actual(cod):
    s = get(f"{BASE}NFG_VisCompeticiones_Equipo?cod_primaria=1000123&codequipo={cod}&codtemporada={TEMPORADA}")
    temporada = s[s.find("</thead>"):].split("</table>")[0]
    for f in filas(temporada):
        m = re.search(r"codcompeticion=(\d+)'>(.*?)</a>.*?codgrupo=(\d+)'>(.*?)</a>", f, flags=re.S)
        # La liga, no copas ni torneos amistosos
        if m and not re.search(r"COPA|TORNEO|NO OFICIAL|ELIMINATORIA", texto(m.group(2)).upper()):
            return m.group(1), texto(m.group(2)), m.group(3), texto(m.group(4))
    return None


def clasificacion(comp, grupo):
    s = get(f"{BASE}NFG_VisClasificacion?cod_primaria=1000120&codgrupo={grupo}&codcompeticion={comp}")
    tabla, vistos = [], set()
    for f in filas(s):
        c = celdas(f)
        # Tabla detallada: pos, equipo, [pts/pj], pts, J G E P casa, J G E P fuera, GF, GC
        n = [int(x) for x in c[3:] if x.isdigit()]
        if "codequipo=" not in f or len(n) < 11 or c[2] in vistos:
            continue
        vistos.add(c[2])
        tabla.append({"equipo": c[2], "pts": n[0], "pj": n[1] + n[5], "g": n[2] + n[6], "e": n[3] + n[7],
                      "p": n[4] + n[8], "gf": n[9], "gc": n[10], "propio": es_club(c[2])})
    return tabla


def partidos(cod, grupo):
    s = get(f"{BASE}NFG_VisCompeticiones_Grupo?cod_primaria=1000123&codequipo={cod}&codgrupo={grupo}")
    out = []
    for f in filas(s):
        h5 = [texto(x) for x in re.findall(r"<h5.*?>(.*?)</h5>", f, flags=re.S)]
        if len(h5) < 4 or not h5[0].isdigit():
            continue
        local, visitante = h5[1], h5[2]
        m = re.match(r"(\d\d)-(\d\d)-(\d{4})\s*(\d\d:\d\d)?", h5[3])
        res = re.findall(r"\d+", h5[4]) if len(h5) > 4 else []
        out.append({
            "jornada": int(h5[0]),
            "fecha": f"{m.group(3)}-{m.group(2)}-{m.group(1)}" if m else "",
            "hora": (m.group(4) or "") if m else "",
            "local": es_club(local),
            "rival": visitante if es_club(local) else local,
            "resultado": f"{res[0]}-{res[1]}" if len(res) >= 2 else "",
            "campo": "",
        })
    return out


def jornada(comp, grupo, num):
    return get(f"{BASE}NFG_CmpJornada?cod_primaria=1000120&CodCompeticion={comp}&CodGrupo={grupo}"
               f"&CodTemporada={TEMPORADA}&CodJornada={num}")


def escudos(s):
    """Empareja cada nombre de equipo de la jornada con el escudo más cercano en el HTML."""
    imgs = [(m.start(), m.group(1)) for m in re.finditer(r'<img src="(https?://[^"]+/pimg/Clubes/[^"]+)"', s)]
    out = {}
    for m in re.finditer(r'Codigo_Equipo=\d+">(.*?)</a>', s, flags=re.S):
        if imgs:
            out[texto(m.group(1))] = min(imgs, key=lambda x: abs(x[0] - m.start()))[1]
    return out


def leer_acta(s):
    """Lo que hizo cada jugador del club en un partido: t=titular, s=suplente, e=entró,
    g=goles, a=amarillas, r=rojas, d=dorsal."""
    acta = {"t": [], "s": [], "e": [], "g": {}, "a": [], "r": [], "d": {}}
    for bloque in re.split(r"class=number[^>]*>", s)[1:]:
        if not es_club(texto(bloque.split("</div>")[0])):
            continue
        cuerpo = bloque.split("Cuerpo T")[0]
        corte = cuerpo.find("Suplentes") if "Suplentes" in cuerpo else len(cuerpo)
        for parte, clave in ((cuerpo[:corte], "t"), (cuerpo[corte:], "s")):
            for f in filas(parte):
                c = [x for x in celdas(f) if x]
                if len(c) >= 2 and c[0].isdigit():
                    n = nombre_persona(c[1])
                    acta[clave].append(n)
                    acta["d"][n] = int(c[0])
        break
    nuestros = set(acta["t"]) | set(acta["s"])
    nombre_fila = lambda html_: nombre_persona(re.sub(r"\([^)]*\)", "", texto(html_)).strip())  # quita el minuto: (85') o (90'+1)
    for m in re.finditer(r'title="?(Gol[^">]*)"?.*?</strong></td>\s*<td[^>]*>(.*?)</td>', s, flags=re.S):
        n = nombre_fila(m.group(2))
        if "ropia" not in m.group(1) and n in nuestros:  # los goles en propia puerta no cuentan para el jugador
            acta["g"][n] = acta["g"].get(n, 0) + 1
    for m in re.finditer(r"tarj_(\w+)\.gif.*?</td>\s*<td[^>]*>(.*?)</td>", s, flags=re.S):
        n = nombre_fila(m.group(2))
        if n in nuestros:
            acta["r" if ("roj" in m.group(1) or "2" in m.group(1)) else "a"].append(n)
    for f in filas(s[s.find("Sustituciones"):]):
        if "arrow-up" in f or "font-green" in f:  # entra: flecha hacia arriba (RFEF) o flecha verde (futgal)
            n = next((nombre_persona(x) for x in celdas(f) if "," in x), None)
            if n in acta["s"]:
                acta["e"].append(n)
    return acta


def dorsales(actas_):
    """El dorsal más reciente de cada jugador. Si así se repite algún número (equipos sin dorsal fijo),
    cada número es para quien más partidos lo ha llevado, primero del 1 al 11 y luego los demás;
    quien se queda sin ninguno recibe el primer número libre del 12 en adelante."""
    reciente = {n: d for j in sorted(actas_, key=int) for n, d in actas_[j]["d"].items()}
    if len(set(reciente.values())) == len(reciente):
        return reciente
    usos = Counter((n, d) for a in actas_.values() for n, d in a["d"].items())
    jugados = Counter(n for a in actas_.values() for n in a["d"])
    out = {}
    for titulares in (True, False):
        for (n, d), _ in sorted(usos.items(), key=lambda x: (-x[1], x[0][1], x[0][0])):
            if (d <= 11) == titulares and n not in out and d not in out.values():
                out[n] = d
    for n in sorted(jugados.keys() - out.keys(), key=lambda n: (-jugados[n], n)):
        out[n] = next(d for d in count(12) if d not in out.values())
    return out


def acta_html(cod_acta):
    """Copia local de cada acta (.cache/): si cambia la forma de leerla no hay que volver a pedirla a futgal."""
    ruta = os.path.join(".cache", f"acta-{cod_acta}.html")
    if os.path.exists(ruta):
        with open(ruta, encoding="utf-8") as f:
            return f.read()
    s = get(f"{BASE}NFG_CmpPartido?cod_primaria=1000120&CodActa={cod_acta}")
    os.makedirs(".cache", exist_ok=True)
    with open(ruta, "w", encoding="utf-8") as f:
        f.write(s)
    return s


def actas(cod, comp, grupo, jugados, previas):
    """Actas de los partidos jugados. Las ya leídas se guardan y solo se piden las nuevas."""
    out = dict(previas or {})
    for j, a in out.items():  # las que tienen copia local se vuelven a leer gratis (por si mejora la lectura)
        if a.get("id") and os.path.exists(os.path.join(".cache", f"acta-{a['id']}.html")):
            out[j] = dict(leer_acta(acta_html(a["id"])), id=a["id"])
    nuevas = [p for p in jugados if str(p["jornada"]) not in out or not out[str(p["jornada"])].get("id")]
    for p in nuevas[-MAX_ACTAS:]:  # ponytail: pocas actas por ejecución para no provocar el bloqueo de futgal
        s = jornada(comp, grupo, p["jornada"])
        i = s.find(f"Codigo_Equipo={cod}\"")
        cerca = [(abs(m.start() - i), m.group(1)) for m in re.finditer(r"CodActa=(\d+)", s)]
        if i >= 0 and cerca:
            cod_acta = min(cerca)[1]
            out[str(p["jornada"])] = dict(leer_acta(acta_html(cod_acta)), id=cod_acta)
    return out


def completar_proximo(p, cod, comp, grupo, e):
    """El calendario no trae el campo: lo saca de la página de la jornada (y de paso los escudos)."""
    s = jornada(comp, grupo, p["jornada"])
    e["escudos"] = escudos(s)
    i = s.find(f"Codigo_Equipo={cod}\"")
    if i < 0:
        return
    bloque = s[i:i + 6000]
    campo = re.search(r"Codigo_Campo=\d+\">(.*?)</a>", bloque, flags=re.S)
    hora = re.search(r"class=horario[^>]*>(.*?)</span>", bloque, flags=re.S)
    if campo:
        p["campo"] = texto(campo.group(1))
    if hora and (h := re.search(r"\d\d:\d\d", hora.group(1))):
        p["hora"] = h.group(0)


LAPREFERENTE = "https://www.lapreferente.com/E4431C27379/atl-monta%C3%B1eros-cf"


def perfiles_lapreferente():
    """Edad y posición de los jugadores del primer equipo. La federación no las publica;
    salen de lapreferente.com (web pública, no oficial). Se pide como mucho una vez por semana."""
    with web.open(LAPREFERENTE, timeout=30) as r:
        s = r.read().decode("latin-1")
    out = {}
    for f in re.findall(r"<tr[^>]*>(.*?)</tr>", s, flags=re.S):
        if "plantillaDorsal" not in f:
            continue
        nombre = re.search(r"<a [^>]*>\s*<span[^>]*>(.*?)</span>.*?<span>(.*?)</span>", f, flags=re.S)
        posicion = re.search(r'min-width:152px"><span>(.*?)</span>', f)
        edad = re.search(r"demarcaciones/[^>]*></td>\s*<td><span>(\d+)</span>", f)  # "-" si no la tienen
        if nombre and posicion:
            out[texto(nombre.group(2)) or texto(nombre.group(1))] = {
                "posicion": texto(posicion.group(1)), "edad": int(edad.group(1)) if edad else None}
    return out


def descargar_equipo(cod, nombre, cat, anterior=None):
    ficha = get(f"{BASE}NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo={cod}")
    letra = re.search(r'"([A-Z])"', nombre)
    cid = categoria(cat)
    e = {
        "id": "primer-equipo" if cid == "senior" else
              f"{cid}-{(letra.group(1) if letra else 'a').lower()}{'-f11' if 'F-11' in cat else ''}",
        "codigo": cod,
        "categoria": cid,
        "letra": letra.group(1) if letra else "A",
        "liga": cat.title(),
        "urlFederacion": f"https://www.futgal.es/pnfg/NPcd/NFG_VisEquipos?cod_primaria=1000119&Codigo_Equipo={cod}",
        "plantilla": lista_personas(ficha, "Jugadores"),
        "entrenadores": lista_personas(ficha, "cnicos"),
        "delegados": lista_personas(ficha, "Delegados"),
        "clasificacion": [],
        "partidos": [],
    }
    comp = competicion_actual(cod)
    if comp:
        cc, cnombre, grupo, gnombre = comp
        e["competicion"] = f"{cnombre.title()} · {gnombre.title()}"
        e["urlClasificacion"] = f"https://www.futgal.es/pnfg/NPcd/NFG_VisClasificacion?cod_primaria=1000120&codgrupo={grupo}&codcompeticion={cc}"
        e["clasificacion"] = clasificacion(cc, grupo)
        e["partidos"] = partidos(cod, grupo)
        proximo = next((p for p in e["partidos"] if not p["resultado"]), None)
        if proximo:
            completar_proximo(proximo, cod, cc, grupo, e)
        # actas de todas las categorías: estadísticas y dorsal de cada jugador
        e["actas"] = actas(cod, cc, grupo, [p for p in e["partidos"] if p["resultado"]], (anterior or {}).get("actas"))
        e["dorsales"] = dorsales(e["actas"])
    if cid == "senior":
        previo_p = (anterior or {}).get("perfiles", {})
        e["perfiles"] = previo_p
        if not previo_p or (datetime.now() - datetime.fromisoformat(previo_p.get("fecha", "2000-01-01"))).days >= 7:
            try:
                e["perfiles"] = {"fecha": datetime.now().isoformat(timespec="minutes"), "jugadores": perfiles_lapreferente()}
            except (OSError, ValueError) as err:  # si falla, se quedan los de la semana anterior
                print("lapreferente no disponible:", err)
    e["descargado"] = datetime.now().isoformat(timespec="minutes")
    return e


def leer_previo():
    try:
        with open("federacion.js", encoding="utf-8") as f:
            datos = re.search(r"const EQUIPOS = (.*);\s*$", f.read(), flags=re.S).group(1)
        return {e["codigo"]: e for e in json.loads(datos)}
    except (OSError, AttributeError, ValueError):
        return {}


def guardar(equipos):
    with open("federacion.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por actualizar.py desde futgal.es. No editar a mano.\n")
        f.write(f"const ACTUALIZADO = {json.dumps(max(e.get('descargado', '') for e in equipos))};\n")
        f.write(f"const EQUIPOS = {json.dumps(equipos, ensure_ascii=False, indent=1)};\n")


def main():
    """futgal bloquea la IP tras unas decenas de páginas seguidas. Por eso cada equipo
    se guarda al momento y cada ejecución empieza por los equipos con datos más viejos:
    programado cada hora, todos se mantienen al día aunque futgal corte a mitad."""
    previo = leer_previo()
    club = equipos_del_club()
    pendientes = sorted(club, key=lambda t: previo.get(t[0], {}).get("descargado", ""))
    # python actualizar.py senior juvenil -> esas categorías primero
    pendientes.sort(key=lambda t: categoria(t[2]) not in sys.argv[1:])
    try:
        for cod, nombre, cat in pendientes:
            print("·", nombre, "|", cat, flush=True)
            previo[cod] = descargar_equipo(cod, nombre, cat, previo.get(cod))
            guardar([previo[c] for c, _, _ in club if c in previo])
    except (RuntimeError, OSError) as err:
        print("Parado, se sigue en la próxima ejecución:", err)
    listos = sum(1 for c, _, _ in club if previo.get(c, {}).get("descargado"))
    print(f"{listos} de {len(club)} equipos al día en federacion.js")
    pendientes_actas = sum(1 for e in previo.values() for p in e.get("partidos", [])
                           if p["resultado"] and not e.get("actas", {}).get(str(p["jornada"]), {}).get("id"))
    print(f"Actas pendientes: {pendientes_actas}")


if __name__ == "__main__":
    main()
