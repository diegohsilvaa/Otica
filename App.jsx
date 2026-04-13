import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = [
  'Venda',
  'Serviço',
  'Fornecedor',
  'Despesa Fixa',
  'Aluguel',
  'Energia',
  'Internet',
  'Funcionário',
  'Retirada',
  'Outros'
]
const formas = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito']

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(value) || 0)
}

function formatDate(date) {
  if (!date) return '-'
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function emptyForm(selectedDate) {
  return {
    data: selectedDate || new Date().toISOString().slice(0, 10),
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
  const hoje = new Date().toISOString().slice(0, 10)

  const [lancamentos, setLancamentos] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyForm(hoje))
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [editandoId, setEditandoId] = useState(null)
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [fechamentoObs, setFechamentoObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: selectedDate }))
  }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    setErro('')

    const [lancResp, fechResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false })
    ])

    if (lancResp.error) {
      console.error(lancResp.error)
      setErro(`Não foi possível carregar os lançamentos. ${lancResp.error.message}`)
      setLoading(false)
      return
    }

    if (fechResp.error) {
      console.error(fechResp.error)
      setErro(`Não foi possível carregar os fechamentos. ${fechResp.error.message}`)
      setLoading(false)
      return
    }

    setLancamentos(lancResp.data || [])
    setFechamentos(fechResp.data || [])
    setLoading(false)
  }

  const fechamentoDoDia = useMemo(
    () => fechamentos.find((item) => item.data === selectedDate) || null,
    [fechamentos, selectedDate]
  )

  const lancamentosDoDia = useMemo(
    () => lancamentos.filter((item) => item.data === selectedDate),
    [lancamentos, selectedDate]
  )

  const filtrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''} ${item.responsavel}`.toLowerCase()
      const okBusca = texto.includes(busca.toLowerCase())
      const okTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo
      const okResponsavel = filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel
      return okBusca && okTipo && okResponsavel
    })
  }, [lancamentos, busca, filtroTipo, filtroResponsavel])

  const totalEntradas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0),
    [lancamentos]
  )

  const totalSaidas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0),
    [lancamentos]
  )

  const entradasDia = useMemo(
    () => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0),
    [lancamentosDoDia]
  )

  const saidasDia = useMemo(
    () => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0),
    [lancamentosDoDia]
  )

  const saldoDia = entradasDia - saidasDia
  const saldo = totalEntradas - totalSaidas
  const totalLancamentos = lancamentos.length

  const resumoPorResponsavel = useMemo(() => {
    return responsaveis.map((nome) => {
      const itens = lancamentos.filter((item) => item.responsavel === nome)
      const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0)
      const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0)
      return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
    })
  }, [lancamentos])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm(selectedDate))
    setEditandoId(null)
    setErro('')
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')

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
      const { error } = await supabase
        .from('lancamentos_caixa')
        .update(payload)
        .eq('id', editandoId)

      if (error) {
        console.error(error)
        setErro(`Não foi possível atualizar o lançamento. ${error.message}`)
        setSalvando(false)
        return
      }
    } else {
      const { error } = await supabase
        .from('lancamentos_caixa')
        .insert([payload])

      if (error) {
        console.error(error)
        setErro(`Não foi possível salvar o lançamento. ${error.message}`)
        setSalvando(false)
        return
      }
    }

    setSalvando(false)
    resetForm()
    fetchAll()
  }

  function editar(item) {
    if (fechamentos.find((fech) => fech.data === item.data)) {
      setErro('Este dia já foi fechado. Não é possível editar lançamentos.')
      return
    }

    setForm({
      data: item.data,
      descricao: item.descricao,
      categoria: item.categoria,
      tipo: item.tipo,
      forma: item.forma,
      valor: String(item.valor),
      observacao: item.observacao || '',
      responsavel: item.responsavel || 'MEIRE'
    })
    setSelectedDate(item.data)
    setEditandoId(item.id)
    setErro('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function excluir(id, data) {
    if (fechamentos.find((fech) => fech.data === data)) {
      setErro('Este dia já foi fechado. Não é possível apagar lançamentos.')
      return
    }

    const ok = window.confirm('Deseja apagar este lançamento?')
    if (!ok) return

    const { error } = await supabase
      .from('lancamentos_caixa')
      .delete()
      .eq('id', id)

    if (error) {
      console.error(error)
      setErro(`Não foi possível apagar o lançamento. ${error.message}`)
      return
    }

    if (editandoId === id) resetForm()
    fetchAll()
  }

  function abrirFechamento() {
    setErro('')
    if (fechamentoDoDia) {
      setErro('Este dia já foi fechado.')
      return
    }
    if (!lancamentosDoDia.length) {
      setErro('Não há lançamentos neste dia para fechar o caixa.')
      return
    }
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

    const { error } = await supabase
      .from('fechamentos_caixa')
      .insert([payload])

    if (error) {
      console.error(error)
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
          <img src="./logo.jpeg" alt="Logo Óticas Fácil" className="brand-logo" onError={(e) => { e.currentTarget.style.display = 'none' }} />
          <div>
            <p className="tag">Gestão financeira</p>
            <h1>Óticas Fácil</h1>
            <p className="muted">Painel empresarial com controle diário e fechamento seguro.</p>
          </div>
        </div>

        <div className="menu-card">
          <div className="menu-item active">Dashboard Financeiro</div>
          <div className="menu-item">Livro Caixa</div>
          <div className="menu-item">Fechamento Diário</div>
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
            <p className="subtext">Organização diária do caixa, lançamentos e fechamento com conferência.</p>
          </div>

          <div className="date-card">
            <span>Data de trabalho</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </header>

        {erro ? <div className="error-box global-error">{erro}</div> : null}

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
            <span className="small-label neutral">Lançamentos</span>
            <strong>{totalLancamentos}</strong>
            <p>{loading ? 'Carregando...' : 'Base sincronizada com o banco.'}</p>
          </div>
        </section>

        <section className="daily-grid discreet-layout">
          <div className="panel daily-panel">
            <div className="panel-title-row">
              <h3>Resumo do dia</h3>
              <span className={fechamentoDoDia ? 'status-badge closed' : 'status-badge open'}>
                {fechamentoDoDia ? 'Caixa fechado' : 'Caixa em aberto'}
              </span>
            </div>

            <div className="daily-cards">
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
              <div className="daily-metric">
                <small>Movimentos</small>
                <strong>{lancamentosDoDia.length}</strong>
              </div>
            </div>
          </div>

          <div className="panel fechamento-compacto">
            <div className="panel-title-row compact-head">
              <div>
                <h3>Fechamento do dia</h3>
                <p>Conferência final discreta e segura.</p>
              </div>
            </div>

            {fechamentoDoDia ? (
              <div className="closed-info">
                <strong>Fechado por {fechamentoDoDia.fechado_por}</strong>
                <span>{formatDate(fechamentoDoDia.data)} • saldo final {formatMoney(fechamentoDoDia.saldo)}</span>
              </div>
            ) : (
              <div className="compact-actions">
                <p className="compact-note">Só feche após revisar os lançamentos do dia.</p>
                <button className="secondary-compact-btn" type="button" onClick={abrirFechamento}>
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
                <p>Cadastre entradas e saídas com padrão empresarial e controle por data.</p>
              </div>
              {editandoId ? (
                <button type="button" className="secondary-btn" onClick={resetForm}>
                  Cancelar
                </button>
              ) : null}
            </div>

            <div className="form-grid">
              <label className="field">
                <span>Data</span>
                <input type="date" value={form.data} onChange={(e) => updateField('data', e.target.value)} disabled={!!fechamentoDoDia && form.data === selectedDate} />
              </label>

              <label className="field">
                <span>Responsável</span>
                <select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} disabled={!!fechamentoDoDia && form.data === selectedDate}>
                  {responsaveis.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="field field-full">
                <span>Descrição</span>
                <input
                  type="text"
                  placeholder="Ex.: venda de lentes, retirada, energia, fornecedor..."
                  value={form.descricao}
                  onChange={(e) => updateField('descricao', e.target.value)}
                  disabled={!!fechamentoDoDia && form.data === selectedDate}
                />
              </label>

              <label className="field">
                <span>Tipo</span>
                <select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)} disabled={!!fechamentoDoDia && form.data === selectedDate}>
                  <option>Entrada</option>
                  <option>Saída</option>
                </select>
              </label>

              <label className="field">
                <span>Categoria</span>
                <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)} disabled={!!fechamentoDoDia && form.data === selectedDate}>
                  {categorias.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Forma</span>
                <select value={form.forma} onChange={(e) => updateField('forma', e.target.value)} disabled={!!fechamentoDoDia && form.data === selectedDate}>
                  {formas.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Valor</span>
                <input
                  type="text"
                  placeholder="Ex.: 150,00"
                  value={form.valor}
                  onChange={(e) => updateField('valor', e.target.value)}
                  disabled={!!fechamentoDoDia && form.data === selectedDate}
                />
              </label>

              <label className="field field-full">
                <span>Observação</span>
                <textarea
                  rows="4"
                  placeholder="Detalhes opcionais"
                  value={form.observacao}
                  onChange={(e) => updateField('observacao', e.target.value)}
                  disabled={!!fechamentoDoDia && form.data === selectedDate}
                />
              </label>
            </div>

            <button className="primary-btn" type="submit" disabled={salvando || (!!fechamentoDoDia && form.data === selectedDate)}>
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
                  <option>Todos</option>
                  <option>Entrada</option>
                  <option>Saída</option>
                </select>
                <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}>
                  <option>Todos</option>
                  {responsaveis.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
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
                    const bloqueado = fechamentos.find((fech) => fech.data === item.data)
                    return (
                      <article className="launch-card" key={item.id}>
                        <div className="launch-top">
                          <div>
                            <div className="launch-title">{item.descricao}</div>
                            <div className="launch-meta">
                              {formatDate(item.data)} • {item.categoria} • {item.forma}
                            </div>
                          </div>

                          <div className={item.tipo === 'Entrada' ? 'pill in' : 'pill out'}>
                            {item.tipo}
                          </div>
                        </div>

                        <div className="launch-bottom">
                          <div>
                            <div className="launch-value">{formatMoney(item.valor)}</div>
                            <div className="launch-note">
                              {item.observacao || 'Sem observação'} • Lançado por: {item.responsavel}
                            </div>
                          </div>

                          <div className="launch-actions">
                            <button type="button" className="secondary-btn" onClick={() => editar(item)} disabled={!!bloqueado}>
                              Editar
                            </button>
                            <button type="button" className="danger-btn" onClick={() => excluir(item.id, item.data)} disabled={!!bloqueado}>
                              Apagar
                            </button>
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

        {showFechamentoModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div>
                  <p className="page-kicker">Conferência final</p>
                  <h3>Fechar caixa de {formatDate(selectedDate)}</h3>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>
                  ×
                </button>
              </div>

              <div className="modal-summary">
                <div className="daily-metric">
                  <small>Entradas</small>
                  <strong className="in-text">{formatMoney(entradasDia)}</strong>
                </div>
                <div className="daily-metric">
                  <small>Saídas</small>
                  <strong className="out-text">{formatMoney(saidasDia)}</strong>
                </div>
                <div className="daily-metric">
                  <small>Saldo final</small>
                  <strong>{formatMoney(saldoDia)}</strong>
                </div>
              </div>

              <div className="form-grid modal-form">
                <label className="field">
                  <span>Responsável pelo fechamento</span>
                  <select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>
                    {responsaveis.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                </label>

                <label className="field field-full">
                  <span>Observação do fechamento</span>
                  <textarea
                    rows="4"
                    value={fechamentoObs}
                    onChange={(e) => setFechamentoObs(e.target.value)}
                    placeholder="Ex.: caixa conferido, numerário revisado e encerrado."
                  />
                </label>
              </div>

              <div className="modal-warning">
                Após o fechamento, os lançamentos desse dia ficarão bloqueados para edição e exclusão.
              </div>

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>
                  Cancelar
                </button>
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
