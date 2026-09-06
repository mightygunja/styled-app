"""Composite the app's Home screen into the mirror on the splash hero.

Inputs:
  assets/splash-hero-source.png   the room photograph as it stood before this
                                  script - it still carries the previous
                                  wordmark inside the panel, which is fine
                                  because the panel is overwritten wholesale
  assets/Splash image.jpeg        an iOS Home screen capture. NOT in the repo:
                                  this project is public and the raw capture
                                  names a real account holder. Supply it
                                  locally to re-run.
Output:
  assets/splash-hero.png

Two things happen here.

1. NAME SWAP. The capture greets a real account holder by first name. The
   splash ships publicly on every launch, so the name is replaced with
   "Amara". It is redrawn in the app's own PlayfairDisplay italic at the
   app's own camel (#B89664), sized by calibration rather than guesswork:
   rendering "Durriya" at 34px reproduces the original's 117px width and
   26px cap height, so 34px is what the replacement uses.

2. COMPOSITE. The mirror's lit panel is not axis-aligned - the mirror leans,
   so the panel is a slight quadrilateral measured off the photograph. The
   capture is perspective-mapped onto that quad, rounded at the corners to
   match the panel, then multiplied by the panel's own lighting field. That
   last step is what keeps it from looking pasted: the field is the original
   panel blurred flat, so the new content inherits the same warm glow and the
   same falloff toward the edges that the photograph already had.

Run:  python scripts/generateSplashHero.py
"""

from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np

HERO_SRC = 'assets/splash-hero-source.png'
SHOT_SRC = 'assets/Splash image.jpeg'
TARGET = 'assets/splash-hero.png'

FONT_ITALIC = 'node_modules/@expo-google-fonts/playfair-display/400Regular_Italic/PlayfairDisplay_400Regular_Italic.ttf'
FONT_ROMAN = 'node_modules/@expo-google-fonts/playfair-display/400Regular/PlayfairDisplay_400Regular.ttf'

NEW_NAME = 'Amara'
FONT_PX = 34            # calibrated against the original word, see docstring
NAME_LEFT = 170         # italic A sits 2px left of its origin; lands the ink edge on 168
NAME_BASELINE = 256
PERIOD_GAP = 1          # yields the original's 6px visual gap after the name
CAMEL = (184, 150, 100)  # #B89664, colors.camel
INK = (28, 28, 28)       # #1C1C1C, colors.ink
ERASE_BOX = [160, 222, 302, 268]  # old name plus its descender and the period

STATUS_BAR_H = 60       # drops the clock, the "TestFlight" back link and the battery

# Panel interior, measured off the photograph (see the bbox scan in git history).
PANEL = [(236, 356), (430, 361), (430, 794), (244, 799)]  # TL, TR, BR, BL
CORNER_R = 14           # matches the panel's rounded corners
SHEEN = 0.10            # a little of the original panel left on top, as glass


def swap_name(shot: Image.Image) -> Image.Image:
    shot = shot.convert('RGB')
    arr = np.asarray(shot)
    background = tuple(int(v) for v in np.median(arr[228:266, 310:460].reshape(-1, 3), axis=0))

    draw = ImageDraw.Draw(shot)
    draw.rectangle(ERASE_BOX, fill=background)
    italic = ImageFont.truetype(FONT_ITALIC, FONT_PX)
    roman = ImageFont.truetype(FONT_ROMAN, FONT_PX)
    draw.text((NAME_LEFT, NAME_BASELINE), NEW_NAME, font=italic, fill=CAMEL, anchor='ls')
    width = draw.textlength(NEW_NAME, font=italic)
    draw.text((NAME_LEFT + width + PERIOD_GAP, NAME_BASELINE), '.', font=roman, fill=INK, anchor='ls')
    return shot


