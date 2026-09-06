"""Derive assets/favicon.png from the brand wordmark.

The browser tab renders this at 16-32px, so it uses only the two numerals from
the top of the lockup - not the whole thing. The source splits cleanly into
column blocks at 17-512 (first 3), 601-1097 (second 3), 1170-1453 (the period)
and 1486+ (the TM), with the "TRENDS" wordmark on its own rows from 843.

Both the period and the TM are dropped on purpose. Keeping them is what the
first attempt did, and because the mark then has to fit a ~2:1 box inside a
square, the numerals shrink until 32px renders the whole thing as a row of
indistinct dots. Cropping to just "33" lets it fill the frame and stay
readable. Compared side by side at 32px before choosing.

Run:  python scripts/generateFavicon.py
"""

from PIL import Image

SOURCE = 'assets/brand/wordmark-color.png'
TARGET = 'assets/favicon.png'
BONE = (253, 251, 250)  # #FDFBFA - matches app.json splash/adaptive background
SIZE = 256
PAD = 0.08  # breathing room so the mark is not jammed against the tab edges
MARK_BOTTOM = 720  # below the mark, above the "TRENDS" block that starts at 843
MARK_RIGHT = 1100  # after the second 3, before the period at 1170 and TM at 1486


def main() -> None:
    src = Image.open(SOURCE).convert('RGBA')
    mark = src.crop((0, 0, MARK_RIGHT, MARK_BOTTOM))

    box = mark.split()[3].getbbox()
    if box is None:
        raise SystemExit('no opaque pixels found in the mark region')
    mark = mark.crop(box)

    inner = int(SIZE * (1 - 2 * PAD))
    scale = min(inner / mark.width, inner / mark.height)
    mark = mark.resize(
        (max(1, round(mark.width * scale)), max(1, round(mark.height * scale))),
        Image.LANCZOS,
    )

    canvas = Image.new('RGB', (SIZE, SIZE), BONE)
    canvas.paste(
        mark,
        ((SIZE - mark.width) // 2, (SIZE - mark.height) // 2),
        mark,
    )
    canvas.save(TARGET)
    print('wrote %s at %dx%d from %s (cols 0-%d, rows 0-%d)'
          % (TARGET, SIZE, SIZE, SOURCE, MARK_RIGHT, MARK_BOTTOM))


if __name__ == '__main__':
    main()
