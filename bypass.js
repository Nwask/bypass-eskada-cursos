(function () {
  'use strict';

  const ID_HOST = 'eskada-host';

  // Se o painel já está aberto, executar de novo o fecha com animação.
  const antigo = document.getElementById(ID_HOST);
  if (antigo) {
    antigo.dispatchEvent(new Event('eskada:fechar'));
    return;
  }

  const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
  // ⚠️ CHAVE E MODELO FIXOS (Invisíveis e inalteráveis)
  const API_KEY_HARDCODED = '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';
  const MODELO_PADRAO = 'openai/gpt-oss-120b';
  
  const TEMPERATURA = 0.1;
  const TIMEOUT_MS = 90000;
  const ATRASO_AVANCO_MS = 2000;
  const MAX_LINHAS_LOG = 200;
  const REDUZIR_MOVIMENTO = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Apenas layout e auto-avançar são salvos
  const PREF = {
    avancar: 'mqh_avancar',
    layout: 'eskada_layout',
  };

  const COR = {
    verde: 'rgba(0,255,65,.9)',
    ambar: 'rgba(255,210,31,.9)',
    vermelho: 'rgba(255,59,59,.9)',
  };

  const BRILHO_BASE = '0 0 18px rgba(0,255,65,.35), inset 0 0 30px rgba(0,255,65,.06)';
  const PREFIXO_LOG = { info: '[*]', ok: '[+]', aviso: '[!]', erro: '[x]' };

  const ROTULOS_TIPO = {
    shortanswer: 'shortanswer (Texto livre)',
    gapselect: 'gapselect (Menus suspensos)',
    'multichoice-radio': 'multichoice (Rádio - escolha única)',
    'multichoice-checkbox': 'multichoice (Checkbox - múltiplas respostas)',
  };

  const CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: 'Courier New', ui-monospace, Consolas, monospace; }

    .card {
      position: relative; width: 340px; min-width: 300px; min-height: 200px;
      display: flex; flex-direction: column; transform-origin: top right;
      background: #050805; color: #00ff41;
      border: 1px solid #00ff41; border-radius: 4px; font-size: 12px; overflow: hidden;
      box-shadow: ${BRILHO_BASE};
      animation: abrir 460ms cubic-bezier(.2,.9,.25,1.15) backwards;
      transition: box-shadow .3s ease;
    }
    .card.arrastando { box-shadow: 0 0 36px rgba(0,255,65,.55), inset 0 0 30px rgba(0,255,65,.1); }
    .card.minimizado { height: auto !important; min-height: 0 !important; }
    .card.minimizado .resizer { opacity: 0; pointer-events: none; }

    @keyframes abrir {
      0% { opacity: 0; transform: scale(.82) translateY(-14px); filter: blur(6px) brightness(2); }
      55% { opacity: 1; transform: scale(1.03) translateY(2px); filter: blur(0) brightness(1.4); }
      80% { filter: brightness(1.1); }
      100% { opacity: 1; transform: none; filter: none; }
    }

    .card::before {
      content: ''; position: absolute; left: 0; right: 0; top: -60px; height: 60px;
      pointer-events: none; z-index: 2;
      background: linear-gradient(to bottom, transparent, rgba(0,255,65,.10), transparent);
      animation: varredura 6s linear infinite;
    }
    .card::after {
      content: ''; position: absolute; inset: 0; pointer-events: none; z-index: 2;
      background: repeating-linear-gradient(to bottom, rgba(0,0,0,0) 0, rgba(0,0,0,0) 2px, rgba(0,0,0,.18) 3px);
    }
    @keyframes varredura { from { top: -60px; } to { top: 100%; } }

    header {
      display: flex; justify-content: space-between; align-items: center;
      padding: 8px 10px; background: #0a120a; border-bottom: 1px dashed #00ff41;
      cursor: grab; user-select: none; touch-action: none;
    }
    header:active { cursor: grabbing; }
    .titulo { display: flex; flex-direction: column; }
    .titulo b {
      display: inline-block; font-size: 14px; letter-spacing: 2px; text-shadow: 0 0 8px #00ff41;
    }
    .titulo b:hover { animation: glitch .45s steps(2, end) 1; }
    .titulo small {
      font-size: 10px; color: #4dff88; opacity: .85; display: flex; align-items: center; gap: 6px;
    }
    .dot {
      width: 6px; height: 6px; border-radius: 50%; background: #00ff41;
      box-shadow: 0 0 8px #00ff41; animation: pulso 1.6s ease-in-out infinite;
    }
    .cursor { animation: piscar 1s steps(1) infinite; }
    @keyframes piscar { 50% { opacity: 0; } }
    @keyframes pulso {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: .35; transform: scale(.7); }
    }
    @keyframes glitch {
      0% { transform: translate(0); text-shadow: 0 0 8px #00ff41; }
      20% { transform: translate(-2px, 1px); text-shadow: 2px 0 #ff00c8, -2px 0 #00e5ff; }
      40% { transform: translate(2px, -1px); text-shadow: -2px 0 #ff00c8, 2px 0 #00e5ff; }
      60% { transform: translate(-1px, 0); text-shadow: 1px 0 #ff00c8, -1px 0 #00e5ff; }
      100% { transform: translate(0); text-shadow: 0 0 8px #00ff41; }
    }

    .acoes { display: flex; gap: 4px; }
    header button {
      background: none; border: 1px solid #00ff41; color: #00ff41; cursor: pointer;
      width: 22px; height: 22px; padding: 0; line-height: 1; font-size: 14px;
      transition: transform .3s cubic-bezier(.3,1.4,.5,1), background .2s, color .2s;
    }
    header button:hover { background: #00ff41; color: #050805; transform: rotate(90deg); }
    header button:active { transform: scale(.85) rotate(90deg); }

    .corpo {
      padding: 10px; display: flex; flex-direction: column; gap: 8px; flex: 1; overflow-y: auto;
      max-height: 1200px;
      transition: max-height .45s cubic-bezier(.2,.8,.2,1), opacity .3s ease, padding .45s ease;
    }
    .corpo.oculto { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; overflow: hidden; }

    .linha { display: flex; gap: 8px; }
    .linha > * { flex: 1; }
    .btn {
      position: relative; overflow: hidden;
      padding: 8px; background: transparent; color: #00ff41; border: 1px solid #00ff41;
      font-family: inherit; font-size: 12px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;
      transition: background .2s, color .2s, box-shadow .2s, transform .12s;
    }
    .btn::after {
      content: ''; position: absolute; top: 0; left: -100%; width: 60%; height: 100%;
      background: linear-gradient(120deg, transparent, rgba(0,255,65,.35), transparent);
      transition: left .55s ease; pointer-events: none;
    }
    .btn:hover:not(:disabled)::after { left: 120%; }
    .btn:hover:not(:disabled) { background: #00ff41; color: #050805; box-shadow: 0 0 12px #00ff41; }
    .btn:active:not(:disabled) { transform: scale(.96); }
    .btn:disabled { opacity: .35; cursor: not-allowed; }
    .btn.primario { background: #00ff41; color: #050805; font-weight: bold; box-shadow: 0 0 10px rgba(0,255,65,.5); }
    .btn.primario:hover:not(:disabled) { background: #7dffa3; }

    .toggle { display: flex; align-items: center; gap: 10px; cursor: pointer; user-select: none; }
    .switch {
      position: relative; width: 38px; height: 18px; border: 1px solid #00ff41; flex: none;
      transition: box-shadow .3s ease, border-color .2s;
    }
    .switch::after {
      content: ''; position: absolute; top: 2px; left: 2px; width: 12px; height: 12px; background: #00ff41;
      transition: transform .35s cubic-bezier(.3,1.5,.5,1), box-shadow .3s ease;
    }
    input:checked + .switch { box-shadow: 0 0 10px rgba(0,255,65,.5); }
    input:checked + .switch::after { transform: translateX(20px); box-shadow: 0 0 8px #00ff41; }
    .toggle:hover .switch { border-color: #7dffa3; }

    #status { font-size: 11px; color: #4dff88; min-height: 14px; }
    #status::before { content: '> '; }
    .barra {
      height: 3px; border: 1px solid #1f7a3a; background: #0a120a; position: relative; overflow: hidden;
      opacity: .35; transition: opacity .3s ease;
    }
    .barra.ativa { opacity: 1; }
    .preenche {
      position: absolute; top: 0; left: 0; height: 100%; width: 35%;
      background: #00ff41; box-shadow: 0 0 8px #00ff41; transform: translateX(-100%);
    }
    .barra.ativa .preenche { animation: varrer 1.1s ease-in-out infinite; }
    @keyframes varrer { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }

    #log {
      flex: 1; min-height: 100px; max-height: 260px; overflow-y: auto;
      background: #000; border: 1px solid #1f7a3a; padding: 8px; font-size: 11px;
    }
    #log > div { padding: 1px 0; word-break: break-word; animation: entrar .35s ease-out backwards; }
    @keyframes entrar { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
    #log .info { color: #4dff88; }
    #log .ok { color: #00ff41; text-shadow: 0 0 4px #00ff41; }
    #log .aviso { color: #ffd21f; }
    #log .erro { color: #ff3b3b; }

    .resizer {
      position: absolute; bottom: 0; right: 0; width: 18px; height: 18px; z-index: 3;
      cursor: nwse-resize; touch-action: none; transition: opacity .3s ease;
    }
    .resizer::after {
      content: ''; position: absolute; bottom: 3px; right: 3px; width: 7px; height: 7px;
      border-right: 2px solid #00ff41; border-bottom: 2px solid #00ff41; transition: width .2s, height .2s;
    }
    .resizer:hover::after { width: 10px; height: 10px; }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: .01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: .01ms !important;
      }
    }
  `;

  let ui = null;
  let ocupado = false;
  let execucao = null;
  let timerAvanco = null;

  const clamp = (valor, min, max) => Math.min(Math.max(valor, min), Math.max(min, max));
  const esperar = ms => new Promise(r => setTimeout(r, REDUZIR_MOVIMENTO ? 0 : ms));

  // ---------- Preferências ----------
  function lerPref(chave, padrao) {
    try {
      const valor = localStorage.getItem(chave);
      return valor === null ? padrao : valor;
    } catch (e) { return padrao; }
  }

  function gravarPref(chave, valor) {
    try { localStorage.setItem(chave, String(valor)); } catch (e) {}
  }

  function lerLayout() {
    try { return JSON.parse(lerPref(PREF.layout, 'null')); } catch (e) { return null; }
  }

  // ---------- Leitura da página ----------
  function textoDoRotulo(input, posicao) {
    const label = input.labels?.[0] || document.getElementById(`${input.id}_label`);
    return label?.innerText.trim() || `Opção ${posicao}`;
  }

  function analisarQuestao(el, indice) {
    const questao = {
      indice, el, tipo: 'desconhecido',
      texto: el.querySelector('.qtext')?.innerText.trim() || '',
      opcoes: [],
    };

    const selects = [...el.querySelectorAll('select')];
    const radios = [...el.querySelectorAll('input[type="radio"]')];
    const checkboxes = [...el.querySelectorAll('input[type="checkbox"]')];
    const campoTexto = el.querySelector('input[type="text"]');

    if (selects.length) {
      questao.tipo = 'gapselect';
      questao.selects = selects;
      questao.opcoes = [...selects[0].options]
        .filter(o => o.value !== '' && o.value !== '0')
        .map(o => ({ valor: o.value, texto: o.text.trim() }));
    } else if (radios.length) {
      questao.tipo = 'multichoice-radio';
      questao.inputs = radios;
      questao.opcoes = radios.map((r, j) => ({ valor: String(j), texto: textoDoRotulo(r, j) }));
    } else if (checkboxes.length) {
      questao.tipo = 'multichoice-checkbox';
      questao.inputs = checkboxes;
      questao.opcoes = checkboxes.map((c, j) => ({ valor: String(j), texto: textoDoRotulo(c, j) }));
    } else if (campoTexto) {
      questao.tipo = 'shortanswer';
      questao.input = campoTexto;
    }
    return questao;
  }

  function coletarQuestoes() {
    return [...document.querySelectorAll('.que')]
      .map((el, i) => analisarQuestao(el, i))
      .filter(q => q.tipo !== 'desconhecido');
  }

  // ---------- Groq ----------
  function montarPrompt(questoes) {
    const blocos = questoes.map(q => {
      const linhas = [`Questão ${q.indice} (Tipo: ${ROTULOS_TIPO[q.tipo]}):`, q.texto];
      if (q.tipo === 'gapselect') {
        linhas.push(`Esta questão tem ${q.selects.length} lacuna(s), na ordem em que aparecem.`);
        linhas.push('Opções disponíveis nos menus:');
        q.opcoes.forEach(o => linhas.push(`Valor ${o.valor}: ${o.texto}`));
      } else if (q.opcoes.length) {
        linhas.push('Opções:');
        q.opcoes.forEach(o => linhas.push(`[${o.valor}] ${o.texto}`));
      }
      return linhas.join('\n');
    });

    return [
      'Você é um especialista no Moodle. Responda as questões abaixo.',
      'Retorne um JSON estritamente formatado em que as chaves são os números das questões (começando em 0) e os valores são as respostas.',
      '', 'Regras de formatação por tipo de questão:',
      '- shortanswer (texto livre): uma string com a resposta.',
      '- gapselect (menus suspensos): um array com os VALORES numéricos (1, 2, 3...) na ordem das lacunas.',
      '- multichoice (rádio, escolha única): o índice (0, 1, 2...) da opção correta.',
      '- multichoice (checkbox, múltiplas respostas): um array com os índices (0, 1, 2...) de TODAS as opções corretas.',
      '', 'Exemplo de formato de saída:',
      '{"0": "bloco de navegação", "1": ["1", "2", "3"], "2": 0, "3": [0, 2]}',
      '', 'Questões:', '', blocos.join('\n\n'),
    ].join('\n');
  }

  async function chamarGroq(chave, modelo, prompt, sinalExterno) {
    if (sinalExterno?.aborted) throw new Error('cancelado');
    const controle = new AbortController();
    const timer = setTimeout(() => controle.abort('timeout'), TIMEOUT_MS);
    sinalExterno?.addEventListener('abort', () => controle.abort('cancelado'), { once: true });

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        signal: controle.signal,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chave}` },
        body: JSON.stringify({
          model: modelo,
          messages: [
            { role: 'system', content: 'Você é um assistente que responde questões do Moodle e retorna APENAS JSON válido.' },
            { role: 'user', content: prompt },
          ],
          temperature: TEMPERATURA,
          response_format: { type: 'json_object' },
        }),
      });
      if (!res.ok) {
        const corpo = await res.text();
        throw new Error(`HTTP ${res.status} – ${corpo.slice(0, 200)}`);
      }
      const dados = await res.json();
      return dados.choices[0].message.content;
    } catch (e) {
      if (controle.signal.reason === 'cancelado') throw new Error('cancelado');
      if (controle.signal.reason === 'timeout') throw new Error('Tempo esgotado.');
      if (e.name === 'TypeError') throw new Error('Falha ao falar com a Groq (rede ou bloqueio do site).');
      throw e;
    } finally {
      clearTimeout(timer);
    }
  }

  function extrairRespostas(conteudo) {
    const limpo = conteudo.replace(/```(?:json)?/gi, '').trim();
    const match = limpo.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('A IA não retornou um JSON válido.');
    const dados = JSON.parse(match[0]);
    return dados.respostas && typeof dados.respostas === 'object' ? dados.respostas : dados;
  }

  // ---------- Preenchimento ----------
  function valorDoSelect(select, resposta) {
    const alvo = String(resposta).trim();
    if ([...select.options].some(o => o.value === alvo)) return alvo;
    const porTexto = [...select.options].find(o => o.text.trim().toLowerCase() === alvo.toLowerCase());
    return porTexto ? porTexto.value : null;
  }

  function aplicarResposta(q, resposta) {
    switch (q.tipo) {
      case 'shortanswer': { q.input.value = String(resposta); return true; }
      case 'gapselect': {
        const lista = Array.isArray(resposta) ? resposta : [resposta];
        let aplicou = false;
        q.selects.forEach((sel, i) => {
          if (lista[i] === undefined) return;
          const valor = valorDoSelect(sel, lista[i]);
          if (valor === null) return;
          sel.value = valor;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          aplicou = true;
        });
        return aplicou;
      }
      case 'multichoice-radio': {
        const idx = Number(Array.isArray(resposta) ? resposta[0] : resposta);
        const input = q.inputs[idx];
        if (!input) return false;
        input.click();
        return true;
      }
      case 'multichoice-checkbox': {
        const marcar = new Set((Array.isArray(resposta) ? resposta : [resposta]).map(Number));
        q.inputs.forEach((input, idx) => {
          const deveEstarMarcado = marcar.has(idx);
          if (input.checked !== deveEstarMarcado) input.click();
        });
        return marcar.size > 0;
      }
      default: return false;
    }
  }

  function resumoResposta(q, resposta) {
    if (q.tipo === 'shortanswer') return `"${resposta}"`;
    const lista = Array.isArray(resposta) ? resposta : [resposta];
    return lista.map(v => q.opcoes.find(o => o.valor === String(v))?.texto ?? String(v)).join(' | ');
  }

  // ---------- Efeitos visuais ----------
  function destacarQuestao(el, cor) {
    if (REDUZIR_MOVIMENTO || !el?.animate) return;
    el.animate([
      { outline: '2px solid transparent', outlineOffset: '4px', boxShadow: 'none' },
      { outline: `2px solid ${cor}`, outlineOffset: '4px', boxShadow: `0 0 22px ${cor}` },
      { outline: '2px solid transparent', outlineOffset: '4px', boxShadow: 'none' },
    ], { duration: 1100, easing: 'ease-in-out' });
  }

  function flash(cor) {
    if (REDUZIR_MOVIMENTO || !ui) return;
    ui.card.animate([
      { boxShadow: BRILHO_BASE },
      { boxShadow: `0 0 40px ${cor}, inset 0 0 40px ${cor}` },
      { boxShadow: BRILHO_BASE },
    ], { duration: 700, easing: 'ease-out' });
  }

  function setStatus(texto) {
    if (!ui) return;
    ui.status.textContent = texto;
    if (!REDUZIR_MOVIMENTO) {
      ui.status.animate(
        [{ opacity: 0.2, transform: 'translateX(-4px)' }, { opacity: 1, transform: 'none' }],
        { duration: 280, easing: 'ease-out' }
      );
    }
  }

  function iniciarCarregamento(ativo) {
    if (!ui) return;
    ui.barra.classList.toggle('ativa', ativo);
    ui.resolver.textContent = ativo ? '[ ANALISANDO ]' : '[ EXECUTAR ]';
    atualizarBotoes();
  }

  function atualizarBotoes() {
    if (!ui) return;
    ui.resolver.disabled = ocupado;
    ui.previa.disabled = ocupado;
  }

  function alternarMinimizado() {
    const minimizado = ui.corpo.classList.toggle('oculto');
    ui.card.classList.toggle('minimizado', minimizado);
    ui.minimizar.textContent = minimizado ? '+' : '–';
    salvarLayout();
  }

  // ---------- Navegação ----------
  function agendarProximaPagina() {
    const proxima = document.querySelector('#mod_quiz-next-nav');
    if (proxima) {
      log(`avançando para a próxima página em ${ATRASO_AVANCO_MS / 1000}s...`);
      timerAvanco = setTimeout(() => proxima.click(), ATRASO_AVANCO_MS);
    } else {
      log('última página: revise tudo e envie a prova manualmente.', 'aviso');
    }
  }

  // ---------- Fluxo principal ----------
  async function resolver({ aplicar = true } = {}) {
    if (ocupado) return log('já existe uma operação em andamento.', 'aviso');

    const questoes = coletarQuestoes();
    if (!questoes.length) return log('nenhuma questão respondível encontrada nesta página.', 'aviso');

    ocupado = true;
    execucao = new AbortController();
    iniciarCarregamento(true);
    setStatus(`consultando ia (${questoes.length} questão(ões))...`);

    try {
      // Usa a chave e modelo fixos do topo do script
      const conteudo = await chamarGroq(API_KEY_HARDCODED, MODELO_PADRAO, montarPrompt(questoes), execucao.signal);
      const respostas = extrairRespostas(conteudo);

      let preenchidas = 0;
      for (const q of questoes) {
        const rotulo = `Q${q.indice + 1}`;
        const resposta = respostas[q.indice];

        if (resposta === undefined || resposta === null || resposta === '') {
          log(`${rotulo}: sem resposta da ia.`, 'aviso');
          continue;
        }

        if (!aplicar) {
          log(`${rotulo} (prévia): ${resumoResposta(q, resposta)}`);
          destacarQuestao(q.el, COR.ambar);
          continue;
        }

        const ok = aplicarResposta(q, resposta);
        if (ok) preenchidas++;
        log(`${rotulo}: ${resumoResposta(q, resposta)} ${ok ? '✔' : '✖ não aplicada'}`, ok ? 'ok' : 'erro');
        destacarQuestao(q.el, ok ? COR.verde : COR.vermelho);
      }

      setStatus(aplicar
        ? `${preenchidas} de ${questoes.length} preenchida(s).`
        : 'prévia concluída. nada foi marcado.');
      flash(aplicar ? COR.verde : COR.ambar);

      if (aplicar && lerPref(PREF.avancar, 'false') === 'true') agendarProximaPagina();
    } catch (erro) {
      if (erro.message === 'cancelado') return;
      log(`falha: ${erro.message}`, 'erro');
      setStatus('erro. veja o log.');
      flash(COR.vermelho);
    } finally {
      execucao = null;
      ocupado = false;
      iniciarCarregamento(false);
    }
  }

  // ---------- Log com digitação ----------
  function criarLinha(nivel) {
    if (!ui) return null;
    const linha = document.createElement('div');
    linha.className = nivel;
    ui.log.appendChild(linha);
    while (ui.log.childElementCount > MAX_LINHAS_LOG) ui.log.firstElementChild.remove();
    ui.log.scrollTop = ui.log.scrollHeight;
    return linha;
  }

  function log(mensagem, nivel = 'info') {
    const linha = criarLinha(nivel);
    if (!linha) return;
    const hora = new Date().toLocaleTimeString('pt-BR');
    linha.textContent = `${hora} ${PREFIXO_LOG[nivel] || '[*]'} ${mensagem}`;
    console.log('[Eskada Bypass]', mensagem);
  }

  async function digitarLog(texto, nivel = 'info') {
    const linha = criarLinha(nivel);
    if (!linha) return;
    const prefixo = `${PREFIXO_LOG[nivel] || '[*]'} `;
    if (REDUZIR_MOVIMENTO) {
      linha.textContent = prefixo + texto;
      return;
    }
    for (let i = 1; i <= texto.length; i++) {
      if (!linha.isConnected) return;
      linha.textContent = prefixo + texto.slice(0, i) + (i < texto.length ? '_' : '');
      await esperar(18);
    }
  }

  async function sequenciaBoot() {
    await digitarLog('iniciando módulo eskada...');
    await esperar(120);
    await digitarLog('carregando motor de leitura de questões...');
    await esperar(120);
    await digitarLog('motor pronto.', 'ok');
    log('sistema online. chave embutida.', 'ok');
  }

  // ---------- Janela: arrastar, redimensionar, fechar ----------
  function salvarLayout() {
    if (!ui) return;
    const r = ui.host.getBoundingClientRect();
    const anterior = lerLayout() || {};
    const redimensionado = ui.card.dataset.redim === '1';
    const minimizado = ui.card.classList.contains('minimizado');
    gravarPref(PREF.layout, JSON.stringify({
      x: Math.round(r.left),
      y: Math.round(r.top),
      w: redimensionado ? ui.card.offsetWidth : null,
      h: redimensionado && !minimizado ? ui.card.offsetHeight : (anterior.h ?? null),
    }));
  }

  function restaurarLayout() {
    const l = lerLayout();
    if (!l) return;
    if (Number.isFinite(l.x)) ui.host.style.left = clamp(l.x, 0, innerWidth - 80) + 'px';
    if (Number.isFinite(l.y)) ui.host.style.top = clamp(l.y, 0, innerHeight - 40) + 'px';
    if (l.w) ui.card.style.width = clamp(l.w, 300, innerWidth) + 'px';
    if (l.h) {
      ui.card.style.height = clamp(l.h, 200, innerHeight) + 'px';
      ui.card.dataset.redim = '1';
    }
  }

  function tornarArrastavel(host, card, alca) {
    let arrastando = false;
    let offX = 0;
    let offY = 0;

    alca.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button')) return;
      arrastando = true;
      const r = host.getBoundingClientRect();
      offX = e.clientX - r.left;
      offY = e.clientY - r.top;
      alca.setPointerCapture(e.pointerId);
      card.classList.add('arrastando');
    });

    alca.addEventListener('pointermove', e => {
      if (!arrastando) return;
      host.style.left = clamp(e.clientX - offX, 0, innerWidth - 80) + 'px';
      host.style.top = clamp(e.clientY - offY, 0, innerHeight - 40) + 'px';
    });

    const soltar = () => {
      if (!arrastando) return;
      arrastando = false;
      card.classList.remove('arrastando');
      salvarLayout();
    };
    alca.addEventListener('pointerup', soltar);
    alca.addEventListener('pointercancel', soltar);
  }

  function tornarRedimensionavel(card, puxador) {
    let redimensionando = false;
    let x0 = 0, y0 = 0, w0 = 0, h0 = 0;

    puxador.addEventListener('pointerdown', e => {
      e.preventDefault();
      redimensionando = true;
      x0 = e.clientX;
      y0 = e.clientY;
      w0 = card.offsetWidth;
      h0 = card.offsetHeight;
      puxador.setPointerCapture(e.pointerId);
    });

    puxador.addEventListener('pointermove', e => {
      if (!redimensionando) return;
      card.style.width = clamp(w0 + e.clientX - x0, 300, innerWidth - 20) + 'px';
      card.style.height = clamp(h0 + e.clientY - y0, 200, innerHeight - 20) + 'px';
      card.dataset.redim = '1';
    });

    const soltar = () => {
      if (!redimensionando) return;
      redimensionando = false;
      salvarLayout();
    };
    puxador.addEventListener('pointerup', soltar);
    puxador.addEventListener('pointercancel', soltar);
  }

  function fecharPainel() {
    if (!ui) return;
    if (execucao) execucao.abort();
    clearTimeout(timerAvanco);
    salvarLayout();

    const host = ui.host;
    const card = ui.card;
    ui = null;

    if (REDUZIR_MOVIMENTO) {
      host.remove();
      return;
    }
    const saida = card.animate([
      { opacity: 1, transform: 'scale(1)', filter: 'blur(0)' },
      { opacity: 0, transform: 'scale(.9) translateY(-10px)', filter: 'blur(4px)' },
    ], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    saida.onfinish = () => host.remove();
  }

  // ---------- Montagem ----------
  function criarPainel() {
    const host = document.createElement('div');
    host.id = ID_HOST;
    Object.assign(host.style, {
      position: 'fixed',
      top: '80px',
      left: Math.max(16, innerWidth - 360) + 'px',
      zIndex: '2147483647',
    });
    document.body.appendChild(host);

    const root = host.attachShadow({ mode: 'open' });
    root.innerHTML = `
      <style>${CSS}</style>
      <div class="card" id="card">
        <header id="alca">
          <div class="titulo">
            <b>ESKADA BYPASS<span class="cursor">_</span></b>
            <small><span class="dot"></span>by bruno nwask</small>
          </div>
          <span class="acoes">
            <button id="minimizar" title="Minimizar">–</button>
            <button id="fechar" title="Fechar">×</button>
          </span>
        </header>
        <div class="corpo" id="corpo">
          <div class="linha">
            <button class="btn primario" id="resolver">[ EXECUTAR ]</button>
            <button class="btn" id="previa" title="Consulta a IA e mostra as respostas sem marcar nada">[ PRÉVIA ]</button>
          </div>
          <label class="toggle">
            <input type="checkbox" id="opt-avancar" hidden>
            <span class="switch"></span>
            <span>auto-avançar página ao preencher</span>
          </label>
          
          <div id="status">standby</div>
          <div class="barra" id="barra"><div class="preenche"></div></div>
          <div id="log"></div>
        </div>
        <div class="resizer" id="resizer"></div>
      </div>`;

    const $ = id => root.getElementById(id);
    ui = {
      host,
      card: $('card'),
      alca: $('alca'),
      puxador: $('resizer'),
      corpo: $('corpo'),
      minimizar: $('minimizar'),
      fechar: $('fechar'),
      resolver: $('resolver'),
      previa: $('previa'),
      optAvancar: $('opt-avancar'),
      status: $('status'),
      barra: $('barra'),
      log: $('log'),
    };

    restaurarLayout();
    tornarArrastavel(host, ui.card, ui.alca);
    tornarRedimensionavel(ui.card, ui.puxador);

    host.addEventListener('eskada:fechar', fecharPainel);
    ui.fechar.addEventListener('click', fecharPainel);
    ui.minimizar.addEventListener('click', alternarMinimizado);
    ui.resolver.addEventListener('click', () => resolver({ aplicar: true }));
    ui.previa.addEventListener('click', () => resolver({ aplicar: false }));

    ui.optAvancar.checked = lerPref(PREF.avancar, 'false') === 'true';
    ui.optAvancar.addEventListener('change', e => {
      gravarPref(PREF.avancar, e.target.checked);
      log(`auto-avançar ${e.target.checked ? 'ativado' : 'desativado'}.`);
    });
  }

  function init() {
    criarPainel();
    sequenciaBoot();
  }

  init();
})();
