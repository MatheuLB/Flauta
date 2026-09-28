# Flauta — partitura para flauta doce

Converte partituras em diagramas de dedilhado para **flauta doce soprano (dedilhado barroco)**,
no mesmo formato da tabela de "Noite Feliz": nome da nota em cima, polegar à esquerda,
os 7 furos da frente (os dois últimos duplos) e `/` separando as frases.

Abra `index.html` no navegador. Já vem com **Für Elise** (Beethoven) e **Noite Feliz**.

## Como usar

### 1. Enviar a partitura

Arraste ou escolha uma **foto** (JPG/PNG), um **PDF** (até 6 páginas) ou um arquivo **MusicXML**.

- Foto e PDF são lidos pelo Claude, que transcreve a melodia (voz mais aguda da clave de sol)
  para o formato de texto abaixo. Aberta no claude.ai, a página usa a sua conta; aberta como
  arquivo local, pede uma chave da API da Anthropic (fica guardada só no seu navegador).
- MusicXML é convertido direto, sem IA (exporte do MuseScore: Arquivo → Exportar → MusicXML).

### 2. Conferir as notas e baixar o PDF

O reconhecimento pode errar: confira o texto e corrija o que for preciso — os diagramas mudam na hora.
Depois clique em **Baixar PDF** para ter a folha pronta para imprimir (A4, sem quebrar compassos).

### Formato do texto

- **Escrever as notas** na caixa de texto:
  - `Dó Ré Mi Fá Sol Lá Si` → oitava grave (Dó = a nota mais grave da flauta)
  - `DÓ RÉ MI FÁ SOL LÁ SI` → oitava aguda
  - `Ré#`, `Sib` → acidentes; `Mi6` → oitava explícita
  - `/` → separador; nova linha → nova linha de diagramas; `// texto` → comentário
  - `:2`, `:0.5` → duração relativa (só usada no botão **Tocar**)
  - também aceita notação científica: `C4 D#5 Bb4`
- Notas fora da extensão da flauta (Dó4–Ré6) mudam de oitava e ganham a marca `8va`.
- **Tocar** reproduz a melodia e destaca o dedilhado de cada nota.

## Arquivos

- `flauta.js` — tabela de dedilhados, leitura do texto e do MusicXML, desenho SVG e PDF, instruções de reconhecimento
- `songs.js` — músicas prontas
- `index.html` — interface
