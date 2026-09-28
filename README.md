# Flauta — partitura para flauta doce

Converte partituras em diagramas de dedilhado para **flauta doce soprano (dedilhado barroco)**,
no mesmo formato da tabela de "Noite Feliz": nome da nota em cima, polegar à esquerda,
os 7 furos da frente (os dois últimos duplos) e `/` separando as frases.

Abra `index.html` no navegador. Já vem com **Für Elise** (Beethoven) e **Noite Feliz**.

## Como usar

- **Escrever as notas** na caixa de texto:
  - `Dó Ré Mi Fá Sol Lá Si` → oitava grave (Dó = a nota mais grave da flauta)
  - `DÓ RÉ MI FÁ SOL LÁ SI` → oitava aguda
  - `Ré#`, `Sib` → acidentes; `Mi6` → oitava explícita
  - `/` → separador; nova linha → nova linha de diagramas; `// texto` → comentário
  - `:2`, `:0.5` → duração relativa (só usada no botão **Tocar**)
  - também aceita notação científica: `C4 D#5 Bb4`
- **Importar MusicXML** (`.musicxml`, `.xml` ou `.mxl`): exporte a partitura do MuseScore
  (Arquivo → Exportar → MusicXML). A melodia é tirada da pauta de cima (nota mais aguda
  de cada acorde) e a oitava é ajustada automaticamente para caber na flauta.
  Para partir de uma **foto/PDF**, passe antes por um programa de OMR
  (ex.: Audiveris ou o importador de PDF do MuseScore) para gerar o MusicXML.
- Notas fora da extensão da flauta (Dó4–Ré6) mudam de oitava e ganham a marca `8va`.
- **Tocar** reproduz a melodia e destaca o dedilhado de cada nota.

## Arquivos

- `flauta.js` — tabela de dedilhados, leitura do texto e do MusicXML, desenho SVG
- `songs.js` — músicas prontas
- `index.html` — interface
