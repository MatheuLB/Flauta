/*
 * Flauta — converte notas (texto ou MusicXML) em diagramas de dedilhado
 * para flauta doce soprano (dedilhado barroco), no estilo:
 *   nome da nota em cima, polegar à esquerda, 7 furos na frente,
 *   os dois últimos furos duplos, e "/" separando as frases.
 *
 * Convenção dos nomes (igual à tabela de referência):
 *   Dó Ré Mi Fá Sol Lá Si  -> oitava grave  (Dó = C4, o Dó mais grave da flauta)
 *   DÓ RÉ MI FÁ SOL LÁ SI  -> oitava aguda  (DÓ = C5)
 *   Mi6, Ré6 ...           -> oitava explícita quando necessário
 * Também aceita notação científica: C4, D#5, Bb4 ...
 */
(function (root) {
  'use strict';

  // Furos: [polegar, 1, 2, 3, 4, 5, 6, 7]
  // x = tampado, o = aberto, h = meio (polegar entreaberto / só o furo maior do par)
  const FINGERINGS = {
    60: 'x xxx xxxx', // Dó
    61: 'x xxx xxxh', // Dó#
    62: 'x xxx xxxo', // Ré
    63: 'x xxx xxho', // Ré#
    64: 'x xxx xxoo', // Mi
    65: 'x xxx xoxx', // Fá
    66: 'x xxx oxxo', // Fá#
    67: 'x xxx oooo', // Sol
    68: 'x xxo xxho', // Sol#
    69: 'x xxo oooo', // Lá
    70: 'x xox xooo', // Lá# / Sib
    71: 'x xoo oooo', // Si
    72: 'x oxo oooo', // DÓ
    73: 'o xxo oooo', // DÓ#
    74: 'o oxo oooo', // RÉ
    75: 'o oxx xxxo', // RÉ#
    76: 'h xxx xxoo', // MI
    77: 'h xxx xoxo', // FÁ
    78: 'h xxx oxoo', // FÁ#
    79: 'h xxx oooo', // SOL
    80: 'h xxo xooo', // SOL#
    81: 'h xxo oooo', // LÁ
    82: 'h xox xxoo', // LÁ# / SIb
    83: 'h xxo xxoo', // SI
    84: 'h xoo xxoo', // DÓ agudíssimo
    85: 'h xxo xxxo', // DÓ# agudíssimo (varia entre flautas)
    86: 'h xox xoxo', // RÉ agudíssimo (varia entre flautas)
  };
  const MIN = 60, MAX = 86;

  const STEPS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
  const STEP_SEMI = [0, 2, 4, 5, 7, 9, 11];
  const PT = ['Dó', 'Ré', 'Mi', 'Fá', 'Sol', 'Lá', 'Si'];
  const SHARP_SPELL = [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [5, 0], [5, 1], [6, 0]];

  function strip(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  const PT_INDEX = { do: 0, re: 1, mi: 2, fa: 3, sol: 4, la: 5, si: 6 };

  function midiOf(step, alter, octave) { return (octave + 1) * 12 + STEP_SEMI[step] + alter; }

  // Nome para exibição, com a convenção de maiúsculas da referência.
  function displayName(step, alter, octave) {
    let n = PT[step];
    if (octave >= 5) n = n.toUpperCase();
    if (alter > 0) n += '♯'.repeat(alter);
    if (alter < 0) n += '♭'.repeat(-alter);
    return n;
  }

  // Token de texto (editável) para uma nota.
  function textToken(step, alter, octave) {
    let n = PT[step];
    if (octave === 5) n = n.toUpperCase();
    if (alter > 0) n += '#'.repeat(alter);
    if (alter < 0) n += 'b'.repeat(-alter);
    if (octave !== 4 && octave !== 5) n += octave;
    return n;
  }

  const RE_PT = /^(d[oó]|r[eé]|mi|f[aá]|sol|l[aá]|si)(##|bb|#|b|♯|♭)?(\d)?$/i;
  const RE_SCI = /^([a-g])(##|bb|#|b|♯|♭)?(\d)$/i;

  function alterOf(acc) {
    if (!acc) return 0;
    if (acc === '#' || acc === '♯') return 1;
    if (acc === '##') return 2;
    if (acc === 'b' || acc === '♭') return -1;
    if (acc === 'bb') return -2;
    return 0;
  }

  // Converte um texto em uma lista de itens:
  //   {type:'note', midi, step, alter, octave, dur, shifted, label, token}
  //   {type:'rest', dur} | {type:'sep'} | {type:'br'}
  function parseText(text, opts) {
    opts = opts || {};
    const transpose = opts.transpose || 0; // em semitons (múltiplo de 12)
    const items = [];
    const errors = [];
    const lines = String(text).split(/\r?\n/);
    lines.forEach((line, li) => {
      line = line.replace(/\/\/.*$/, ''); // comentários com //
      const tokens = line.replace(/\//g, ' / ').replace(/[|,;]/g, ' ').split(/\s+/).filter(Boolean);
      tokens.forEach((raw) => {
        if (raw === '/') { items.push({ type: 'sep' }); return; }
        let [tok, durStr] = raw.split(':');
        const dur = durStr ? parseFloat(durStr) : 1;
        if (!(dur > 0)) { errors.push(raw); return; }
        if (/^(_|-|p|pausa)$/i.test(tok)) { items.push({ type: 'rest', dur }); return; }
        let step, alter, octave, m;
        if ((m = tok.match(RE_PT))) {
          step = PT_INDEX[strip(m[1])];
          alter = alterOf(m[2]);
          const base = m[1];
          const isUpper = base === base.toUpperCase();
          octave = m[3] ? parseInt(m[3], 10) : (isUpper ? 5 : 4);
        } else if ((m = tok.match(RE_SCI))) {
          step = STEPS.indexOf(m[1].toUpperCase());
          alter = alterOf(m[2]);
          octave = parseInt(m[3], 10);
        } else {
          errors.push(raw);
          return;
        }
        items.push(makeNote(step, alter, octave, dur, transpose));
      });
      if (li < lines.length - 1 && tokens.length) items.push({ type: 'br' });
    });
    return { items, errors };
  }

  function makeNote(step, alter, octave, dur, transpose) {
    const oct0 = octave + Math.round((transpose || 0) / 12);
    let midi = midiOf(step, alter, oct0);
    let oct = oct0;
    let shifted = 0;
    while (midi < MIN) { midi += 12; oct += 1; shifted += 1; }
    while (midi > MAX) { midi -= 12; oct -= 1; shifted -= 1; }
    return {
      type: 'note', midi, step, alter, octave: oct, dur, shifted,
      label: displayName(step, alter, oct),
      fingering: FINGERINGS[midi] || null,
    };
  }

  // ---------- MusicXML ----------

  function listParts(doc) {
    const parts = [];
    doc.querySelectorAll('part-list > score-part').forEach((sp) => {
      const nm = sp.querySelector('part-name');
      parts.push({ id: sp.getAttribute('id'), name: (nm && nm.textContent.trim()) || sp.getAttribute('id') });
    });
    return parts;
  }

  // Extrai a melodia (nota mais aguda de cada acorde, pauta 1, primeira voz)
  // e devolve o texto editável.
  function musicXmlToText(doc, opts) {
    opts = opts || {};
    const partId = opts.partId || (listParts(doc)[0] || {}).id;
    const part = Array.from(doc.querySelectorAll('score-partwise > part')).find((p) => p.getAttribute('id') === partId)
      || doc.querySelector('score-partwise > part');
    if (!part) throw new Error('Não encontrei nenhuma parte (<part>) no arquivo. Use MusicXML "partwise".');
    const perLine = opts.measuresPerLine || 4;

    const measures = [];
    let divisions = 1;
    let voice = null;
    part.querySelectorAll(':scope > measure').forEach((meas) => {
      const notes = [];
      Array.from(meas.children).forEach((el) => {
        if (el.tagName === 'attributes') {
          const d = el.querySelector('divisions');
          if (d) divisions = parseFloat(d.textContent) || 1;
          return;
        }
        if (el.tagName !== 'note') return;
        if (el.querySelector('grace')) return;
        const staff = el.querySelector('staff');
        if (staff && staff.textContent.trim() !== '1') return;
        const v = (el.querySelector('voice') || {}).textContent || '1';
        if (voice === null) voice = v;
        if (v !== voice) return;
        const durEl = el.querySelector('duration');
        const beats = durEl ? parseFloat(durEl.textContent) / divisions : 0;
        const isChord = !!el.querySelector('chord');
        if (el.querySelector('rest')) {
          if (!isChord) notes.push({ rest: true, beats });
          return;
        }
        const p = el.querySelector('pitch');
        if (!p) return;
        const step = STEPS.indexOf(p.querySelector('step').textContent.trim());
        const alterEl = p.querySelector('alter');
        const alter = alterEl ? Math.round(parseFloat(alterEl.textContent)) : 0;
        const octave = parseInt(p.querySelector('octave').textContent, 10);
        const n = { step, alter, octave, midi: midiOf(step, alter, octave), beats };
        const tieStop = Array.from(el.querySelectorAll('tie')).some((t) => t.getAttribute('type') === 'stop');
        if (isChord) {
          const prev = notes[notes.length - 1];
          if (prev && !prev.rest && n.midi > prev.midi) Object.assign(prev, { step, alter, octave, midi: n.midi });
          return;
        }
        const prev = notes[notes.length - 1];
        if (tieStop && prev && !prev.rest && prev.midi === n.midi) { prev.beats += beats; return; }
        notes.push(n);
      });
      measures.push(notes);
    });

    // Pausas viram duração extra da nota anterior (só importa para tocar).
    const flat = [];
    measures.forEach((ms, i) => ms.forEach((n) => flat.push(Object.assign({ m: i }, n))));
    const pitched = flat.filter((n) => !n.rest);
    if (!pitched.length) throw new Error('Nenhuma nota encontrada na pauta superior dessa parte.');

    // Oitava que deixa mais notas dentro da extensão da flauta.
    let best = 0, bestScore = -1;
    [-24, -12, 0, 12, 24].forEach((sh) => {
      const score = pitched.filter((n) => n.midi + sh >= MIN && n.midi + sh <= MAX).length - Math.abs(sh) / 1000;
      if (score > bestScore) { bestScore = score; best = sh; }
    });

    // Unidade = duração mais comum (para o texto ficar limpo).
    const counts = {};
    pitched.forEach((n) => { counts[n.beats] = (counts[n.beats] || 0) + 1; });
    const unit = parseFloat(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0]) || 1;

    const out = [];
    let line = [];
    let lastM = -1;
    let mInLine = 0;
    const merged = [];
    flat.forEach((n) => {
      if (n.rest) {
        const prev = merged[merged.length - 1];
        if (prev && prev.m === n.m) prev.beats += n.beats;
        return;
      }
      merged.push(Object.assign({}, n));
    });
    merged.forEach((n) => {
      if (n.m !== lastM) {
        if (lastM !== -1) {
          mInLine += 1;
          if (mInLine >= perLine) { out.push(line.join(' ') + ' /'); line = []; mInLine = 0; }
          else line.push('/');
        }
        lastM = n.m;
      }
      const oct = n.octave + best / 12;
      let tok = textToken(n.step, n.alter, oct);
      const r = Math.round((n.beats / unit) * 100) / 100;
      if (r !== 1 && r > 0) tok += ':' + r;
      line.push(tok);
    });
    if (line.length) out.push(line.join(' '));
    return { text: out.join('\n'), octaveShift: best / 12, unitBeats: unit };
  }

  // ---------- Desenho (SVG) ----------

  function hole(cx, cy, r, state) {
    if (state === 'h') {
      return `<circle cx="${cx}" cy="${cy}" r="${r}" class="h-open"/>` +
        `<path d="M${cx} ${cy - r} A${r} ${r} 0 0 0 ${cx} ${cy + r} Z" class="h-fill"/>` +
        `<circle cx="${cx}" cy="${cy}" r="${r}" class="h-ring"/>`;
    }
    return `<circle cx="${cx}" cy="${cy}" r="${r}" class="${state === 'x' ? 'h-closed' : 'h-open'}"/>`;
  }

  function doubleHole(cy, state) {
    const big = state === 'x' || state === 'h' ? 'x' : 'o';
    const small = state === 'x' ? 'x' : 'o';
    return hole(19.5, cy, 3.6, big) + hole(27, cy, 2.4, small);
  }

  function noteSVG(item) {
    const f = (item.fingering || '? ??? ????').replace(/ /g, '');
    const ys = [33, 47, 61, 79, 93];
    let body = '';
    body += hole(6, 28, 4.6, f[0] === '?' ? 'o' : f[0]);
    ys.forEach((y, i) => { body += hole(22, y, 4.8, f[i + 1]); });
    body += doubleHole(108, f[6]);
    body += doubleHole(121, f[7]);
    const mark = item.shifted
      ? `<text x="22" y="148" class="oct">${item.shifted > 0 ? '8va↑' : '8va↓'}</text>` : '';
    return `<svg viewBox="0 0 34 150" class="fing" role="img" aria-label="${item.label}">` +
      `<text x="22" y="10" class="nm">${item.label}</text>` +
      `<rect x="13" y="19" width="18" height="112" rx="6" class="body"/>` +
      `<line x1="15" y1="70" x2="29" y2="70" class="split"/>` +
      body + mark + `</svg>`;
  }

  // ---------- PDF (jsPDF, desenho vetorial) ----------

  // Cria um PDF A4 com o título e os diagramas, quebrando linhas e páginas.
  function buildPdf(JsPDF, song) {
    const doc = new JsPDF({ unit: 'mm', format: 'a4' });
    const PW = 210, PH = 297, M = 12;
    const w = 9, s = w / 34, h = 150 * s; // 1 unidade do SVG = s mm
    const gapNote = 1.2, sepW = 5, rowGap = 5;
    let x = M, y = M;

    doc.setFont('helvetica', 'bolditalic');
    doc.setFontSize(22);
    doc.text(song.title || 'Sem título', M, y + 7);
    y += 10;
    if (song.composer) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(90);
      doc.text(song.composer, M, y + 3);
      doc.setTextColor(0);
      y += 6;
    }
    y += 2;

    const newLine = () => { x = M; y += h + rowGap; if (y + h > PH - M) { doc.addPage(); y = M; } };
    let lineHasContent = false;

    const hole = (cx, cy, r, st) => {
      const X = x + cx * s, Y = y + cy * s, R = r * s;
      doc.setLineWidth(0.18);
      if (st === 'x') { doc.circle(X, Y, R, 'FD'); return; }
      doc.circle(X, Y, R, 'S');
      if (st === 'h') { // metade esquerda preenchida
        const pts = [];
        for (let i = 0; i <= 16; i++) {
          const a = Math.PI / 2 + (Math.PI * i) / 16;
          pts.push([X + R * Math.cos(a), Y - R * Math.sin(a)]);
        }
        const segs = [];
        for (let i = 1; i < pts.length; i++) segs.push([pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]]);
        doc.lines(segs, pts[0][0], pts[0][1], [1, 1], 'F', true);
      }
    };

    const drawNote = (it) => {
      const f = (it.fingering || '? ??? ????').replace(/ /g, '');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.text(it.label.replace(/♯/g, '#').replace(/♭/g, 'b'), x + 22 * s, y + 9 * s, { align: 'center' });
      doc.setLineWidth(0.25);
      doc.roundedRect(x + 13 * s, y + 19 * s, 18 * s, 112 * s, 6 * s, 6 * s, 'S');
      doc.setDrawColor(170);
      doc.setLineWidth(0.12);
      doc.line(x + 15 * s, y + 70 * s, x + 29 * s, y + 70 * s);
      doc.setDrawColor(0);
      doc.setFillColor(0);
      hole(6, 28, 4.6, f[0] === '?' ? 'o' : f[0]);
      [33, 47, 61, 79, 93].forEach((cy, i) => hole(22, cy, 4.8, f[i + 1]));
      [[108, f[6]], [121, f[7]]].forEach(([cy, st]) => {
        hole(19.5, cy, 3.6, st === 'x' || st === 'h' ? 'x' : 'o');
        hole(27, cy, 2.4, st === 'x' ? 'x' : 'o');
      });
      if (it.shifted) {
        doc.setFontSize(5);
        doc.setTextColor(160, 70, 30);
        doc.text(it.shifted > 0 ? '8va+' : '8va-', x + 22 * s, y + 146 * s, { align: 'center' });
        doc.setTextColor(0);
      }
    };

    // Agrupa as notas entre separadores para não quebrar a linha no meio de um compasso.
    const groups = [];
    let cur = { notes: [], sep: false };
    song.items.forEach((it) => {
      if (it.type === 'note') cur.notes.push(it);
      else if (it.type === 'sep' && cur.notes.length) { cur.sep = true; groups.push(cur); cur = { notes: [], sep: false }; }
    });
    if (cur.notes.length) groups.push(cur);

    groups.forEach((g) => {
      const gw = g.notes.length * (w + gapNote) + (g.sep ? sepW : 0);
      if (lineHasContent && x + gw > PW - M) { newLine(); lineHasContent = false; }
      g.notes.forEach((it) => {
        if (x + w > PW - M) newLine();
        drawNote(it);
        x += w + gapNote;
        lineHasContent = true;
      });
      if (g.sep) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(18);
        doc.text('/', x + 0.5, y + h - 1);
        x += sepW;
      }
    });
    return doc;
  }

  // ---------- Reconhecimento de partitura (imagem) ----------

  const RECOGNIZE_PROMPT = `Você vai ler a(s) imagem(ns) de uma partitura e transcrever a MELODIA para tocar na flauta doce soprano.

Regras:
- Pegue apenas a linha melódica principal: a voz mais aguda da pauta de clave de sol (em partitura de piano, a mão direita; em acordes, a nota mais aguda).
- Escreva a altura real de cada nota, aplicando a armadura de clave e os acidentes do compasso.
- Formato de cada nota: nome em português + acidente + duração.
  - Oitava 4 (do Dó central até o Si acima dele): primeira letra maiúscula: Dó Ré Mi Fá Sol Lá Si
  - Oitava 5 (do Dó acima do Dó central até o Si seguinte): tudo maiúsculo: DÓ RÉ MI FÁ SOL LÁ SI
  - Outras oitavas: nome + número, ex.: Lá3, Mi6
  - Acidentes: # para sustenido, b para bemol, ex.: Ré#, SIb
  - Duração: ":n" relativo à figura mais comum da música (a figura mais comum não leva sufixo). Ex.: se a mais comum for colcheia, uma semínima é ":2" e uma semicolcheia ":0.5". Some a pausa que vem logo depois de uma nota à duração dessa nota.
- Separe cada compasso com " / " e comece uma nova linha a cada 4 compassos.
- Não expanda repetições; quando houver ritornelo ou casa 1/2, coloque uma linha de comentário começando com "//" explicando (ex.: "// repetir do início").
- Se algo estiver ilegível, faça a melhor leitura possível e avise em "observacoes".

Responda somente com um JSON neste formato:
{"titulo": "...", "compositor": "...", "notas": "MI RÉ# / MI RÉ# MI Si RÉ DÓ / Lá:3 Dó Mi Lá /\\n...", "observacoes": "..."}`;

  function parseRecognition(raw) {
    let obj = raw;
    if (typeof raw === 'string') {
      const a = raw.indexOf('{'), b = raw.lastIndexOf('}');
      if (a < 0 || b < a) throw new Error('A resposta não veio no formato esperado.');
      obj = JSON.parse(raw.slice(a, b + 1));
    }
    if (!obj || typeof obj.notas !== 'string' || !obj.notas.trim()) throw new Error('Nenhuma nota foi reconhecida na imagem.');
    return { title: obj.titulo || '', composer: obj.compositor || '', text: obj.notas.trim(), notes: obj.observacoes || '' };
  }

  const api = {
    FINGERINGS, MIN, MAX, parseText, musicXmlToText, listParts, noteSVG, displayName, textToken,
    buildPdf, RECOGNIZE_PROMPT, parseRecognition,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Flauta = api;
})(typeof window !== 'undefined' ? window : globalThis);
