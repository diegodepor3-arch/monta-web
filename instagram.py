"""Trae las publicaciones del Instagram del club y las guarda en instagram.js para la sección de
Noticias. Dos fuentes, se pueden usar las dos a la vez:

1. Formulario de Google (lo más fácil): el entrenador pega el enlace del post en el formulario y
   aquí se leen las respuestas desde la hoja publicada como CSV (FORMULARIO_CSV). La web enseña
   cada post con el recuadro oficial de Instagram: no hace falta token.
2. API oficial de Instagram con inicio de sesión de Facebook (IG_TOKEN), si algún día se configura.

Necesita la variable IG_TOKEN: token de la página de Facebook conectada al Instagram del club
(el token de página sacado de un token de usuario de larga duración no caduca).
En GitHub va como secreto (Settings → Secrets and variables → Actions → IG_TOKEN).
Uso local: IG_TOKEN=... python instagram.py
"""
import csv
import io
import json
import os
import re
import urllib.parse
import urllib.request

API = "https://graph.facebook.com"
TOKEN = os.environ.get("IG_TOKEN", "").strip()
CARPETA = "img/instagram"  # las URL de imagen de Instagram caducan: se guarda una copia
MAXIMO = 12

# Hoja «Web monta (respuestas)» del formulario forms.gle/kmRRCFJz2KLKE5pu8, descargada como CSV.
# La hoja tiene que estar compartida como «Cualquier persona con el enlace» (lector). Vacío: no se usa.
FORMULARIO_CSV = "https://docs.google.com/spreadsheets/d/13htDPty2XAdtLpmolK8_rN_g1m27l8c45ljlqzIZWAk/export?format=csv"
MAXIMO_FORMULARIO = 30
POST = re.compile(r"instagram\.com/(?:[\w.]+/)?(p|reels?|tv)/([\w-]+)")


def pedir(ruta, **params):
    params["access_token"] = TOKEN
    with urllib.request.urlopen(f"{API}/{ruta}?{urllib.parse.urlencode(params)}", timeout=30) as r:
        return json.load(r)


def recortar(texto, n):
    return texto if len(texto) <= n else texto[: n - 1].rsplit(" ", 1)[0] + "…"


def a_noticia(p):
    """Una publicación con la forma de las noticias de data.js (más imagen y enlace)."""
    texto = (p.get("caption") or "").strip()
    lineas = [l.strip() for l in texto.splitlines() if l.strip()]
    sin_hashtags = [l for l in lineas if not l.startswith("#")]
    return {
        "id": f"ig-{p['id']}",
        "fecha": p["timestamp"][:10],
        "titulo": recortar(sin_hashtags[0] if sin_hashtags else "Publicación en Instagram", 90),
        "resumen": recortar(" ".join(sin_hashtags[1:]), 160),
        "cuerpo": texto,
        "imagen": f"{CARPETA}/{p['id']}.jpg",
        "enlace": p["permalink"],
        "video": p["media_type"] == "VIDEO",
    }


def codigo(enlace):
    m = POST.search(enlace or "")
    return m and m.group(2)


def desde_formulario():
    """Una noticia por cada enlace de Instagram enviado en el formulario (sin repetir), la más nueva primero.
    Google pone la fecha de envío en la primera columna («Marca temporal», 10/11/2026 12:34:56)."""
    req = urllib.request.Request(FORMULARIO_CSV, headers={"User-Agent": "Mozilla/5.0 (web Atletico Coruna Montaneros)"})
    with urllib.request.urlopen(req, timeout=30) as r:
        if "csv" not in r.headers.get("Content-Type", ""):  # hoja privada: Google manda la página de entrar
            raise RuntimeError("La hoja del formulario no se puede leer: compártela con «cualquier persona con el enlace»")
        filas = list(csv.reader(io.StringIO(r.read().decode("utf-8"))))
    vistos, out = set(), []
    for fila in reversed(filas[1:]):
        m = next((POST.search(c) for c in fila if POST.search(c)), None)
        f = re.match(r"(\d{1,2})/(\d{1,2})/(\d{4})", fila[0] if fila else "")
        if not m or not f or m.group(2) in vistos:
            continue
        vistos.add(m.group(2))
        tipo = "reel" if m.group(1).startswith("reel") else m.group(1)
        out.append({
            "id": f"igf-{m.group(2)}",
            "fecha": f"{f.group(3)}-{int(f.group(2)):02d}-{int(f.group(1)):02d}",
            "titulo": "Publicación en Instagram", "resumen": "", "cuerpo": "",
            "enlace": f"https://www.instagram.com/{tipo}/{m.group(2)}/",
            "video": tipo != "p",
            "embed": True,  # la web lo enseña con el recuadro de Instagram
        })
    return out[:MAXIMO_FORMULARIO]


def desde_api():
    cuenta = pedir("me", fields="instagram_business_account")["instagram_business_account"]["id"]
    publicaciones = pedir(f"{cuenta}/media", limit=MAXIMO,
                          fields="id,caption,media_type,media_url,thumbnail_url,permalink,timestamp")["data"]
    os.makedirs(CARPETA, exist_ok=True)
    noticias = []
    for p in publicaciones:
        url = p.get("thumbnail_url") if p["media_type"] == "VIDEO" else p.get("media_url")
        ruta = os.path.join(CARPETA, f"{p['id']}.jpg")
        if url and not os.path.exists(ruta):
            urllib.request.urlretrieve(url, ruta)
        if os.path.exists(ruta):
            noticias.append(a_noticia(p))

    # Fuera las fotos de publicaciones que ya no están entre las últimas
    actuales = {f"{p['id']}.jpg" for p in publicaciones}
    for f in os.listdir(CARPETA):
        if f not in actuales and f != ".gitkeep":
            os.remove(os.path.join(CARPETA, f))
    return noticias


def main():
    if not TOKEN and not FORMULARIO_CSV:
        print("Sin IG_TOKEN ni FORMULARIO_CSV: no se actualiza Instagram")
        return
    # Si una fuente falla no se escribe nada: así no desaparecen las noticias que ya había
    noticias = desde_api() if TOKEN else []
    ya = {codigo(n["enlace"]) for n in noticias}  # un post que llega por las dos vías sale una vez
    noticias += [n for n in (desde_formulario() if FORMULARIO_CSV else []) if codigo(n["enlace"]) not in ya]
    with open("instagram.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por instagram.py desde el Instagram del club. No editar a mano.\n")
        f.write(f"const INSTAGRAM = {json.dumps(noticias, ensure_ascii=False, indent=1)};\n")
    print(f"{len(noticias)} publicaciones de Instagram en instagram.js")


if __name__ == "__main__":
    main()