def fit_to_panel(shot: Image.Image, aspect: float) -> Image.Image:
    """Match the panel's aspect by PADDING top and bottom, never by cropping
    the sides. The capture is relatively wider than the panel, and taking the
    difference off the margins clips real UI - the date, the greeting and the
    occasion chips all run close to the edges, and the first attempt sliced
    "SATURDAY" and "WORK" in half. Padding uses the screen's own edge colour,
    so it reads as the app inset in the frame rather than as letterboxing."""
    shot = shot.crop((0, STATUS_BAR_H, shot.width, shot.height))
    want_h = int(round(shot.width / aspect))
    if want_h <= shot.height:
        off = (shot.height - want_h) // 2
        return shot.crop((0, off, shot.width, off + want_h))

    arr = np.asarray(shot.convert('RGB'))
    top = tuple(int(v) for v in np.median(arr[:6].reshape(-1, 3), axis=0))
    bottom = tuple(int(v) for v in np.median(arr[-6:].reshape(-1, 3), axis=0))
    pad = want_h - shot.height
    pad_top, pad_bottom = pad // 2, pad - pad // 2
    canvas = Image.new('RGB', (shot.width, want_h), top)
    canvas.paste(Image.new('RGB', (shot.width, pad_bottom), bottom), (0, want_h - pad_bottom))
    canvas.paste(shot, (0, pad_top))
    return canvas


def perspective_coeffs(dst_quad, src_size):
    """Coefficients mapping DESTINATION -> SOURCE, which is the direction
    Image.transform(PERSPECTIVE) wants."""
    w, h = src_size
    src_quad = [(0, 0), (w, 0), (w, h), (0, h)]
    matrix = []
    for (dx, dy), (sx, sy) in zip(dst_quad, src_quad):
        matrix.append([dx, dy, 1, 0, 0, 0, -sx * dx, -sx * dy])
        matrix.append([0, 0, 0, dx, dy, 1, -sy * dx, -sy * dy])
    A = np.array(matrix, dtype=float)
    B = np.array(src_quad, dtype=float).reshape(8)
    return np.linalg.solve(A, B)


def rounded_mask(size, radius):
    mask = Image.new('L', size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size[0] - 1, size[1] - 1], radius=radius, fill=255)
    return mask


def main() -> None:
    hero = Image.open(HERO_SRC).convert('RGB')
    shot = swap_name(Image.open(SHOT_SRC))

    xs = [p[0] for p in PANEL]
    ys = [p[1] for p in PANEL]
    panel_w = (xs[1] - xs[0] + xs[2] - xs[3]) / 2
    panel_h = (ys[3] - ys[0] + ys[2] - ys[1]) / 2
    shot = fit_to_panel(shot, panel_w / panel_h)

    # Render the capture at panel scale first so the rounded corners are crisp.
    scaled = shot.resize((int(round(panel_w)), int(round(panel_h))), Image.LANCZOS)
    mask_flat = rounded_mask(scaled.size, CORNER_R)

    coeffs = perspective_coeffs(PANEL, scaled.size)
    warped = scaled.transform(hero.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)
    mask = mask_flat.transform(hero.size, Image.PERSPECTIVE, coeffs, Image.BICUBIC)

    # Lighting field: the panel as the photograph already lit it, blurred flat.
    # MaxFilter first - the snapshot still carries the previous wordmark inside
    # the panel, and blurring straight over it would bake a dark smudge into the
    # middle of the field. Dilating the bright pixels erases strokes that thin
    # before the blur ever sees them.
    field = hero.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(26))
    f = np.asarray(field).astype(float)
    f = f / max(1.0, np.percentile(f[356:794, 236:430], 98))
    lit = np.clip(np.asarray(warped).astype(float) * np.clip(f, 0, 1.25), 0, 255)
    lit_img = Image.fromarray(lit.astype('uint8'))

    # A trace of glass over the screen - taken from the BLURRED field, not the
    # raw photograph. Blending the raw hero here ghosted the previous wordmark
    # straight back over the composite, which is exactly what this is replacing.
    lit_img = Image.blend(lit_img, field, SHEEN)

    hero.paste(lit_img, (0, 0), mask)
    hero.save(TARGET)
    print('wrote %s (panel %.0fx%.0f, capture %s)' % (TARGET, panel_w, panel_h, shot.size))


if __name__ == '__main__':
    main()
