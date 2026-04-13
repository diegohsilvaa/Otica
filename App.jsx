import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'oticas-facil-caixa-v3'
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

const iniciais = [
  {
    id: 1,
    data: '2026-04-13',
    descricao: 'Venda de armação + lentes',
    categoria: 'Venda',
    tipo: 'Entrada',
    forma: 'Pix',
    valor: 780,
    observacao: 'Cliente pagou à vista',
    responsavel: 'MEIRE'
  },
  {
    id: 2,
    data: '2026-04-13',
    descricao: 'Pagamento de fornecedor',
    categoria: 'Fornecedor',
    tipo: 'Saída',
    forma: 'Transferência',
    valor: 320,
    observacao: 'Compra de lentes',
    responsavel: 'AIUMA'
  },
  {
    id: 3,
    data: '2026-04-14',
    descricao: 'Retirada do caixa',
    categoria: 'Retirada',
    tipo: 'Saída',
    forma: 'Dinheiro',
    valor: 100,
    observacao: 'Despesa emergencial',
    responsavel: 'APARECIDA'
  }
]

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

function emptyForm() {
  return {
    data: new Date().toISOString().slice(0, 10),
    descricao: '',
    categoria: 'Venda',
    tipo: 'Entrada',
    forma: 'Pix',
    valor: '',
    observacao: '',
    responsavel: 'MEIRE'
  }
}

function getSaved() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return iniciais
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : iniciais
  } catch {
    return iniciais
  }
}

