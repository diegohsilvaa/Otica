import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = ['Venda','Serviço','Fornecedor','Despesa Fixa','Aluguel','Energia','Internet','Funcionário','Retirada','Outros']
const formas = ['Pix','Dinheiro','Cartão','Transferência','Débito','Crédito']

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}
function formatDate(date) {
  if (!date) return '-'
  const [y,m,d] = date.split('-')
  return `${d}/${m}/${y}`
}
function emptyForm(date) {
  return { data: date, descricao: '', categoria: 'Venda', tipo: 'Entrada', forma: 'Pix', valor: '', observacao: '', responsavel: 'MEIRE' }
}

export default function App() {
  const hoje = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyForm(hoje))
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [showAberturaModal, setShowAberturaModal] = useState(false)
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  useEffect(() => { fetchAll() }, [])
  useEffect(() => { setForm((prev) => ({ ...prev, data: selectedDate })) }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    setErro('')
    const [lancResp, abResp, fechResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false })
    ])
    if (lancResp.error) { setErro(`Não foi possível carregar os lançamentos. ${lancResp.error.message}`); setLoading(false); return }
    if (abResp.error) { setErro(`Não foi possível carregar as aberturas. ${abResp.error.message}`); setLoading(false); return }
    if (fechResp.error) { setErro(`Não foi possível carregar os fechamentos. ${fechResp.error.message}`); setLoading(false); return }
    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
    setLoading(false)
  }

  const aberturaDoDia = useMemo(() => aberturas.find((i) => i.data === selectedDate) || null, [aberturas, selectedDate])
  const fechamentoDoDia = useMemo(() => fechamentos.find((i) => i.data === selectedDate) || null, [fechamentos, selectedDate])
  const lancamentosDoDia = useMemo(() => lancamentos.filter((i) => i.data === selectedDate), [lancamentos, selectedDate])

  const totalEntradas = useMemo(() => lancamentos.reduce((a,i)=>a+(i.tipo==='Entrada'?Number(i.valor):0),0), [lancamentos])
  const totalSaidas = useMemo(() => lancamentos.reduce((a,i)=>a+(i.tipo==='Saída'?Number(i.valor):0),0), [lancamentos])
  const entradasDia = useMemo(() => lancamentosDoDia.reduce((a,i)=>a+(i.tipo==='Entrada'?Number(i.valor):0),0), [lancamentosDoDia])
  const saidasDia = useMemo(() => lancamentosDoDia.reduce((a,i)=>a+(i.tipo==='Saída'?Number(i.valor):0),0), [lancamentosDoDia])

  const valorInicialDia = Number(aberturaDoDia?.valor_inicial || 0)
  const saldoDia = valorInicialDia + entradasDia - saidasDia
  const saldo = totalEntradas - totalSaidas
  const totalLancamentos = lancamentos.length
  const statusDia = fechamentoDoDia ? 'Fechado' : aberturaDoDia ? 'Aberto' : 'Não aberto'

  const filtrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''} ${item.responsavel}`.toLowerCase()
      return texto.includes(busca.toLowerCase()) &&
        (filtroTipo === 'Todos' || item.tipo === filtroTipo) &&
        (filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel)
    })
  }, [lancamentos, busca, filtroTipo, filtroResponsavel])

  const resumoPorResponsavel = useMemo(() => {
    return responsaveis.map((nome) => {
      const itens = lancamentos.filter((i) => i.responsavel === nome)
      const entradas = itens.reduce((a,i)=>a+(i.tipo==='Entrada'?Number(i.valor):0),0)
      const saidas = itens.reduce((a,i)=>a+(i.tipo==='Saída'?Number(i.valor):0),0)
      return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
    })
  }, [lancamentos])

  function updateField(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }
  function resetForm() { setForm(emptyForm(selectedDate)); setEditandoId(null); setErro('') }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')
    if (!aberturaDoDia) { setErro('Abra o caixa do dia antes de lançar movimentações.'); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado. Não é possível lançar novos movimentos.'); return }

    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.data || !form.descricao.trim() || !form.responsavel || !form.tipo) { setErro('Preencha data, descrição, tipo e responsável.'); return }
    if (!Number.isFinite(valor) || valor <= 0) { setErro('Informe um valor válido maior que zero.'); return }

    const payload = {
      data: form.data,
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      forma: form.forma,
      valor,
      observacao: form.observacao.trim(),
      responsavel: form.responsavel
    }

    setSalvando(true)
    if (editandoId) {
      const { error } = await supabase.from('lancamentos_caixa').update(payload).eq('id', editandoId)
      if (error) { setErro(`Não foi possível atualizar o lançamento. ${error.message}`); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('lancamentos_caixa').insert([payload])
      if (error) { setErro(`Não foi possível salvar o lançamento. ${error.message}`); setSalvando(false); return }
    }
    setSalvando(false)
    resetForm()
    fetchAll()
  }

  function editar(item) {
    if (fechamentos.find((f) => f.data === item.data)) { setErro('Este dia já foi fechado. Não é possível editar lançamentos.'); return }
    setForm({
      data: item.data, descricao: item.descricao, categoria: item.categoria, tipo: item.tipo, forma: item.forma,
      valor: String(item.valor), observacao: item.observacao || '', responsavel: item.responsavel || 'MEIRE'
    })
    setSelectedDate(item.data)
    setEditandoId(item.id)
    setErro('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function excluir(id, data) {
    if (fechamentos.find((f) => f.data === data)) { setErro('Este dia já foi fechado. Não é possível apagar lançamentos.'); return }
    const ok = window.confirm('Deseja apagar este lançamento?')
    if (!ok) return
    const { error } = await supabase.from('lancamentos_caixa').delete().eq('id', id)
    if (error) { setErro(`Não foi possível apagar o lançamento. ${error.message}`); return }
    if (editandoId === id) resetForm()
    fetchAll()
  }

  function abrirCaixaModal() {
    setErro('')
    if (aberturaDoDia) { setErro('O caixa deste dia já foi aberto.'); return }
    if (fechamentoDoDia) { setErro('Este dia já está fechado.'); return }
    setShowAberturaModal(true)
  }

  async function confirmarAbertura() {
    setErro('')
    const valorInicial = Number(String(aberturaValor).replace(',', '.'))
    if (!Number.isFinite(valorInicial) || valorInicial < 0) { setErro('Informe um valor inicial válido.'); return }
    setAbrindo(true)
    const payload = {
      data: selectedDate,
      valor_inicial: valorInicial,
      aberto_por: aberturaPor,
      observacao: aberturaObs.trim()
    }
    const { error } = await supabase.from('aberturas_caixa').insert([payload])
    if (error) { setErro(`Não foi possível abrir o caixa. ${error.message}`); setAbrindo(false); return }
    setAbrindo(false)
    setShowAberturaModal(false)
    setAberturaObs('')
    setAberturaValor('')
    fetchAll()
  }

  function abrirFechamentoModal() {
    setErro('')
    if (!aberturaDoDia) { setErro('Abra o caixa antes de fechar o dia.'); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado.'); return }
    if (!lancamentosDoDia.length) { setErro('Não há lançamentos neste dia para fechar o caixa.'); return }
    setShowFechamentoModal(true)
  }

  async function confirmarFechamento() {
    setErro('')
    setFechando(true)
    const payload = {
      data: selectedDate,
      total_entradas: entradasDia,
      total_saidas: saidasDia,
      saldo: saldoDia,
      fechado_por: fechamentoPor,
      observacao: fechamentoObs.trim()
    }
    const { error } = await supabase.from('fechamentos_caixa').insert([payload])
    if (error) { setErro(`Não foi possível fechar o caixa. ${error.message}`); setFechando(false); return }
    setFechando(false)
    setShowFechamentoModal(false)
    setFechamentoObs('')
    fetchAll()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <img src="./logo.jpeg" alt="Logo Óticas Fácil" className="brand-logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div>
            <p className="tag">Gestão financeira</p>
            <h1>Óticas Fácil</h1>
            <p className="muted">Painel empresarial com abertura e fechamento de caixa por dia.</p>
          </div>
        </div>

        <div className="menu-card">
          <div className="menu-item active">Dashboard Financeiro</div>
          <div className="menu-item">Livro Caixa</div>
          <div className="menu-item">Abertura e Fechamento</div>
          <div className="menu-item">Resumo Gerencial</div>
        </div>

        <div className="highlight-card">
          <p className="small-label">Saldo geral</p>
          <h3>{formatMoney(saldo)}</h3>
          <p className="muted dark-text">Acompanhe o caixa consolidado da empresa em tempo real.</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar enterprise">
          <div>
            <p className="page-kicker">Painel empresarial</p>
            <h2>Controle Financeiro da Ótica</h2>
            <p className="subtext">Abertura, movimentação e fechamento do caixa em fluxo correto.</p>
          </div>
          <div className="date-card">
            <span>Data de trabalho</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </header>

        {erro ? <div className="error-box">{erro}</div> : null}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="small-label neutral">Entradas totais</span>
            <strong>{formatMoney(totalEntradas)}</strong>
            <p>Recebimentos acumulados.</p>
          </div>
          <div className="stat-card">
            <span className="small-label neutral">Saídas totais</span>
            <strong>{formatMoney(totalSaidas)}</strong>
            <p>Pagamentos e retiradas.</p>
          </div>
          <div className="stat-card accent">
            <span className="small-label light">Saldo total</span>
            <strong>{formatMoney(saldo)}</strong>
            <p>Resultado geral do caixa.</p>
          </div>
          <div className="stat-card">
            <span className="small-label neutral">Status do dia</span>
            <strong>{statusDia}</strong>
            <p>{loading ? 'Carregando...' : 'Base sincronizada com o banco.'}</p>
          </div>
        </section>

        <section className="daily-grid open-close-grid">
          <div className="panel daily-panel">
            <div className="panel-title-row">
              <h3>Resumo do dia</h3>
              <span className={statusDia === 'Fechado' ? 'status-badge closed' : statusDia === 'Aberto' ? 'status-badge open' : 'status-badge neutral'}>
                {statusDia}
              </span>
            </div>
            <div className="daily-cards">
              <div className="daily-metric">
                <small>Valor inicial</small>
                <strong>{formatMoney(valorInicialDia)}</strong>
              </div>
              <div className="daily-metric">
                <small>Entradas do dia</small>
                <strong className="in-text">{formatMoney(entradasDia)}</strong>
              </div>
              <div className="daily-metric">
                <small>Saídas do dia</small>
                <strong className="out-text">{formatMoney(saidasDia)}</strong>
              </div>
              <div className="daily-metric">
                <small>Saldo do dia</small>
                <strong>{formatMoney(saldoDia)}</strong>
              </div>
            </div>
          </div>

          <div className="panel fluxo-panel">
            <div className="panel-title-row compact-head">
              <div>
                <h3>Fluxo do caixa</h3>
                <p>Abertura e fechamento discretos e seguros.</p>
              </div>
            </div>

            {!aberturaDoDia ? (
              <div className="compact-actions">
                <p className="compact-note">Abra o caixa antes de registrar movimentações.</p>
                <button className="secondary-compact-btn" type="button" onClick={abrirCaixaModal}>
                  Abrir caixa do dia
                </button>
              </div>
            ) : fechamentoDoDia ? (
              <div className="closed-info">
                <strong>Aberto por {aberturaDoDia.aberto_por}</strong>
                <span>Fechado por {fechamentoDoDia.fechado_por} • saldo final {formatMoney(fechamentoDoDia.saldo)}</span>
              </div>
            ) : (
              <div className="compact-actions">
                <div className="opened-info">
                  <strong>Caixa aberto por {aberturaDoDia.aberto_por}</strong>
                  <span>Valor inicial {formatMoney(aberturaDoDia.valor_inicial)}</span>
                </div>
                <button className="secondary-compact-btn" type="button" onClick={abrirFechamentoModal}>
                  Revisar e fechar o dia
                </button>
              </div>
            )}
          </div>
        </section>

        <section className="main-grid">
          <form className="panel form-panel" onSubmit={submitForm}>
            <div className="panel-head">
              <div>
                <h3>{editandoId ? 'Editar lançamento' : 'Novo lançamento financeiro'}</h3>
                <p>Cadastre entradas e saídas somente após a abertura do caixa.</p>
              </div>
              {editandoId ? <button type="button" className="secondary-btn" onClick={resetForm}>Cancelar</button> : null}
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Data</span>
                <input type="date" value={form.data} onChange={(e) => updateField('data', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>
              <label className="field">
                <span>Responsável</span>
                <select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>
                  {responsaveis.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="field field-full">
                <span>Descrição</span>
                <input type="text" placeholder="Ex.: venda de lentes, retirada, energia, fornecedor..." value={form.descricao} onChange={(e) => updateField('descricao', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>
              <label className="field">
                <span>Tipo</span>
                <select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>
                  <option>Entrada</option><option>Saída</option>
                </select>
              </label>
              <label className="field">
                <span>Categoria</span>
                <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>
                  {categorias.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Forma</span>
                <select value={form.forma} onChange={(e) => updateField('forma', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>
                  {formas.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Valor</span>
                <input type="text" placeholder="Ex.: 150,00" value={form.valor} onChange={(e) => updateField('valor', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>
              <label className="field field-full">
                <span>Observação</span>
                <textarea rows="4" placeholder="Detalhes opcionais" value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>
            </div>

            <button className="primary-btn" type="submit" disabled={salvando || !aberturaDoDia || !!fechamentoDoDia}>
              {salvando ? 'Salvando...' : editandoId ? 'Salvar alterações' : 'Adicionar lançamento'}
            </button>
          </form>

          <section className="panel list-panel">
            <div className="panel-head list-head">
              <div>
                <h3>Livro caixa</h3>
                <p>Visual mais empresarial, com filtros e histórico financeiro completo.</p>
              </div>
              <div className="filters">
                <input type="text" placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                  <option>Todos</option><option>Entrada</option><option>Saída</option>
                </select>
                <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                  <option>Todos</option>{responsaveis.map((item) => <option key={item}>{item}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="empty-state">Carregando dados do banco...</div>
            ) : (
              <div className="launch-list">
                {filtrados.length === 0 ? (
                  <div className="empty-state">Nenhum lançamento encontrado.</div>
                ) : (
                  filtrados.map((item) => {
                    const bloqueado = fechamentos.find((f) => f.data === item.data)
                    return (
                      <article className="launch-card" key={item.id}>
                        <div className="launch-top">
                          <div>
                            <div className="launch-title">{item.descricao}</div>
                            <div className="launch-meta">{formatDate(item.data)} • {item.categoria} • {item.forma}</div>
                          </div>
                          <div className={item.tipo === 'Entrada' ? 'pill in' : 'pill out'}>{item.tipo}</div>
                        </div>
                        <div className="launch-bottom">
                          <div>
                            <div className="launch-value">{formatMoney(item.valor)}</div>
                            <div className="launch-note">{item.observacao || 'Sem observação'} • Lançado por: {item.responsavel}</div>
                          </div>
                          <div className="launch-actions">
                            <button type="button" className="secondary-btn" onClick={() => editar(item)} disabled={!!bloqueado}>Editar</button>
                            <button type="button" className="danger-btn" onClick={() => excluir(item.id, item.data)} disabled={!!bloqueado}>Apagar</button>
                          </div>
                        </div>
                      </article>
                    )
                  })
                )}
              </div>
            )}
          </section>
        </section>

        <section className="panel resumo-panel">
          <div className="panel-title-row">
            <h3>Resumo gerencial por responsável</h3>
            <p>Visual de empresa para acompanhamento da operação financeira.</p>
          </div>
          <div className="responsavel-grid">
            {resumoPorResponsavel.map((item) => (
              <div className="responsavel-card" key={item.nome}>
                <div className="responsavel-top">
                  <h4>{item.nome}</h4>
                  <span>{item.quantidade} lançamentos</span>
                </div>
                <div className="responsavel-values">
                  <div><small>Entradas</small><strong className="in-text">{formatMoney(item.entradas)}</strong></div>
                  <div><small>Saídas</small><strong className="out-text">{formatMoney(item.saidas)}</strong></div>
                </div>
                <div className="responsavel-total">
                  <small>Saldo</small>
                  <strong>{formatMoney(item.saldo)}</strong>
                </div>
              </div>
            ))}
          </div>
        </section>

        {showAberturaModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div><p className="page-kicker">Início do expediente</p><h3>Abrir caixa de {formatDate(selectedDate)}</h3></div>
                <button type="button" className="modal-close" onClick={() => setShowAberturaModal(false)}>×</button>
              </div>
              <div className="form-grid modal-form">
                <label className="field">
                  <span>Responsável pela abertura</span>
                  <select value={aberturaPor} onChange={(e) => setAberturaPor(e.target.value)}>
                    {responsaveis.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Valor inicial do caixa</span>
                  <input type="text" placeholder="Ex.: 200,00" value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} />
                </label>
                <label className="field field-full">
                  <span>Observação da abertura</span>
                  <textarea rows="4" placeholder="Ex.: caixa aberto com troco inicial." value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} />
                </label>
              </div>
              <div className="modal-warning">Após abrir o caixa, os lançamentos do dia serão liberados.</div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAberturaModal(false)}>Cancelar</button>
                <button type="button" className="primary-inline-btn" onClick={confirmarAbertura} disabled={abrindo}>
                  {abrindo ? 'Abrindo...' : 'Confirmar abertura'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {showFechamentoModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div><p className="page-kicker">Conferência final</p><h3>Fechar caixa de {formatDate(selectedDate)}</h3></div>
                <button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>×</button>
              </div>
              <div className="modal-summary">
                <div className="daily-metric"><small>Valor inicial</small><strong>{formatMoney(valorInicialDia)}</strong></div>
                <div className="daily-metric"><small>Entradas</small><strong className="in-text">{formatMoney(entradasDia)}</strong></div>
                <div className="daily-metric"><small>Saídas</small><strong className="out-text">{formatMoney(saidasDia)}</strong></div>
                <div className="daily-metric"><small>Saldo final</small><strong>{formatMoney(saldoDia)}</strong></div>
              </div>
              <div className="form-grid modal-form">
                <label className="field">
                  <span>Responsável pelo fechamento</span>
                  <select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>
                    {responsaveis.map((item) => <option key={item}>{item}</option>)}
                  </select>
                </label>
                <label className="field field-full">
                  <span>Observação do fechamento</span>
                  <textarea rows="4" placeholder="Ex.: caixa conferido, numerário revisado e encerrado." value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} />
                </label>
              </div>
              <div className="modal-warning">Após o fechamento, os lançamentos desse dia ficarão bloqueados para edição e exclusão.</div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button>
                <button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>
                  {fechando ? 'Fechando...' : 'Confirmar fechamento'}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
