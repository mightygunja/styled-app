"""Generate every brand icon from the one logo file.

Source:
  assets/brand/logo-final.png    the master "33. TRENDS" lockup, transparent

Writes:
  assets/icon.png                iOS app icon, 1024x1024, opaque
  assets/adaptive-icon.png       Android foreground, mark inside the safe zone
  assets/splash-icon.png         full lockup on bone (app.json does not use it
                                 today - the splash is splash-hero.png - but a
                                 stale mark sitting in assets is how this went
                                 wrong, so it is kept current too)
  public/favicon.ico             16/32/48, the root fallback browsers probe
  public/favicon-32.png          PNG favicon, linked from index.html
  public/apple-touch-icon.png    180x180, iOS home screen and Safari
  public/og-image.png            1200x630 share card for iMessage/Slack/social

Why this exists. The rebrand replaced the favicon and nothing else, because
the favicon had its own single-output script. The iOS icon, the Android icon,
the splash icon and the social share card all kept retired marks for weeks.
Worse, the original generator (generateBrandAssets.js, deleted alongside this)
wrote all five of its outputs - favicon included - from the retired Playfair
"33", so running it would have silently undone the rebrand. One source, one
script, every output: re-run this whenever the mark changes and nothing is
left behind.

Run:  python scripts/generateBrandIcons.py
"""

from PIL import Image, ImageDraw, ImageFont

SOURCE = 'assets/brand/logo-final.png'
TAGLINE_FONT = 'node_modules/@expo-google-fonts/instrument-sans/600SemiBold/InstrumentSans_600SemiBold.ttf'

BONE = (253, 251, 250)   # #FDFBFA, app.json splash + adaptive backgroundColor
INK = (28, 28, 28)       # #1C1C1C

# The "33" alone. The lockup's two numerals end at x=1113 with the period
# starting at 1186, and the numerals end at y=712 with TRENDS starting at 857,
# so this box holds both 3s and nothing else. Square marks drop the period,
# the TM and TRENDS on purpose: the full lockup is roughly 1.5:1 and shrinks
# to an unreadable smudge in a square at home-screen and tab sizes.
NUMERALS_BOX = (0, 0, 1150, 730)

# Inset of the mark from each edge, as a fraction of the canvas.
PAD_ICON = 0.14          # iOS masks the corners itself; this is the margin the
                         # home screen grid reads as intentional, not cramped
PAD_TAB = 0.08           # favicons are tiny - fill the frame so it stays legible

# Android masks the foreground to a circle, squircle or square depending on the
# launcher, and only the central 66% of the canvas is guaranteed to survive.
ADAPTIVE_SAFE = 0.66
ADAPTIVE_MARGIN = 0.94   # stay a little inside the safe circle, not on its edge


def load_source() -> Image.Image:
    return Image.open(SOURCE).convert('RGBA')


def tight(img: Image.Image) -> Image.Image:
    box = img.split()[3].getbbox()
    if box is None:
        raise SystemExit('no opaque pixels in the requested region of %s' % SOURCE)
    return img.crop(box)


def fit(mark: Image.Image, max_w: float, max_h: float) -> Image.Image:
    scale = min(max_w / mark.width, max_h / mark.height)
    return mark.resize((max(1, round(mark.width * scale)), max(1, round(mark.height * scale))), Image.LANCZOS)


def on_bone(mark: Image.Image, w: int, h: int, cy: float = 0.5) -> Image.Image:
    """Opaque RGB. Apple rejects app icons with an alpha channel, and every
    other target here sits on bone anyway."""
    canvas = Image.new('RGBA', (w, h), BONE + (255,))
    canvas.alpha_composite(mark, ((w - mark.width) // 2, round(h * cy - mark.height / 2)))
    return canvas.convert('RGB')


def square(mark: Image.Image, size: int, pad: float) -> Image.Image:
    inner = size * (1 - 2 * pad)
    return on_bone(fit(mark, inner, inner), size, size)


def adaptive(mark: Image.Image, size: int) -> Image.Image:
    # Largest box of this aspect whose diagonal fits the safe circle.
    diameter = size * ADAPTIVE_SAFE * ADAPTIVE_MARGIN
    aspect = mark.width / mark.height
    h = diameter / (aspect ** 2 + 1) ** 0.5
    return on_bone(fit(mark, h * aspect, h), size, size)


def tracked(text: str, font: ImageFont.FreeTypeFont, tracking: int) -> Image.Image:
    """Letter-spaced text. PIL has no tracking control, so it is set by hand."""
    widths = [font.getlength(ch) for ch in text]
    total = sum(widths) + tracking * (len(text) - 1)
    ascent, descent = font.getmetrics()
    img = Image.new('RGBA', (int(total) + 2, ascent + descent), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = 0.0
    for ch, w in zip(text, widths):
        draw.text((x, 0), ch, font=font, fill=INK + (255,))
        x += w + tracking
    return img


def share_card(lockup: Image.Image) -> Image.Image:
    W, H = 1200, 630
    card = Image.new('RGBA', (W, H), BONE + (255,))
    mark = fit(lockup, W * 0.60, H * 0.54)
    card.alpha_composite(mark, ((W - mark.width) // 2, round(H * 0.41 - mark.height / 2)))
    tag = tracked('AI STYLING FROM THE CLOTHES YOU OWN', ImageFont.truetype(TAGLINE_FONT, 27), 7)
    card.alpha_composite(tag, ((W - tag.width) // 2, round(H * 0.81 - tag.height / 2)))
    return card.convert('RGB')


def main() -> None:
    src = load_source()
    numerals = tight(src.crop(NUMERALS_BOX))
    lockup = tight(src)

    outputs = {
        'assets/icon.png': square(numerals, 1024, PAD_ICON),
        'assets/adaptive-icon.png': adaptive(numerals, 1024),
        'assets/splash-icon.png': on_bone(fit(lockup, 1024 * 0.72, 1024 * 0.72), 1024, 1024),
        'public/favicon-32.png': square(numerals, 32, PAD_TAB),
        'public/apple-touch-icon.png': square(numerals, 180, PAD_ICON),
        'public/og-image.png': share_card(lockup),
    }
    for path, img in outputs.items():
        img.save(path)
        print('wrote %-28s %dx%d %s' % (path, img.width, img.height, img.mode))

    # Built from a 256px render rather than downsampled from the 1024 icon, so
    # the 16px frame keeps the tab-size padding instead of the home-screen one.
    tab = square(numerals, 256, PAD_TAB)
    tab.save('public/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
    print('wrote %-28s 16/32/48 from %dx%d' % ('public/favicon.ico', tab.width, tab.height))


if __name__ == '__main__':
    main()