export default function App() {
  const [lancamentos, setLancamentos] = useState(getSaved)
  const [form, setForm] = useState(emptyForm())
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [editandoId, setEditandoId] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos))
  }, [lancamentos])

  const filtrados = useMemo(() => {
    return [...lancamentos]
      .filter((item) => {
        const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao} ${item.responsavel}`.toLowerCase()
        const okBusca = texto.includes(busca.toLowerCase())
        const okTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo
        const okResponsavel = filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel
        return okBusca && okTipo && okResponsavel
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [lancamentos, busca, filtroTipo, filtroResponsavel])

  const totalEntradas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0),
    [lancamentos]
  )

  const totalSaidas = useMemo(
    () => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0),
    [lancamentos]
  )

  const saldo = totalEntradas - totalSaidas
  const totalLancamentos = lancamentos.length

  const entradasHoje = useMemo(
    () => lancamentos.filter((item) => item.tipo === 'Entrada').length,
    [lancamentos]
  )

  const saidasHoje = useMemo(
    () => lancamentos.filter((item) => item.tipo === 'Saída').length,
    [lancamentos]
  )

  const resumoPorResponsavel = useMemo(() => {
    return responsaveis.map((nome) => {
      const itens = lancamentos.filter((item) => item.responsavel === nome)
      const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0)
      const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0)
      return {
        nome,
        entradas,
        saidas,
        saldo: entradas - saidas,
        quantidade: itens.length
      }
    })
  }, [lancamentos])

  const ultimasEntradas = useMemo(
    () => filtrados.filter((item) => item.tipo === 'Entrada').slice(0, 5),
    [filtrados]
  )

  const ultimasSaidas = useMemo(
    () => filtrados.filter((item) => item.tipo === 'Saída').slice(0, 5),
    [filtrados]
  )

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function resetForm() {
    setForm(emptyForm())
    setEditandoId(null)
    setErro('')
  }

  function submitForm(e) {
    e.preventDefault()
    setErro('')

    const valor = Number(String(form.valor).replace(',', '.'))

    if (!form.data || !form.descricao.trim() || !form.responsavel) {
      setErro('Preencha data, descrição e responsável.')
      return
    }

    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido maior que zero.')
      return
    }

    const payload = {
      ...form,
      descricao: form.descricao.trim(),
      observacao: form.observacao.trim(),
      valor
    }

    if (editandoId) {
      setLancamentos((prev) =>
        prev.map((item) => (item.id === editandoId ? { ...item, ...payload } : item))
      )
    } else {
      setLancamentos((prev) => [{ id: Date.now(), ...payload }, ...prev])
    }

    resetForm()
  }

  function editar(item) {
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
    setEditandoId(item.id)
    setErro('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function excluir(id) {
    const ok = window.confirm('Deseja apagar este lançamento?')
    if (!ok) return
    setLancamentos((prev) => prev.filter((item) => item.id !== id))
    if (editandoId === id) resetForm()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <img
            src="./logo.jpeg"
            alt="Logo Óticas Fácil"
            className="brand-logo"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <div>
            <p className="tag">Sistema interno</p>
            <h1>Óticas Fácil</h1>
            <p className="muted">Controle financeiro inicial da ótica com entradas, saídas e resumo.</p>
          </div>
        </div>

        <div className="menu-card">
          <div className="menu-item active">Dashboard do Caixa</div>
          <div className="menu-item">Entradas</div>
          <div className="menu-item">Saídas</div>
          <div className="menu-item">Resumo Financeiro</div>
        </div>

        <div className="highlight-card">
          <p className="small-label">Saldo geral</p>
          <h3>{formatMoney(saldo)}</h3>
          <p className="muted dark-text">Acompanhe o caixa total da ótica de forma rápida.</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker">Financeiro</p>
            <h2>Controle do Livro Caixa</h2>
          </div>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="small-label neutral">Entradas</span>
            <strong>{formatMoney(totalEntradas)}</strong>
            <p>Total recebido no caixa.</p>
          </div>

          <div className="stat-card">
            <span className="small-label neutral">Saídas</span>
            <strong>{formatMoney(totalSaidas)}</strong>
            <p>Total pago ou retirado.</p>
          </div>

          <div className="stat-card accent">
            <span className="small-label light">Saldo Atual</span>
            <strong>{formatMoney(saldo)}</strong>
            <p>Entradas menos saídas.</p>
          </div>

          <div className="stat-card">
            <span className="small-label neutral">Lançamentos</span>
            <strong>{totalLancamentos}</strong>
            <p>{entradasHoje} entradas e {saidasHoje} saídas registradas.</p>
          </div>
        </section>

        <section className="summary-grid">
          <div className="panel mini-panel">
            <div className="panel-title-row">
              <h3>Entradas recentes</h3>
            </div>
            <div className="mini-list">
              {ultimasEntradas.length === 0 ? (
                <div className="empty-state small-empty">Nenhuma entrada encontrada.</div>
              ) : (
                ultimasEntradas.map((item) => (
                  <div className="mini-row" key={item.id}>
                    <div>
                      <div className="mini-title">{item.descricao}</div>
                      <div className="mini-meta">{formatDate(item.data)} • {item.responsavel}</div>
                    </div>
                    <strong className="in-text">{formatMoney(item.valor)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel mini-panel">
            <div className="panel-title-row">
              <h3>Saídas recentes</h3>
            </div>
            <div className="mini-list">
              {ultimasSaidas.length === 0 ? (
                <div className="empty-state small-empty">Nenhuma saída encontrada.</div>
              ) : (
                ultimasSaidas.map((item) => (
                  <div className="mini-row" key={item.id}>
                    <div>
                      <div className="mini-title">{item.descricao}</div>
                      <div className="mini-meta">{formatDate(item.data)} • {item.responsavel}</div>
                    </div>
                    <strong className="out-text">{formatMoney(item.valor)}</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="main-grid">
          <form className="panel form-panel" onSubmit={submitForm}>
            <div className="panel-head">
              <div>
                <h3>{editandoId ? 'Editar lançamento' : 'Novo lançamento financeiro'}</h3>
                <p>Cadastre entradas, saídas e retiradas com identificação do responsável.</p>
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
                <input type="date" value={form.data} onChange={(e) => updateField('data', e.target.value)} />
              </label>

              <label className="field">
                <span>Responsável</span>
                <select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)}>
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
                />
              </label>

              <label className="field">
                <span>Tipo</span>
                <select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)}>
                  <option>Entrada</option>
                  <option>Saída</option>
                </select>
              </label>

              <label className="field">
                <span>Categoria</span>
                <select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)}>
                  {categorias.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Forma</span>
                <select value={form.forma} onChange={(e) => updateField('forma', e.target.value)}>
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
                />
              </label>

              <label className="field field-full">
                <span>Observação</span>
                <textarea
                  rows="4"
                  placeholder="Detalhes opcionais"
                  value={form.observacao}
                  onChange={(e) => updateField('observacao', e.target.value)}
                />
              </label>
            </div>

            {erro ? <div className="error-box">{erro}</div> : null}

            <button className="primary-btn" type="submit">
              {editandoId ? 'Salvar alterações' : 'Adicionar lançamento'}
            </button>
          </form>

          <section className="panel list-panel">
            <div className="panel-head list-head">
              <div>
                <h3>Movimentações financeiras</h3>
                <p>Consulte quem lançou, edite e apague quando necessário.</p>
              </div>

              <div className="filters">
                <input
                  type="text"
                  placeholder="Buscar"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
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

            <div className="launch-list">
              {filtrados.length === 0 ? (
                <div className="empty-state">Nenhum lançamento encontrado.</div>
              ) : (
                filtrados.map((item) => (
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
                        <button type="button" className="secondary-btn" onClick={() => editar(item)}>
                          Editar
                        </button>
                        <button type="button" className="danger-btn" onClick={() => excluir(item.id)}>
                          Apagar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </section>

        <section className="panel resumo-panel">
          <div className="panel-title-row">
            <h3>Resumo financeiro por responsável</h3>
            <p>Veja quem está lançando movimentações e o impacto no caixa.</p>
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
      </main>
    </div>
  )
}
