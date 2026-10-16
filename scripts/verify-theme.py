#!/usr/bin/env python3
"""
Theme verification: WCAG contrast for every theme, and a colour-vision
simulation of the chart's two-series palette.

Run from the repo root:  python3 scripts/verify-theme.py
Exits non-zero if any text token fails WCAG AA (4.5:1) on its surface.
"""
import math
import re
import sys

CSS_PATH = 'src/index.css'
css = open(CSS_PATH).read()


def block(selector: str) -> dict:
    """Return the custom properties declared in the first block for `selector`."""
    start = css.find(selector)
    if start == -1:
        return {}
    brace = css.find('{', start)
    end = css.find('}', brace)
    body = css[brace + 1:end]
    if any(ch in body for ch in '{}'):
        # a nested block slipped in; take the smaller body
        body = css[brace + 1:css.find(';', brace) + 1]
    return dict(re.findall(r'(--[a-z0-9-]+):\s*([^;]+);', body))


THEME_SELECTORS = {
    'light': ":root,\n[data-theme='light']",
    'dark': "[data-theme='dark']",
    'contrast': "[data-theme='contrast']",
}
DENSITY_SELECTORS = {
    'compact': "[data-density='compact']",
    'executive': "[data-density='executive']",
}


def hex_to_rgb(value: str):
    value = value.strip().lstrip('#')
    if len(value) == 3:
        value = ''.join(c * 2 for c in value)
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def srgb_to_linear(c: float) -> float:
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def relative_luminance(rgb) -> float:
    r, g, b = (srgb_to_linear(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b) -> float:
    la, lb = relative_luminance(a), relative_luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)


def mix(fg, weight: float, base):
    """Approximate color-mix(in oklab, fg weight%, base)."""
    return tuple(round(fg[i] * weight + base[i] * (1 - weight)) for i in range(3))


def to_lab(rgb):
    r, g, b = (srgb_to_linear(c) for c in rgb)
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def delta_e(c1, c2) -> float:
    return math.dist(to_lab(c1), to_lab(c2))


def simulate_deuteranopia(rgb):
    """Machado et al. (2009) deuteranopia matrix, severity 1.0."""
    r, g, b = (srgb_to_linear(c) for c in rgb)
    m = [[0.367322, 0.860646, -0.227968],
         [0.280085, 0.672501, 0.047413],
         [-0.011820, 0.042940, 0.968881]]
    out = []
    for row in m:
        v = max(0.0, min(1.0, row[0] * r + row[1] * g + row[2] * b))
        out.append(round(255 * (v * 12.92 if v <= 0.0031308 else 1.055 * v ** (1 / 2.4) - 0.055)))
    return tuple(out)


TONES = {
    'emerald': ('#34d399', '#059669'), 'sky': ('#38bdf8', '#0284c7'),
    'indigo': ('#818cf8', '#4f46e5'), 'violet': ('#a78bfa', '#7c3aed'),
    'rose': ('#fb7185', '#e11d48'), 'amber': ('#fbbf24', '#d97706'),
    'cyan': ('#22d3ee', '#0891b2'), 'slate': ('#94a3b8', '#475569'),
}

