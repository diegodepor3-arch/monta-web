"""Trae las últimas publicaciones del Instagram del club y las guarda en instagram.js para
la sección de Noticias. Usa la API oficial de Instagram (Instagram API with Instagram Login).

Necesita la variable IG_TOKEN: token de larga duración de la cuenta profesional del club.
En GitHub va como secreto (Settings → Secrets and variables → Actions → IG_TOKEN).
Uso local: IG_TOKEN=... python instagram.py
"""
import json
import os
import urllib.parse
import urllib.request

API = "https://graph.instagram.com"
TOKEN = os.environ.get("IG_TOKEN", "").strip()
CARPETA = "img/instagram"  # las URL de imagen de Instagram caducan: se guarda una copia
MAXIMO = 12


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


def main():
    if not TOKEN:
        print("Sin IG_TOKEN: no se actualiza Instagram")
        return
    try:  # alarga la vida del token (dura 60 días desde la última renovación)
        pedir("refresh_access_token", grant_type="ig_refresh_token")
    except OSError as err:
        print("No se pudo renovar el token de Instagram:", err)

    publicaciones = pedir("me/media", limit=MAXIMO,
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

    with open("instagram.js", "w", encoding="utf-8") as f:
        f.write("// GENERADO por instagram.py desde el Instagram del club. No editar a mano.\n")
        f.write(f"const INSTAGRAM = {json.dumps(noticias, ensure_ascii=False, indent=1)};\n")
    print(f"{len(noticias)} publicaciones de Instagram en instagram.js")


if __name__ == "__main__":
    main()
