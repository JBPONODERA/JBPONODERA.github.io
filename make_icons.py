from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

base = Path('/home/user/pwa_bundle/icons')
base.mkdir(parents=True, exist_ok=True)

sizes = [180, 192, 512]
colors = {
    'bg1': (15, 118, 110),
    'bg2': (37, 99, 235),
    'card': (255, 255, 255),
    'accent': (20, 184, 166),
    'text': (23, 43, 77),
}

for size in sizes:
    img = Image.new('RGBA', (size, size), colors['bg1'])
    draw = ImageDraw.Draw(img)

    # simple diagonal blend stripes
    for i in range(size):
        ratio = i / max(size - 1, 1)
        r = int(colors['bg1'][0] * (1 - ratio) + colors['bg2'][0] * ratio)
        g = int(colors['bg1'][1] * (1 - ratio) + colors['bg2'][1] * ratio)
        b = int(colors['bg1'][2] * (1 - ratio) + colors['bg2'][2] * ratio)
        draw.line([(0, i), (size, i)], fill=(r, g, b, 255))

    pad = int(size * 0.12)
    card_top = int(size * 0.18)
    card_h = int(size * 0.54)
    draw.rounded_rectangle(
        [pad, card_top, size - pad, card_top + card_h],
        radius=int(size * 0.08),
        fill=colors['card']
    )
    draw.rounded_rectangle(
        [pad + int(size * 0.08), card_top + int(size * 0.09), size - pad - int(size * 0.08), card_top + int(size * 0.17)],
        radius=int(size * 0.03),
        fill=colors['accent']
    )
    draw.rounded_rectangle(
        [pad + int(size * 0.08), card_top + int(size * 0.24), size - pad - int(size * 0.28), card_top + int(size * 0.31)],
        radius=int(size * 0.02),
        fill=(226, 232, 240)
    )
    draw.rounded_rectangle(
        [pad + int(size * 0.08), card_top + int(size * 0.35), size - pad - int(size * 0.18), card_top + int(size * 0.42)],
        radius=int(size * 0.02),
        fill=(226, 232, 240)
    )

    qr_x = size - pad - int(size * 0.26)
    qr_y = card_top + int(size * 0.24)
    qr_s = int(size * 0.18)
    draw.rounded_rectangle([qr_x, qr_y, qr_x + qr_s, qr_y + qr_s], radius=int(size * 0.02), fill=colors['text'])
    step = max(2, qr_s // 5)
    for xx in range(3):
        for yy in range(3):
            if (xx + yy) % 2 == 0:
                draw.rectangle([
                    qr_x + step//2 + xx * step,
                    qr_y + step//2 + yy * step,
                    qr_x + step//2 + xx * step + step//2,
                    qr_y + step//2 + yy * step + step//2,
                ], fill=colors['card'])

    label_h = int(size * 0.14)
    draw.rounded_rectangle(
        [int(size * 0.18), int(size * 0.77), int(size * 0.82), int(size * 0.77) + label_h],
        radius=int(size * 0.07),
        fill=(255, 255, 255, 50),
        outline=(255, 255, 255, 110),
        width=max(2, size // 128)
    )

    try:
        font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', int(size * 0.11))
    except Exception:
        font = ImageFont.load_default()

    text = 'DEMO'
    bbox = draw.textbbox((0, 0), text, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2
    ty = int(size * 0.77) + (label_h - th) // 2 - int(size * 0.01)
    draw.text((tx, ty), text, fill=(255, 255, 255), font=font)

    img.save(base / f'icon-{size}.png')

print('icons created')
