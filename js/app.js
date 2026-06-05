// js/app.js — Baliza · lógica principal

let consultorId = null, consultorNome = ''
let licencas = [], condicionantes = []
let licencaSelecionada = null
let telaAtual = 'dashboard'

// ─── Wizard state ─────────────────────────────────────────────────────────
let wiz = { step: 1, clienteNome: '', clienteCnpj: '', tipo: '', numero: '', orgao: '', empreendimento: '', dataEmissao: '', dataValidade: '', nConds: 0, conds: [] }

// ─── Init ─────────────────────────────────────────────────────────────────
async function init() {
  const { data: { session } } = await db.auth.getSession()
  if (!session) { window.location.href = 'login.html'; return }
  const { data: c } = await db.from('consultores').select('*').eq('user_id', session.user.id).single()
  if (!c) { window.location.href = 'login.html'; return }
  consultorId = c.id
  consultorNome = c.nome
  document.getElementById('sidebar-nome').textContent = c.nome
  document.getElementById('sidebar-empresa').textContent = c.empresa || 'Consultor Ambiental'
  document.getElementById('header-date').textContent = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
  await carregar()
  mostrarTela('dashboard')
}

async function carregar() {
  const [rl, rc] = await Promise.all([
    db.from('licencas').select('*').eq('consultor_id', consultorId).order('data_validade'),
    db.from('condicionantes').select('*').eq('consultor_id', consultorId).order('prazo_data'),
  ])
  licencas = rl.data ?? []
  condicionantes = rc.data ?? []
  atualizarBadge()
}

// ─── Navegação ────────────────────────────────────────────────────────────
function mostrarTela(nome) {
  telaAtual = nome
  licencaSelecionada = null
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'))
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'))
  document.getElementById(`tela-${nome}`)?.classList.add('active')
  document.querySelector(`[data-tela="${nome}"]`)?.classList.add('active')
  const titles = { dashboard: 'Painel', licencas: 'Licenças', perfil: 'Perfil' }
  document.getElementById('header-title').textContent = titles[nome] ?? nome
  const r = { dashboard: renderDashboard, licencas: renderLicencas, perfil: renderPerfil }
  r[nome]?.()
}

// ─── Helpers ──────────────────────────────────────────────────────────────
const dias = d => d ? Math.floor((new Date(d) - Date.now()) / 86400000) : null

function statusCond(c) {
  if (c.status === 'cumprida') return 'cumprida'
  if (!c.prazo_data) return 'pendente'
  const d = dias(c.prazo_data)
  return d < 0 ? 'atrasada' : 'pendente'
}

function tagHtml(s) {
  const m = { cumprida: ['tag-ok', 'Em dia'], pendente: ['tag-warn', 'Pendente'], atrasada: ['tag-err', 'Atrasada'] }
  const [cls, l] = m[s] ?? ['tag-neu', s]
  return `<span class="tag ${cls}">${l}</span>`
}

