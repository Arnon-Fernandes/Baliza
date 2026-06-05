# INSTRUÇÕES DO ÍCONE — Baliza

## Conceito: Monograma B com ponto-baliza

Letra **B** em branco-gelo sobre fundo azul-noite com gradiente diagonal.
Um círculo ciano no canto superior direito representa a baliza luminosa —
o ponto de luz que mantém a embarcação (e o consultor) no rumo certo.

## Cores exatas

| Elemento           | Hex       |
|--------------------|-----------|
| Fundo (topo)       | #1A3050   |
| Fundo (base)       | #0F2137   |
| Letra B            | #E8F2F8   |
| Ponto-baliza       | #00E5C0   |

## SVG-fonte mestre (1024×1024)

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1A3050"/>
      <stop offset="100%" stop-color="#0F2137"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>
  <text x="490" y="690" font-size="580" font-weight="bold" fill="#E8F2F8"
        font-family="Georgia, serif" letter-spacing="-20" text-anchor="middle">B</text>
  <circle cx="762" cy="264" r="110" fill="#00E5C0"/>
</svg>
```

## Versões a gerar

- `loja/appstore_1024.png` — 1024×1024
- `loja/playstore_512.png` — 512×512
- `ic_launcher_background.png` — 432×432 (só o gradiente, sem B nem ponto)
- `ic_launcher_foreground.png` — 432×432 (B + ponto, fundo transparente, zona segura)
- `mipmap-mdpi/` 48px → `mipmap-xxxhdpi/` 192px

## Como gerar (Android Studio)

1. `File → New → Image Asset`
2. Foreground: SVG do B + ponto (sem fundo)
3. Background: cor #0F2137
4. Studio gera todas as densidades automaticamente

## Checklist
- [ ] B em branco-gelo (#E8F2F8), não branco puro
- [ ] Ponto ciano no canto superior direito
- [ ] Fundo gradiente noite (não preto puro)
- [ ] Legível em 48×48 (ponto ainda visível)
- [ ] PNGs de loja full-bleed (sem cantos arredondados)
