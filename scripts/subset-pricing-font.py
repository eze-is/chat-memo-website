#!/usr/bin/env python3
"""从付款页同款 MiSans 字体生成定价页四语字符子集；日常网页构建不依赖此工具。"""
import json
import sys
from pathlib import Path
from fontTools import subset

root = Path(__file__).resolve().parents[1]
characters = 'Chat Memo Pro CNY US$0123456789.,/:—✓©'
for locale in ['en', 'zh-CN', 'ja', 'es']:
    catalog = json.loads((root / 'locales' / f'{locale}.json').read_text())
    characters += ''.join(catalog['common'].values()) + ''.join(catalog['pricing'].values())
    characters += (root / locale / 'pricing.html').read_text()
options = subset.Options()
options.flavor = 'woff2'
options.hinting = False
font = subset.load_font(sys.argv[1], options)
subsetter = subset.Subsetter(options=options)
subsetter.populate(text=characters)
subsetter.subset(font)
subset.save_font(font, root / 'resource/fonts/MiSans-pricing.woff2', options)