function atualizarBadge() {
  const n = condicionantes.filter(c => statusCond(c) === 'atrasada').length
  const b = document.getElementById('badge-nav')
  b.textContent = n; b.style.display = n > 0 ? 'flex' : 'none'
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function renderDashboard() {
  const atrasadas = condicionantes.filter(c => statusCond(c) === 'atrasada').length
  const alertas   = condicionantes.filter(c => statusCond(c) === 'pendente' && c.prazo_data && dias(c.prazo_data) <= 30 && dias(c.prazo_data) >= 0).length
  const emDia     = condicionantes.filter(c => statusCond(c) === 'cumprida').length

  document.getElementById('kpi-a').textContent = atrasadas
  document.getElementById('kpi-al').textContent = alertas
  document.getElementById('kpi-ok').textContent = emDia
  document.getElementById('kpi-lic').textContent = licencas.length
  document.getElementById('kpi-co').textContent = condicionantes.length

  const urgentes = licencas.filter(l => {
    const cc = condicionantes.filter(c => c.licenca_id === l.id)
    return cc.some(c => statusCond(c) === 'atrasada' || (statusCond(c) === 'pendente' && c.prazo_data && dias(c.prazo_data) <= 30))
  })

  const el = document.getElementById('dash-urgentes')
  if (urgentes.length === 0) {
    el.innerHTML = '<div class="card"><div class="empty"><div class="ic">✓</div>Nenhuma urgência no momento.</div></div>'
    return
  }
  el.innerHTML = urgentes.map(l => {
    const cc = condicionantes.filter(c => c.licenca_id === l.id)
    const crit = cc.find(c => statusCond(c) === 'atrasada') ?? cc.find(c => statusCond(c) === 'pendente')
    const cor = statusCond(crit) === 'atrasada' ? 'var(--red)' : 'var(--amber)'
    const dv = dias(l.data_validade)
    return `
    <div class="lic-card" style="border-left:4px solid ${cor}" onclick="verLicenca('${l.id}')">
      <div class="row-b">
        <div>
          <div class="row" style="gap:8px;margin-bottom:5px">
            <span class="tipo-chip">${l.tipo}</span>
            <span style="font-size:14px;font-weight:500">${l.cliente_nome}</span>
          </div>
          <div style="font-size:12px;color:var(--ink2)">${l.empreendimento || l.orgao || '—'}</div>
          ${crit ? `<div style="font-size:12px;color:${cor};margin-top:5px;font-style:italic">
            ${statusCond(crit) === 'atrasada' ? `⚠ Condicionante ${crit.numero} atrasada` : `⏱ Condicionante ${crit.numero} vence em breve`}
          </div>` : ''}
        </div>
        ${dv !== null ? `<div style="text-align:right">
          <div style="font-size:22px;font-weight:300;font-family:'DM Mono',monospace;color:${dv<60?'var(--red)':dv<180?'var(--amber)':'var(--ink)'}">${dv}d</div>
          <div style="font-size:10px;color:var(--ink2)">validade</div>
        </div>` : ''}
      </div>
      <div class="cond-dots">${cc.map(c => `<div class="cond-dot" style="background:${statusCond(c)==='atrasada'?'var(--red)':statusCond(c)==='pendente'?'var(--amber)':'var(--cyan)'}"></div>`).join('')}</div>
    </div>`
  }).join('')
}

// ─── LICENÇAS ─────────────────────────────────────────────────────────────
function renderLicencas() {
  if (licencaSelecionada) { renderDetalhe(); return }
  document.getElementById('subtitulo-licencas').textContent = `${licencas.length} cadastradas`

  const sorted = [...licencas].sort((a, b) => {
    const fa = condicionantes.filter(c => c.licenca_id === a.id).some(c => statusCond(c) === 'atrasada') ? 0 : 1
    const fb = condicionantes.filter(c => c.licenca_id === b.id).some(c => statusCond(c) === 'atrasada') ? 0 : 1
    return fa - fb
  })

  const el = document.getElementById('lista-licencas')
  if (sorted.length === 0) {
    el.innerHTML = '<div class="empty"><div class="ic">≡</div>Nenhuma licença. Clique em "+ Nova licença".</div>'
    return
  }
  el.innerHTML = sorted.map(l => {
    const cc = condicionantes.filter(c => c.licenca_id === l.id)
    const temA = cc.some(c => statusCond(c) === 'atrasada')
    const temW = cc.some(c => statusCond(c) === 'pendente' && c.prazo_data && dias(c.prazo_data) <= 30)
    const cor = temA ? 'var(--red)' : temW ? 'var(--amber)' : 'var(--line)'
    const dv = dias(l.data_validade)
    return `
    <div class="lic-card" style="border-left:4px solid ${cor}" onclick="verLicenca('${l.id}')">
      <div class="row-b">
        <div>
          <div class="row" style="gap:8px;margin-bottom:5px">
            <span class="tipo-chip">${l.tipo}</span>
            <span style="font-size:14px;font-weight:500">${l.cliente_nome}</span>
            ${l.numero ? `<span style="font-size:11px;color:var(--ink2);font-family:'DM Mono',monospace">${l.numero}</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--ink2)">${l.empreendimento || '—'} · ${l.orgao || '—'}</div>
          <div style="font-size:12px;color:var(--ink2);margin-top:2px">Validade: ${l.data_validade} · ${cc.length} condicionante${cc.length !== 1 ? 's' : ''}</div>
        </div>
        ${dv !== null ? `<div style="text-align:right;flex-shrink:0">
          <div style="font-size:22px;font-weight:300;font-family:'DM Mono',monospace;color:${dv<60?'var(--red)':dv<180?'var(--amber)':'var(--ink)'}">${dv}d</div>
          <div style="font-size:10px;color:var(--ink2)">validade</div>
        </div>` : ''}
      </div>
      <div class="cond-dots">${cc.map(c => `<div class="cond-dot" style="background:${statusCond(c)==='atrasada'?'var(--red)':statusCond(c)==='pendente'?'var(--amber)':'var(--cyan)'}"></div>`).join('')}</div>
    </div>`
  }).join('')
}

function verLicenca(id) {
  licencaSelecionada = id
  renderDetalhe()
}

function renderDetalhe() {
  const l = licencas.find(x => x.id === licencaSelecionada)
  if (!l) { licencaSelecionada = null; renderLicencas(); return }
  const cc = condicionantes.filter(c => c.licenca_id === l.id)
  const dv = dias(l.data_validade)

  document.getElementById('subtitulo-licencas').textContent = 'detalhe'
  const el = document.getElementById('lista-licencas')
  el.innerHTML = `
    <div class="row" style="margin-bottom:20px;gap:10px">
      <button class="btn btn-outline btn-sm" onclick="voltarLicencas()">← Voltar</button>
      <div>
        <div class="row" style="gap:8px">
          <span class="tipo-chip">${l.tipo}</span>
          <span style="font-size:22px;font-weight:400;letter-spacing:-.3px">${l.cliente_nome}</span>
        </div>
        ${l.cliente_cnpj ? `<div style="font-size:12px;color:var(--ink2);font-family:'DM Mono',monospace;margin-top:2px">CNPJ: ${l.cliente_cnpj}</div>` : ''}
      </div>
      <button class="btn btn-danger btn-sm" style="margin-left:auto" onclick="excluirLicenca('${l.id}')">Excluir</button>
    </div>

    <div class="g2" style="margin-bottom:16px">
      <div class="card">
        <div style="font-size:11px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px">Dados da licença</div>
        ${[['Número', l.numero], ['Órgão', l.orgao], ['Empreendimento', l.empreendimento], ['Emissão', l.data_emissao], ['Validade', l.data_validade]].filter(([, v]) => v).map(([k, v]) => `
          <div class="det-row"><span class="k">${k}</span><span class="v ${k === 'Validade' && dv !== null && dv < 60 ? 'err' : k === 'Validade' && dv !== null && dv < 180 ? 'warn' : ''}">${v}</span></div>
        `).join('')}
        <div class="det-row"><span class="k">Protocolar renovação</span><span class="v warn">${l.data_validade ? new Date(new Date(l.data_validade).getTime() - 180 * 86400000).toLocaleDateString('pt-BR') : '—'}</span></div>
      </div>
      <div class="card" style="text-align:center">
        <div style="font-size:11px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px;margin-bottom:12px">Dias para vencer</div>
        <div style="font-size:50px;font-weight:300;font-family:'DM Mono',monospace;color:${dv !== null && dv < 60 ? 'var(--red)' : dv !== null && dv < 180 ? 'var(--amber)' : 'var(--ink)'}">${dv ?? '—'}</div>
        <div style="font-size:12px;color:var(--ink2);margin-top:8px">Lei 15.190/2025: protocolar entre 120–180d antes</div>
      </div>
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--ink2);text-transform:uppercase;letter-spacing:.4px">${cc.length} condicionante${cc.length !== 1 ? 's' : ''}</div>
    </div>
    ${cc.length === 0 ? '<div class="card"><div class="empty" style="padding:20px"><div class="ic">—</div>Nenhuma condicionante</div></div>' : cc.map(c => {
      const s = statusCond(c)
      const d = c.prazo_data ? dias(c.prazo_data) : null
      return `
      <div class="cond-item ${s}">
        <div class="row-b">
          <div style="flex:1">
            <div class="row" style="gap:7px;margin-bottom:6px">
              <span style="width:24px;height:24px;border-radius:6px;background:var(--navy);color:#E8F2F8;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;flex-shrink:0">${c.numero || '—'}</span>
              ${tagHtml(s)}
            </div>
            <div style="font-size:13px;line-height:1.5;color:var(--ink)">${c.descricao}</div>
          </div>
          <div style="text-align:right;flex-shrink:0;margin-left:16px">
            ${d !== null ? `<div style="font-family:'DM Mono',monospace;font-size:13px;font-weight:500;color:${d < 0 ? 'var(--red)' : d < 30 ? 'var(--amber)' : 'var(--cyan-d)'}">${d < 0 ? Math.abs(d) + 'd atraso' : d + 'd'}</div>` : ''}
            ${c.prazo_data ? `<div style="font-size:11px;color:var(--ink2)">${new Date(c.prazo_data + 'T12:00:00').toLocaleDateString('pt-BR')}</div>` : ''}
            <button class="btn btn-outline btn-sm" style="margin-top:8px" onclick="toggleCond('${c.id}','${s}')">
              ${s === 'cumprida' ? 'Reabrir' : 'Cumprir ✓'}
            </button>
          </div>
        </div>
      </div>`
    }).join('')}
  `
}

function voltarLicencas() { licencaSelecionada = null; renderLicencas() }

async function excluirLicenca(id) {
  if (!confirm('Excluir esta licença e todas as suas condicionantes?')) return
  await db.from('licencas').delete().eq('id', id)
  licencas = licencas.filter(l => l.id !== id)
  condicionantes = condicionantes.filter(c => c.licenca_id !== id)
  voltarLicencas(); atualizarBadge()
}

async function toggleCond(id, statusAtual) {
  const novo = statusAtual === 'cumprida' ? 'pendente' : 'cumprida'
  await db.from('condicionantes').update({ status: novo }).eq('id', id)
  const i = condicionantes.findIndex(c => c.id === id)
  if (i >= 0) condicionantes[i].status = novo
  renderDetalhe(); atualizarBadge()
}

// ─── WIZARD: Nova licença ─────────────────────────────────────────────────
function abrirWizard() {
  wiz = { step: 1, clienteNome: '', clienteCnpj: '', tipo: 'LO', numero: '', orgao: '', empreendimento: '', dataEmissao: '', dataValidade: '', nConds: 0, conds: [] }
  document.getElementById('modal-wiz').classList.add('open')
  document.getElementById('msg-wiz').innerHTML = ''
  renderWizStep()
}

function fecharWizard() { document.getElementById('modal-wiz').classList.remove('open') }

function renderWizStep() {
  const cont = document.getElementById('wiz-body')
  document.getElementById('msg-wiz').innerHTML = ''

  // Indicadores de passo
  const steps = ['Cliente', 'Licença', 'Nº conds', 'Condicionantes']
  document.getElementById('wiz-steps').innerHTML = steps.map((s, i) => {
    const n = i + 1
    const cls = n < wiz.step ? 'done' : n === wiz.step ? 'active' : ''
    return `${i > 0 ? '<div class="step-sep"></div>' : ''}<div class="step-item ${cls}"><div class="sn">${n < wiz.step ? '✓' : n}</div><span>${s}</span></div>`
  }).join('')

  // Botões nav
  const nav = document.getElementById('wiz-nav')

  if (wiz.step === 1) {
    cont.innerHTML = `
      <div class="cnpj-box">
        <div class="lbl">Buscar na Receita Federal (opcional)</div>
        <div class="row">
          <input class="input mono" id="w-cnpj" placeholder="00.000.000/0000-00" maxlength="18" style="flex:1" oninput="this.value=fmtCnpj(this.value)">
          <button class="btn btn-navy btn-sm" onclick="wizBuscarCnpj()">Buscar</button>
        </div>
        <div id="w-cnpj-result" style="margin-top:10px"></div>
      </div>
      <div class="field"><label class="label">Nome do cliente *</label><input class="input" id="w-nome" value="${wiz.clienteNome}" placeholder="Razão social ou nome do empreendedor"></div>
    `
    if (wiz.clienteCnpj) document.getElementById('w-cnpj').value = wiz.clienteCnpj
    nav.innerHTML = `<button class="btn btn-cyan" onclick="wizAvancar()">Próximo →</button>`
  }

  else if (wiz.step === 2) {
    const tipos = ['LP', 'LI', 'LO', 'LAU', 'LAC', 'LOC', 'LAE', 'Outro']
    cont.innerHTML = `
      <div class="g2">
        <div class="field">
          <label class="label">Tipo *</label>
          <div style="display:flex;flex-wrap:wrap;gap:6px">
            ${tipos.map(t => `<button class="btn ${wiz.tipo === t ? 'btn-navy' : 'btn-outline'} btn-sm" style="font-family:'DM Mono',monospace" onclick="wiz.tipo='${t}';renderWizStep()">${t}</button>`).join('')}
          </div>
        </div>
        <div class="field"><label class="label">Número do processo</label><input class="input mono" id="w-num" value="${wiz.numero}" placeholder="ex: 1234/2024"></div>
        <div class="field"><label class="label">Órgão</label><input class="input" id="w-orgao" value="${wiz.orgao}" placeholder="INEMA, IBAMA…"></div>
        <div class="field"><label class="label">Empreendimento / local</label><input class="input" id="w-emp" value="${wiz.empreendimento}"></div>
        <div class="field"><label class="label">Data de emissão</label><input class="input" id="w-emissao" type="date" value="${wiz.dataEmissao}"></div>
        <div class="field"><label class="label">Data de validade *</label><input class="input" id="w-validade" type="date" value="${wiz.dataValidade}"></div>
      </div>
    `
    nav.innerHTML = `<button class="btn btn-outline" onclick="wizVoltar()">← Voltar</button><button class="btn btn-cyan" onclick="wizAvancar()">Próximo →</button>`
  }

  else if (wiz.step === 3) {
    cont.innerHTML = `
      <div style="text-align:center;padding:16px 0 24px">
        <div style="font-size:15px;font-weight:500;color:var(--ink);margin-bottom:6px">Quantas condicionantes tem esta licença?</div>
        <div style="font-size:13px;color:var(--ink2);margin-bottom:28px">Abriremos exatamente esse número de campos.</div>
        <div class="row" style="justify-content:center;gap:12px">
          <button class="btn btn-outline" style="width:36px;height:36px;padding:0;font-size:20px;border-radius:8px" onclick="ajustarN(-1)">−</button>
          <input class="input mono" id="w-n" type="number" min="1" max="50" value="${wiz.nConds || ''}" placeholder="0"
            style="width:90px;text-align:center;font-size:28px;font-weight:300;height:56px;border-radius:10px"
            oninput="wiz.nConds=parseInt(this.value)||0">
          <button class="btn btn-outline" style="width:36px;height:36px;padding:0;font-size:20px;border-radius:8px" onclick="ajustarN(1)">+</button>
        </div>
      </div>
    `
    nav.innerHTML = `<button class="btn btn-outline" onclick="wizVoltar()">← Voltar</button><button class="btn btn-cyan" onclick="wizAvancar()">Ver campos →</button>`
  }

  else if (wiz.step === 4) {
    const n = wiz.nConds
    // Garante array do tamanho certo
    while (wiz.conds.length < n) wiz.conds.push({ descricao: '', prazo: '' })
    wiz.conds = wiz.conds.slice(0, n)

    cont.innerHTML = `
      <div style="font-size:13px;color:var(--ink2);margin-bottom:20px">${n} condicionante${n !== 1 ? 's' : ''} para preencher — descrição e prazo de cada uma.</div>
      <div id="conds-container">
        ${wiz.conds.map((c, i) => `
          <div class="cond-row">
            <div class="row" style="gap:12px;align-items:flex-start">
              <div class="cond-num">${i + 1}</div>
              <div style="flex:1">
                <div class="field" style="margin-bottom:8px">
                  <label class="label">Descrição da condicionante ${i + 1}</label>
                  <textarea class="textarea" rows="2" id="cd-${i}" oninput="wiz.conds[${i}].descricao=this.value" placeholder="Texto completo da condicionante…">${c.descricao}</textarea>
                </div>
                <div class="field" style="margin-bottom:0">
                  <label class="label">Prazo / data limite</label>
                  <input class="input" type="date" id="cp-${i}" value="${c.prazo}" oninput="wiz.conds[${i}].prazo=this.value" style="max-width:200px">
                </div>
              </div>
            </div>
          </div>`).join('')}
      </div>
    `
    nav.innerHTML = `<button class="btn btn-outline" onclick="wizVoltar()">← Voltar</button><button class="btn btn-cyan" onclick="wizSalvar()">Salvar licença</button>`
  }
}

function fmtCnpj(v) { return v.replace(/\D/g,'').replace(/(\d{2})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1/$2').replace(/(\d{4})(\d)/,'$1-$2').slice(0,18) }

async function wizBuscarCnpj() {
  const cnpj = document.getElementById('w-cnpj').value.replace(/\D/g,'')
  if (cnpj.length !== 14) return
  const r = document.getElementById('w-cnpj-result')
  r.innerHTML = '<span style="font-size:12px;color:var(--ink2)">Buscando…</span>'
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
    const d = await res.json()
    if (d.razao_social) {
      wiz.clienteNome = d.razao_social
      wiz.clienteCnpj = document.getElementById('w-cnpj').value
      document.getElementById('w-nome').value = d.razao_social
      r.innerHTML = `<div style="padding:10px 12px;background:#D6F5EF;border-radius:8px;font-size:12px;color:#007A65"><strong>${d.razao_social}</strong><br>${d.municipio}/${d.uf} · ${d.descricao_situacao_cadastral}</div>`
    } else { r.innerHTML = '<span style="font-size:12px;color:var(--red)">Não encontrado</span>' }
  } catch { r.innerHTML = '<span style="font-size:12px;color:var(--red)">Erro na consulta</span>' }
}

function ajustarN(delta) {
  const input = document.getElementById('w-n')
  const v = Math.max(1, Math.min(50, (parseInt(input.value) || 0) + delta))
  input.value = v; wiz.nConds = v
}

function wizAvancar() {
  const msg = document.getElementById('msg-wiz')
  if (wiz.step === 1) {
    wiz.clienteNome = document.getElementById('w-nome').value.trim()
    wiz.clienteCnpj = document.getElementById('w-cnpj')?.value.trim() || ''
    if (!wiz.clienteNome) { msg.innerHTML = '<div class="msg-err">Informe o nome do cliente</div>'; return }
  }
  if (wiz.step === 2) {
    wiz.numero = document.getElementById('w-num').value.trim()
    wiz.orgao = document.getElementById('w-orgao').value.trim()
    wiz.empreendimento = document.getElementById('w-emp').value.trim()
    wiz.dataEmissao = document.getElementById('w-emissao').value
    wiz.dataValidade = document.getElementById('w-validade').value
    if (!wiz.dataValidade) { msg.innerHTML = '<div class="msg-err">Informe a data de validade</div>'; return }
  }
  if (wiz.step === 3) {
    wiz.nConds = parseInt(document.getElementById('w-n').value) || 0
    if (wiz.nConds < 1) { msg.innerHTML = '<div class="msg-err">Informe o número de condicionantes (mínimo 1)</div>'; return }
  }
  wiz.step++
  renderWizStep()
}

function wizVoltar() { wiz.step--; renderWizStep() }

async function wizSalvar() {
  const msg = document.getElementById('msg-wiz')
  // Coleta valores dos textareas (podem ter sido editados sem o oninput disparar)
  wiz.conds.forEach((c, i) => {
    c.descricao = document.getElementById(`cd-${i}`)?.value.trim() || c.descricao
    c.prazo = document.getElementById(`cp-${i}`)?.value || c.prazo
  })
  const vazias = wiz.conds.filter(c => !c.descricao)
  if (vazias.length > 0) { msg.innerHTML = `<div class="msg-err">Preencha a descrição de todas as condicionantes</div>`; return }

  const btn = document.querySelector('#wiz-nav .btn-cyan')
  btn.disabled = true; btn.textContent = 'Salvando…'

  // Salva licença
  const { data: lic, error: e1 } = await db.from('licencas').insert({
    consultor_id: consultorId,
    cliente_nome: wiz.clienteNome,
    cliente_cnpj: wiz.clienteCnpj || null,
    tipo: wiz.tipo,
    numero: wiz.numero || null,
    orgao: wiz.orgao || null,
    empreendimento: wiz.empreendimento || null,
    data_emissao: wiz.dataEmissao || null,
    data_validade: wiz.dataValidade,
  }).select().single()
  if (e1) { msg.innerHTML = `<div class="msg-err">${e1.message}</div>`; btn.disabled = false; btn.textContent = 'Salvar licença'; return }

  // Salva condicionantes
  const rows = wiz.conds.map((c, i) => ({
    licenca_id: lic.id,
    consultor_id: consultorId,
    numero: i + 1,
    descricao: c.descricao,
    prazo_data: c.prazo || null,
    status: 'pendente',
  }))
  const { data: cds, error: e2 } = await db.from('condicionantes').insert(rows).select()
  if (e2) { msg.innerHTML = `<div class="msg-err">${e2.message}</div>`; btn.disabled = false; btn.textContent = 'Salvar licença'; return }

  licencas.push(lic)
  condicionantes.push(...(cds ?? []))
  fecharWizard()
  mostrarTela('licencas')
  atualizarBadge()
}

// ─── PERFIL ───────────────────────────────────────────────────────────────
function renderPerfil() {
  document.getElementById('p-nome').textContent = consultorNome
  document.getElementById('p-lic').textContent = licencas.length
  document.getElementById('p-co').textContent = condicionantes.length
  document.getElementById('p-at').textContent = condicionantes.filter(c => statusCond(c) === 'atrasada').length
}

async function sair() { await db.auth.signOut(); window.location.href = 'login.html' }

init()
