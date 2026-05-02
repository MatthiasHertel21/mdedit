#!/usr/bin/env python3
import json

# Read the English translations as reference
with open('en.json', 'r', encoding='utf-8') as f:
    en_data = json.load(f)

# Extract layout and preview keys
target_keys = {k: v for k, v in en_data.items() if k.startswith('layout') or k.startswith('preview')}

# Language files to update (excluding EN and DE which are already done)
lang_files = ['es.json', 'fr.json', 'it.json', 'nl.json', 'pl.json', 'ru.json', 'tr.json', 'zh.json']

for lang_file in lang_files:
    with open(lang_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    # Add layout and preview keys (using English as fallback)
    data.update(target_keys)
    
    with open(lang_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    print(f"✓ Updated {lang_file} with {len(target_keys)} layout and preview translations")

print(f"\n✓ All language files updated")
