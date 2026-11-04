"""Recorta las fotos del primer equipo para la ficha del jugador: quita el fondo, corta por la
cintura y deja a todos a la misma escala. Lee "Fotos primer equipo/*.jpeg" y escribe
img/jugadores/<nombre>.webp transparente. Qué foto es de quién se dice en data.js (EXTRA.fotos).
Uso: python fotos.py [fotos...]   (necesita: pip install pillow numpy rembg opencv-python-headless)

La medida común es la cara: mide siempre lo mismo y queda a la misma altura y centrada, así da
igual a qué distancia se hiciera cada foto. La cintura cae a CINTURA caras por debajo de la frente;
si la foto original ya venía cortada más arriba, su borde de abajo se funde en vez de cortar seco.
Modelos: rembg baja el suyo a ~/.u2net; el de caras (YuNet, 230 KB) va en .cache/yunet.onnx.
"""
import glob
import os
import re
import sys
import unicodedata
import urllib.request

import cv2
import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove

ORIGEN = "Fotos primer equipo"
CARPETA = "img/jugadores"
TRABAJO = 3200  # lado largo al que se procesa: así ninguna cara hay que ampliarla
ANCHO, ALTO = 900, 1100  # foto final
CARA = 178  # alto de la cara en la foto final
ARRIBA = 1.6  # caras de aire sobre la frente (pelo y manos levantadas)
CINTURA = ALTO / CARA - ARRIBA  # caras de la frente a la cintura (~4,6): el borde de abajo
FUNDIDO = 130  # px del borde de abajo que se desvanecen
YUNET = ".cache/yunet.onnx"
URL_YUNET = "https://github.com/opencv/opencv_zoo/raw/main/models/face_detection_yunet/face_detection_yunet_2023mar.onnx"


def nombre_local(ruta):
    base = os.path.splitext(os.path.basename(ruta))[0]
    base = unicodedata.normalize("NFKD", base).encode("ascii", "ignore").decode().lower()
    return f"{CARPETA}/{re.sub(r'[^a-z0-9]+', '-', base).strip('-')}.webp"


def cara(img):
    """(x, y, ancho, alto) de la cara más clara de la foto, o None."""
    peque = img.copy()
    peque.thumbnail((1280, 1280))
    f = img.width / peque.width
    det = cv2.FaceDetectorYN.create(YUNET, "", peque.size, 0.6)
    _, caras = det.detect(cv2.cvtColor(np.asarray(peque), cv2.COLOR_RGB2BGR))
    if caras is None:
        return None
    x, y, w, h = max(caras, key=lambda c: c[14])[:4]
    return x * f, y * f, w * f, h * f


def recortar(img, recorte, c):
    x, y, w, h = c
    escala = CARA / h
    recorte = recorte.resize((round(recorte.width * escala), round(recorte.height * escala)), Image.LANCZOS)
    final = Image.new("RGBA", (ANCHO, ALTO))
    # frente a ARRIBA caras del borde de arriba y cara centrada
    final.paste(recorte, (round(ANCHO / 2 - (x + w / 2) * escala), round(ARRIBA * CARA - y * escala)))
    # fundido en el borde de abajo: la cintura, o donde acabe la foto si venía cortada más arriba
    a = np.asarray(final).copy()
    filas = np.flatnonzero(a[..., 3].max(axis=1) > 0)
    fin = filas[-1] + 1
    rampa = np.clip((fin - np.arange(ALTO)) / FUNDIDO, 0, 1)
    a[..., 3] = (a[..., 3] * rampa[:, None]).astype(np.uint8)
    return Image.fromarray(a), escala


def main():
    os.makedirs(CARPETA, exist_ok=True)
    if not os.path.exists(YUNET):
        os.makedirs(os.path.dirname(YUNET), exist_ok=True)
        urllib.request.urlretrieve(URL_YUNET, YUNET)
    sesion = new_session("birefnet-portrait")
    rutas = sorted(glob.glob(f"{ORIGEN}/*.jp*g")) if len(sys.argv) < 2 else sys.argv[1:]
    for ruta in rutas:
        img = ImageOps.exif_transpose(Image.open(ruta)).convert("RGB")
        img.thumbnail((TRABAJO, TRABAJO), Image.LANCZOS)
        c = cara(img)
        if c is None:
            print("Sin cara, no se hace:", ruta)
            continue
        final, escala = recortar(img, remove(img, session=sesion), c)
        destino = nombre_local(ruta)
        final.save(destino, "WEBP", quality=88, method=6)
        # escala > 1 = la foto se amplía: si pasa mucho, se nota menos nítida que las demás
        print(f"· {destino}  escala {escala:.2f}{'  (ampliada)' if escala > 1 else ''}")


if __name__ == "__main__":
    main()
