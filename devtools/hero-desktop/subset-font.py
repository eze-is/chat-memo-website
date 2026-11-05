"""只为官网演示打包所需字形，保留正式 App 的可变字重与许可。"""
from pathlib import Path
from fontTools import subset
root = Path(__file__).resolve().parent
website = root.parents[1]
desktop = website.parent / 'desktop'
characters = ''.join(chr(code) for code in range(32, 127))
files = list(root.glob('*.tsx')) + list((desktop / 'src/renderer/src/i18n').rglob('*.ts'))
characters += ''.join(p.read_text() for p in files)
options = subset.Options()
options.flavor = 'woff2'
options.hinting = False
font = subset.load_font(str(desktop / 'src/renderer/src/assets/fonts/MiSansVF.woff2'), options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
output = root / '.generated/MiSans-hero.woff2'
output.parent.mkdir(exist_ok=True)
subset.save_font(font, output, options)
print(f'Hero MiSans: {output.stat().st_size:,} bytes')
