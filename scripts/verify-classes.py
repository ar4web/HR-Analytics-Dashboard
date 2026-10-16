#!/usr/bin/env python3
"""
Class-coverage guard: every utility class the app can render must exist in the
built stylesheet.

Family classes are expanded through the maps below (the data-driven tones and
colours), then each token is looked up in dist/assets/*.css using Tailwind's
escaped form. Run after `npm run build`; exits non-zero on any gap.

    python3 scripts/verify-classes.py
"""
import glob
import re
import sys

SRC = sorted(glob.glob('src/**/*.tsx', recursive=True))
CSS_FILES = glob.glob('dist/assets/*.css')
if not CSS_FILES:
    sys.exit('No dist/assets/*.css found — run `npm run build` first.')
css = ''.join(open(f).read() for f in CSS_FILES)

FAMILIES = {
    'tone-${tone}': [f'tone-{t}' for t in
                     ('emerald', 'sky', 'indigo', 'violet', 'rose', 'amber', 'cyan', 'slate')],
    'ring-${tone}-200/55': [f'ring-{t}-200/55' for t in
                            ('emerald', 'sky', 'indigo', 'violet', 'rose', 'amber', 'cyan', 'slate')],
}

# Classes whose names are built at runtime and therefore can't be scanned.
RUNTIME = list(FAMILIES)

ESCAPE = set(':/[]().,%#!*&>~=\'"@+')
def escaped(token: str) -> str:
    out = []
    for ch in token:
        out.append('\\' + ch if ch in ESCAPE else ch)
    return ''.join(out)

used = set()
for path in SRC:
    source = open(path).read()
    # className="..."  and  className={`...`}
    for value in re.findall(r'className=(?:"([^"]*)"|\{`([^`]*)`\})', source):
        text = value[0] or value[1]
        text = re.sub(r'\$\{[^}]*\}', ' ', text)
        used.update(t for t in text.split() if t)

for template, expansions in FAMILIES.items():
    # a family is "live" if the template appears in any source file
    for path in SRC:
        if template in open(path).read():
            used.update(expansions)
            break

missing = sorted(t for t in used if escaped(t) not in css)
covered = len(used) - len(missing)

print(f'scans {len(SRC)} source files, {len(used)} distinct class tokens')
print(f'covered {covered}/{len(used)}')
if missing:
    print(f'\nMISSING ({len(missing)}):')
    for t in missing:
        print('  -', t)
    sys.exit(1)
print('every rendered class is present in the built stylesheet.')
