#!/bin/bash
# Generate a simple template tray icon (22x22 PNG)
OUT="$(dirname "$0")/../resources/trayTemplate.png"
python3 - <<'PY' 2>/dev/null || exit 0
from pathlib import Path
try:
    from PIL import Image, ImageDraw
except ImportError:
    print("Install Pillow for icon generation: pip install Pillow")
    raise SystemExit(0)
p = Path(__file__).resolve().parent.parent / "resources" / "trayTemplate.png"
img = Image.new("RGBA", (22, 22), (0, 0, 0, 0))
d = ImageDraw.Draw(img)
d.ellipse((4, 4, 18, 18), outline=(200, 240, 255, 220), width=2)
d.ellipse((9, 9, 13, 13), fill=(0, 212, 255, 255))
p.parent.mkdir(parents=True, exist_ok=True)
img.save(p)
print("Wrote", p)
PY