failures = []
print('=' * 78)
print('WCAG 2.1 contrast ratios')
print('=' * 78)
for name, selector in THEME_SELECTORS.items():
    tokens = block(selector)
    if not tokens:
        failures.append(f'{name}: theme block not found in {CSS_PATH}')
        print(f'{name:9} !! block not found')
        continue
    surface = hex_to_rgb(tokens['--c-surface'])
    app = hex_to_rgb(tokens['--c-app'])
    print(f'\n{name.upper()}')
    for token, label in [('--c-strong', 'primary text'), ('--c-body', 'body text'),
                         ('--c-muted', 'secondary text'), ('--c-subtle', 'tertiary text')]:
        colour = hex_to_rgb(tokens[token])
        on_surface, on_app = contrast(colour, surface), contrast(colour, app)
        worst = min(on_surface, on_app)
        status = 'PASS' if worst >= 4.5 else ('AA-large only' if worst >= 3 else 'FAIL')
        if worst < 4.5:
            failures.append(f'{name}/{token}: {worst:.2f}:1 on surface/app')
        print(f'  {label:15} {token:11} surface {on_surface:5.2f}  app {on_app:5.2f}   {status}')

    worst_tone, worst_ratio = '', 99.0
    strong = hex_to_rgb(tokens['--c-strong'])
    for tone, (_, t2) in TONES.items():
        fg = mix(hex_to_rgb(t2), 0.62, strong)
        bg = mix(hex_to_rgb(t2), 0.12, surface)
        ratio = contrast(fg, bg)
        if ratio < worst_ratio:
            worst_ratio, worst_tone = ratio, tone
    status = 'PASS' if worst_ratio >= 4.5 else ('AA-large only' if worst_ratio >= 3 else 'FAIL')
    if worst_ratio < 3:
        failures.append(f'{name}/tone-{worst_tone}: {worst_ratio:.2f}:1')
    print(f'  {"tone chips":15} worst = {worst_tone:8} {worst_ratio:5.2f}            {status}')

    inv, inv_fg = hex_to_rgb(tokens['--c-inverse']), hex_to_rgb(tokens['--c-inverse-fg'])
    inv_ratio = contrast(inv_fg, inv)
    if inv_ratio < 4.5:
        failures.append(f'{name}/inverse: {inv_ratio:.2f}:1')
    print(f'  {"inverse chrome":15} {inv_ratio:5.2f}                     '
          f'{"PASS" if inv_ratio >= 4.5 else "FAIL"}')

print('\n' + '=' * 78)
print('Colour-vision simulation — chart series pair')
print('=' * 78)
for label, (a, b) in {
    'current  hires/exits  #10b981 / #f43f5e': ('#10b981', '#f43f5e'),
    'proposed hires/exits  #0ea5e9 / #f97316': ('#0ea5e9', '#f97316'),
    'Wong     blue/orange  #0072b2 / #e69f00': ('#0072b2', '#e69f00'),
}.items():
    ca, cb = hex_to_rgb(a), hex_to_rgb(b)
    normal = delta_e(ca, cb)
    deut = delta_e(simulate_deuteranopia(ca), simulate_deuteranopia(cb))
    verdict = 'OK' if deut >= 25 else ('weak' if deut >= 12 else 'INDISTINGUISHABLE')
    print(f'  {label:42} normal dE={normal:6.1f}  deuteranopia dE={deut:6.1f}  {verdict}')
    if verdict == 'INDISTINGUISHABLE':
        failures.append(f'chart pair {label} indistinguishable under deuteranopia')

print('\n' + '=' * 78)
print('Density presets (px)')
print('=' * 78)
# The density block is the bare `:root {` that declares --pad-panel; the earlier
# `:root,` belongs to the light theme, so match on the token itself.
density_start = css.find('--pad-panel')
base = dict(re.findall(r'(--[a-z0-9-]+):\s*([^;]+);', css[css.find('{', max(0, css.rfind(':root', 0, density_start))) : css.find('}', density_start) + 1]))
for name, values in [('comfortable (default)', base)] + [(k, block(v)) for k, v in DENSITY_SELECTORS.items()]:
    if not values:
        continue
    keys = ['--pad-panel', '--pad-tile', '--pad-cell', '--gap-section']
    rendered = []
    for k in keys:
        raw = values.get(k, base.get(k, '')).replace('rem', '')
        try:
            rendered.append(f"{k.replace('--pad-', '').replace('--gap-', '')}={round(float(raw) * 16)}px")
        except ValueError:
            pass
    print(f'  {name:22} ' + '  '.join(rendered))

print('\n' + '=' * 78)
if failures:
    print(f'FAILURES ({len(failures)}):')
    for f in failures:
        print('  -', f)
    sys.exit(1)
print('All checks passed: every text token meets WCAG AA on its surface,')
print('and the chart series pair stays distinguishable under deuteranopia.')
