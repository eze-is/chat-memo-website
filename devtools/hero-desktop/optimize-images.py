"""从演示的独立 Vite 产物生成无损 WebP，并更新有内容指纹的引用。"""
from hashlib import sha256
from io import BytesIO
from pathlib import Path
import re
import sys

from PIL import Image


def fingerprint(data):
    return sha256(data).hexdigest()[:12]


def lossless_webp(source):
    with Image.open(source) as original:
        pixels = original.convert('RGBA')
        profile = original.info.get('icc_profile')
    output = BytesIO()
    pixels.save(output, 'WEBP', lossless=True, method=6, exact=True, icc_profile=profile)
    data = output.getvalue()
    with Image.open(BytesIO(data)) as encoded:
        if (encoded.size != pixels.size or encoded.info.get('icc_profile') != profile
                or encoded.convert('RGBA').tobytes() != pixels.tobytes()):
            raise ValueError(f'无损校验失败：{source.name}')
    return data


root = Path(sys.argv[1])
poster = root / 'poster.png'
poster_data = lossless_webp(poster) if poster.exists() else (root / 'poster.webp').read_bytes()
assets = root / 'assets'
index = root / 'index.html'
# 当前演示只有一个入口 JS 和 CSS；未来若切分为多个块，须在 Vite 中处理跨块引用。
entry_assets = sorted([*assets.glob('*.js'), *assets.glob('*.css')])
if len(entry_assets) != 2 or {p.suffix for p in entry_assets} != {'.js', '.css'}:
    raise ValueError('桌面演示不再是单 JS / CSS 入口，请更新资源引用策略')
references = {}
outputs = {}
for source in sorted(assets.glob('*.png')):
    data = lossless_webp(source)
    if len(data) < source.stat().st_size:
        target = source.with_name(f'{source.stem.rsplit("-", 1)[0]}-{fingerprint(data)}.webp')
        references[source.name] = target.name
        outputs[target] = data

html = index.read_text()
css = next(source for source in entry_assets if source.suffix == '.css').read_text()
font = re.search(r"""url\(["']?(/resource/hero-desktop/assets/MiSans-hero-[\w-]+\.woff2)["']?\)""", css)
if not font or not (assets / Path(font[1]).name).is_file():
    raise ValueError('找不到演示首帧使用的 MiSans 字体')
html = re.sub(r'<link data-hero-font-preload[^>]*>', '', html)
html = html.replace('<script type="module"', (
    f'<link data-hero-font-preload rel="preload" href="{font[1]}" '
    'as="font" type="font/woff2" crossorigin><script type="module"'
), 1)
for source in entry_assets:
    original = source.read_text()
    if source.name not in html:
        raise ValueError(f'入口缺少引用：{source.name}')
    content = original
    for old, new in references.items():
        content = content.replace(old, new)
    if content != original:
        data = content.encode()
        target = source.with_name(f'index-{fingerprint(data)}{source.suffix}')
        outputs[target] = data
        html = html.replace(source.name, target.name)
        references[source.name] = target.name

for target, data in outputs.items():
    target.write_bytes(data)
(root / 'poster.webp').write_bytes(poster_data)
index.write_text(html)
for name in references:
    (assets / name).unlink()
poster.unlink(missing_ok=True)
print(f'Hero 无损海报 {len(poster_data):,} B，更新 {len(outputs)} 项资源引用。')
