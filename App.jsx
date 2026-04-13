import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'oticas-facil-caixa-v2'

const categorias = [
  'Venda',
  'Serviço',
  'Fornecedor',
  'Despesa Fixa',
  'Aluguel',
  'Energia',
  'Internet',
  'Funcionário',
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
    observacao: 'Cliente pagou à vista'
  },
  {
    id: 2,
    data: '2026-04-13',
    descricao: 'Pagamento de fornecedor',
    categoria: 'Fornecedor',
    tipo: 'Saída',
    forma: 'Transferência',
    valor: 320,
    observacao: 'Compra de lentes'
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
    observacao: ''
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
  const [editandoId, setEditandoId] = useState(null)
  const [erro, setErro] = useState('')

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lancamentos))
  }, [lancamentos])

  const filtrados = useMemo(() => {
    return [...lancamentos]
      .filter((item) => {
        const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao}`.toLowerCase()
        const okBusca = texto.includes(busca.toLowerCase())
        const okTipo = filtroTipo === 'Todos' || item.tipo === filtroTipo
        return okBusca && okTipo
      })
      .sort((a, b) => b.data.localeCompare(a.data))
  }, [lancamentos, busca, filtroTipo])

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

    if (!form.data || !form.descricao.trim()) {
      setErro('Preencha a data e a descrição.')
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
      observacao: item.observacao || ''
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

  function limparTudo() {
    const ok = window.confirm('Deseja apagar todos os lançamentos?')
    if (!ok) return
    setLancamentos([])
    resetForm()
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <img src="/logo.jpeg" alt="Logo Óticas Fácil" className="brand-logo" />
          <div>
            <p className="tag">Sistema interno</p>
            <h1>Óticas Fácil</h1>
            <p className="muted">Livro caixa organizado e simples de usar.</p>
          </div>
        </div>

        <div className="menu-card">
          <div className="menu-item active">Dashboard do Caixa</div>
          <div className="menu-item">Entradas e Saídas</div>
          <div className="menu-item">Resumo Financeiro</div>
          <div className="menu-item">Configurações Futuras</div>
        </div>

        <div className="highlight-card">
          <p className="small-label">Status</p>
          <h3>{formatMoney(saldo)}</h3>
          <p className="muted">Saldo atual do caixa com base nos lançamentos cadastrados.</p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker">Dashboard</p>
            <h2>Controle do Livro Caixa</h2>
          </div>

          <button className="danger-ghost" onClick={limparTudo}>
            Limpar tudo
          </button>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span className="small-label">Entradas</span>
            <strong>{formatMoney(totalEntradas)}</strong>
            <p>Total recebido.</p>
          </div>

          <div className="stat-card">
            <span className="small-label">Saídas</span>
            <strong>{formatMoney(totalSaidas)}</strong>
            <p>Total pago.</p>
          </div>

          <div className="stat-card accent">
            <span className="small-label">Saldo Atual</span>
            <strong>{formatMoney(saldo)}</strong>
            <p>Entradas menos saídas.</p>
          </div>

          <div className="stat-card">
            <span className="small-label">Lançamentos</span>
            <strong>{totalLancamentos}</strong>
            <p>Registros no sistema.</p>
          </div>
        </section>

        <section className="main-grid">
          <form className="panel form-panel" onSubmit={submitForm}>
            <div className="panel-head">
              <div>
                <h3>{editandoId ? 'Editar lançamento' : 'Novo lançamento'}</h3>
                <p>Cadastre tudo que entrou ou saiu do caixa.</p>
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

              <label className="field field-full">
                <span>Descrição</span>
                <input
                  type="text"
                  placeholder="Ex.: venda de lentes, energia, pagamento fornecedor..."
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
                <h3>Movimentações</h3>
                <p>Pesquise, filtre e apague quando precisar.</p>
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
                        <div className="launch-note">{item.observacao || 'Sem observação'}</div>
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
      </main>
    </div>
  )
}
