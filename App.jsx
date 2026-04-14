import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = ['Venda', 'Serviço', 'Fornecedor', 'Despesa Fixa', 'Aluguel', 'Energia', 'Internet', 'Funcionário', 'Retirada', 'Outros']
const formas = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito']

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function formatDate(date) {
  if (!date) return '-'
  const [y, m, d] = date.split('-')
  return `${d}/${m}/${y}`
}

function getTodayLocal() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyForm(date) {
  return {
    data: date || getTodayLocal(),
    descricao: '',
    categoria: 'Venda',
    tipo: 'Entrada',
    forma: 'Pix',
    valor: '',
    observacao: '',
    responsavel: 'MEIRE'
  }
}

export default function App() {
  const hoje = getTodayLocal()

  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyForm(hoje))
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [mostrarTodosLancamentos, setMostrarTodosLancamentos] = useState(false)
  const [modoLivro, setModoLivro] = useState('sintetica')
  const [showAberturaModal, setShowAberturaModal] = useState(false)
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  useEffect(() => {
    fetchAll()

    const canalLancamentos = supabase
      .channel('lancamentos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_caixa' }, () => { fetchAll() })
      .subscribe()

    const canalAbertura = supabase
      .channel('abertura-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aberturas_caixa' }, () => { fetchAll() })
      .subscribe()

    const canalFechamento = supabase
      .channel('fechamento-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fechamentos_caixa' }, () => { fetchAll() })
      .subscribe()

    return () => {
      supabase.removeChannel(canalLancamentos)
      supabase.removeChannel(canalAbertura)
      supabase.removeChannel(canalFechamento)
    }
  }, [])

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: selectedDate }))
  }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    setErro('')

    const [lancResp, abResp, fechResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false })
    ])

    if (lancResp.error) {
      setErro(`Não foi possível carregar os lançamentos. ${lancResp.error.message}`)
      setLoading(false)
      return
    }
    if (abResp.error) {
      setErro(`Não foi possível carregar as aberturas. ${abResp.error.message}`)
      setLoading(false)
      return
    }
    if (fechResp.error) {
      setErro(`Não foi possível carregar os fechamentos. ${fechResp.error.message}`)
      setLoading(false)
      return
    }

    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
    setLoading(false)
  }

  const aberturaDoDia = useMemo(() => aberturas.find((item) => item.data === selectedDate) || null, [aberturas, selectedDate])
  const fechamentoDoDia = useMemo(() => fechamentos.find((item) => item.data === selectedDate) || null, [fechamentos, selectedDate])
  const lancamentosDoDia = useMemo(() => lancamentos.filter((item) => item.data === selectedDate), [lancamentos, selectedDate])

  const totalEntradas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentos])
  const totalSaidas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentos])
  const entradasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentosDoDia])
  const saidasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentosDoDia])
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

  const lancamentosExibidos = useMemo(() => mostrarTodosLancamentos ? filtrados : filtrados.slice(0, 6), [filtrados, mostrarTodosLancamentos])

  const resumoPorResponsavel = useMemo(() => {
    return responsaveis.map((nome) => {
      const itens = lancamentos.filter((item) => item.responsavel === nome)
      const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0)
      const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0)
      return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
    })
  }, [lancamentos])

  const resumoCategorias = useMemo(() => {
    const mapa = {}
    lancamentosExibidos.forEach((item) => {
      const chave = `${item.tipo}-${item.categoria}`
      if (!mapa[chave]) {
        mapa[chave] = {
          chave,
          tipo: item.tipo,
          categoria: item.categoria,
          quantidade: 0,
          valor: 0,
          itens: []
        }
      }
      mapa[chave].quantidade += 1
      mapa[chave].valor += Number(item.valor) || 0
      mapa[chave].itens.push(item)
    })
    return Object.values(mapa).sort((a, b) => a.categoria.localeCompare(b.categoria))
  }, [lancamentosExibidos])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')

    if (!aberturaDoDia) {
      setErro('Abra o caixa do dia antes de lançar movimentações.')
      return
    }
    if (fechamentoDoDia) {
      setErro('Este dia já foi fechado. Não é possível lançar novos movimentos.')
      return
    }

    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.data || !form.descricao.trim() || !form.responsavel || !form.tipo) {
      setErro('Preencha data, descrição, tipo e responsável.')
      return
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido maior que zero.')
      return
    }

    setSalvando(true)

    const { error } = await supabase.from('lancamentos_caixa').insert([{
      data: form.data,
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      forma: form.forma,
      valor,
      observacao: (form.observacao || '').trim(),
      responsavel: form.responsavel
    }])

    if (error) {
      setErro(`Não foi possível salvar o lançamento. ${error.message}`)
      setSalvando(false)
      return
    }

    setForm(emptyForm(selectedDate))
    setSalvando(false)
    fetchAll()
  }

  async function confirmarAbertura() {
    try {
      setErro('')
      const valorInicial = Number(String(aberturaValor || '0').replace(',', '.'))

      if (!Number.isFinite(valorInicial) || valorInicial < 0) {
        setErro('Informe um valor inicial válido.')
        return
      }

      if (!selectedDate) {
        setErro('Selecione uma data válida.')
        return
      }

      setAbrindo(true)

      const { error } = await supabase.from('aberturas_caixa').insert([{
        data: selectedDate,
        valor_inicial: valorInicial,
        aberto_por: aberturaPor || 'MEIRE',
        observacao: (aberturaObs || '').trim()
      }])

      if (error) {
        setErro(`Não foi possível abrir o caixa. ${error.message}`)
        setAbrindo(false)
        return
      }

      setAbrindo(false)
      setShowAberturaModal(false)
      setAberturaValor('')
      setAberturaObs('')
      await fetchAll()
    } catch (err) {
      console.error(err)
      setErro('Erro inesperado ao abrir o caixa.')
      setAbrindo(false)
    }
  }

  async function confirmarFechamento() {
    setErro('')
    if (!aberturaDoDia) {
      setErro('Abra o caixa antes de fechar o dia.')
      return
    }
    if (fechamentoDoDia) {
      setErro('Este dia já foi fechado.')
      return
    }
    setFechando(true)

    const { error } = await supabase.from('fechamentos_caixa').insert([{
      data: selectedDate,
      total_entradas: entradasDia,
      total_saidas: saidasDia,
      saldo: saldoDia,
      fechado_por: fechamentoPor,
      observacao: (fechamentoObs || '').trim()
    }])

    if (error) {
      setErro(`Não foi possível fechar o caixa. ${error.message}`)
      setFechando(false)
      return
    }

    setFechando(false)
    setShowFechamentoModal(false)
    setFechamentoObs('')
    fetchAll()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="tag">Gestão financeira</p>
          <h1>Óticas Fácil</h1>
          <p className="muted">Sistema simples, bonito e fácil de usar no dia a dia.</p>
        </div>

        <div className="menu-card">
          <div className="menu-item active">Livro Caixa</div>
          <div className="menu-item">Lançamentos</div>
          <div className="menu-item">Abertura e Fechamento</div>
          <div className="menu-item">Resumo</div>
        </div>

        <div className="highlight-card">
          <p className="small-label dark-label">Saldo geral</p>
          <h3>{formatMoney(saldo)}</h3>
          <span>{totalLancamentos} lançamento(s)</span>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker">Painel financeiro</p>
            <h2>Livro Caixa da Ótica</h2>
            <p className="topbar-subtitle">Controle entradas, saídas e recebimentos de forma rápida.</p>
          </div>

          <div className="date-card">
            <span>Data de trabalho</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </header>

        {erro ? <div className="error-box">{erro}</div> : null}

        <section className="stats-grid">
          <div className="stat-card">
            <span className="small-label neutral">Valor inicial</span>
            <strong>{formatMoney(valorInicialDia)}</strong>
          </div>
          <div className="stat-card">
            <span className="small-label neutral">Entradas do dia</span>
            <strong className="in-text">{formatMoney(entradasDia)}</strong>
          </div>
          <div className="stat-card">
            <span className="small-label neutral">Saídas do dia</span>
            <strong className="out-text">{formatMoney(saidasDia)}</strong>
          </div>
          <div className="stat-card accent">
            <span className="small-label light">Status / Saldo</span>
            <strong>{statusDia}</strong>
            <p>{formatMoney(saldoDia)}</p>
          </div>
        </section>

        <section className="panel fluxo-panel">
          <div className="panel-title-row">
            <div>
              <h3>Fluxo do caixa</h3>
              <p className="section-subtitle">Abra, acompanhe e feche o caixa do dia.</p>
            </div>
          </div>

          {!aberturaDoDia ? (
            <button className="secondary-compact-btn" type="button" onClick={() => setShowAberturaModal(true)}>Abrir caixa do dia</button>
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
              <button className="secondary-compact-btn" type="button" onClick={() => setShowFechamentoModal(true)}>Revisar e fechar o dia</button>
            </div>
          )}
        </section>

        <section className="main-grid">
          <form className="panel form-panel featured-form" onSubmit={submitForm}>
            <div className="panel-head">
              <div>
                <span className="badge-title">Área principal</span>
                <h3>Novo lançamento financeiro</h3>
                <p>É aqui que você registra recebimentos, entradas e saídas do caixa.</p>
              </div>
            </div>

            <div className="quick-type-row">
              <button type="button" className={form.tipo === 'Entrada' ? 'type-chip active-chip' : 'type-chip'} onClick={() => updateField('tipo', 'Entrada')}>Recebimento / Entrada</button>
              <button type="button" className={form.tipo === 'Saída' ? 'type-chip active-chip danger-chip' : 'type-chip'} onClick={() => updateField('tipo', 'Saída')}>Saída / Retirada</button>
            </div>

            <div className="form-grid">
              <label className="field field-full">
                <span>Descrição</span>
                <input value={form.descricao} onChange={(e) => updateField('descricao', e.target.value)} placeholder="Ex.: Recebimento de óculos, pagamento, retirada..." disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>

              <label className="field">
                <span>Valor</span>
                <input value={form.valor} onChange={(e) => updateField('valor', e.target.value)} placeholder="0,00" disabled={!aberturaDoDia || !!fechamentoDoDia} />
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
                <span>Responsável</span>
                <select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>
                  {responsaveis.map((item) => <option key={item}>{item}</option>)}
                </select>
              </label>

              <label className="field field-full">
                <span>Observação</span>
                <textarea rows="3" value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} placeholder="Observações do lançamento..." disabled={!aberturaDoDia || !!fechamentoDoDia} />
              </label>
            </div>

            <button className="primary-btn" type="submit" disabled={salvando || !aberturaDoDia || !!fechamentoDoDia}>
              {salvando ? 'Salvando...' : 'Salvar lançamento'}
            </button>
          </form>

          <section className="panel list-panel">
            <div className="panel-head list-head">
              <div>
                <h3>Livro caixa</h3>
                <p>Veja de forma sintética ou analítica e escolha entre ampliar ou reduzir.</p>
              </div>

              <div className="view-switch">
                <button type="button" className={modoLivro === 'sintetica' ? 'switch-btn active-switch' : 'switch-btn'} onClick={() => setModoLivro('sintetica')}>Sintética</button>
                <button type="button" className={modoLivro === 'analitica' ? 'switch-btn active-switch' : 'switch-btn'} onClick={() => setModoLivro('analitica')}>Analítica</button>
              </div>
            </div>

            <div className="filters">
              <input placeholder="Buscar lançamento" value={busca} onChange={(e) => setBusca(e.target.value)} />
              <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
                <option>Todos</option>
                <option>Entrada</option>
                <option>Saída</option>
              </select>
              <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                <option>Todos</option>
                {responsaveis.map((item) => <option key={item}>{item}</option>)}
              </select>
              <button type="button" className="secondary-btn" onClick={() => setMostrarTodosLancamentos((prev) => !prev)}>
                {mostrarTodosLancamentos ? 'Reduzir' : 'Expandir tudo'}
              </button>
            </div>

            {loading ? (
              <div className="empty-state">Carregando dados do banco...</div>
            ) : modoLivro === 'sintetica' ? (
              <div className="summary-list">
                {resumoCategorias.length === 0 ? (
                  <div className="empty-state">Nenhum lançamento encontrado.</div>
                ) : resumoCategorias.map((grupo) => (
                  <article className="summary-card" key={grupo.chave}>
                    <div className="summary-header">
                      <div>
                        <div className="summary-title-row">
                          <h4>{grupo.categoria}</h4>
                          <span className={grupo.tipo === 'Entrada' ? 'pill in' : 'pill out'}>{grupo.tipo}</span>
                        </div>
                        <p>{grupo.quantidade} lançamento(s)</p>
                      </div>
                      <strong>{formatMoney(grupo.valor)}</strong>
                    </div>

                    {mostrarTodosLancamentos ? (
                      <div className="summary-items">
                        {grupo.itens.map((item) => (
                          <div className="mini-launch" key={item.id}>
                            <div>
                              <div className="mini-title">{item.descricao}</div>
                              <div className="mini-meta">{formatDate(item.data)} • {item.forma} • {item.responsavel}</div>
                            </div>
                            <strong>{formatMoney(item.valor)}</strong>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <div className="launch-list">
                {lancamentosExibidos.length === 0 ? (
                  <div className="empty-state">Nenhum lançamento encontrado.</div>
                ) : lancamentosExibidos.map((item) => (
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
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <section className="panel resumo-panel">
          <div className="panel-title-row">
            <div>
              <h3>Resumo por responsável</h3>
              <p className="section-subtitle">Acompanhe o movimento individual de cada pessoa.</p>
            </div>
          </div>
          <div className="responsavel-grid">
            {resumoPorResponsavel.map((item) => (
              <div className="responsavel-card" key={item.nome}>
                <div className="responsavel-top">
                  <h4>{item.nome}</h4>
                  <span>{item.quantidade} lançamento(s)</span>
                </div>
                <div className="responsavel-values">
                  <div>
                    <small>Entradas</small>
                    <strong className="in-text">{formatMoney(item.entradas)}</strong>
                  </div>
                  <div>
                    <small>Saídas</small>
                    <strong className="out-text">{formatMoney(item.saidas)}</strong>
                  </div>
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
                <div>
                  <p className="page-kicker">Início do expediente</p>
                  <h3>Abrir caixa de {formatDate(selectedDate)}</h3>
                </div>
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
                  <input value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} placeholder="Ex.: 200,00" />
                </label>
                <label className="field field-full">
                  <span>Observação da abertura</span>
                  <textarea rows="3" value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} placeholder="Ex.: caixa aberto com troco inicial." />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAberturaModal(false)}>Cancelar</button>
                <button type="button" className="primary-inline-btn" onClick={confirmarAbertura} disabled={abrindo}>{abrindo ? 'Abrindo...' : 'Confirmar abertura'}</button>
              </div>
            </div>
          </div>
        ) : null}

        {showFechamentoModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="page-kicker">Conferência final</p>
                  <h3>Fechar caixa de {formatDate(selectedDate)}</h3>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>×</button>
              </div>
              <div className="modal-summary">
                <div className="daily-metric"><small>Inicial</small><strong>{formatMoney(valorInicialDia)}</strong></div>
                <div className="daily-metric"><small>Entradas</small><strong className="in-text">{formatMoney(entradasDia)}</strong></div>
                <div className="daily-metric"><small>Saídas</small><strong className="out-text">{formatMoney(saidasDia)}</strong></div>
                <div className="daily-metric"><small>Saldo</small><strong>{formatMoney(saldoDia)}</strong></div>
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
                  <textarea rows="3" value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} />
                </label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button>
                <button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>{fechando ? 'Fechando...' : 'Confirmar fechamento'}</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
