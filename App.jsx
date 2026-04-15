import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = ['Venda', 'Serviço', 'Fornecedor', 'Despesa Fixa', 'Aluguel', 'Energia', 'Internet', 'Funcionário', 'Retirada', 'Outros']
const formas = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito']
const ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

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

function emptyFinanceForm(date) {
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

function emptyClienteForm() {
  return {
    codigo: '',
    cpf: '',
    nome: '',
    contato: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: 'PE',
    complemento: '',
    observacao: ''
  }
}

function textValue(v) {
  return v || '-'
}

export default function App() {
  const hoje = getTodayLocal()

  const [currentPage, setCurrentPage] = useState('clientes')
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyFinanceForm(hoje))
  const [clientes, setClientes] = useState([])
  const [clienteForm, setClienteForm] = useState(emptyClienteForm())
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [showAberturaModal, setShowAberturaModal] = useState(false)
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)
  const [showAnaliticoModal, setShowAnaliticoModal] = useState(false)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  useEffect(() => {
    fetchAll()

    const canalLancamentos = supabase
      .channel('lancamentos-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_caixa' }, () => { fetchFinance() })
      .subscribe()

    const canalAbertura = supabase
      .channel('abertura-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'aberturas_caixa' }, () => { fetchFinance() })
      .subscribe()

    const canalFechamento = supabase
      .channel('fechamento-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'fechamentos_caixa' }, () => { fetchFinance() })
      .subscribe()

    const canalClientes = supabase
      .channel('clientes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => { fetchClientes() })
      .subscribe()

    return () => {
      supabase.removeChannel(canalLancamentos)
      supabase.removeChannel(canalAbertura)
      supabase.removeChannel(canalFechamento)
      supabase.removeChannel(canalClientes)
    }
  }, [])

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: selectedDate }))
  }, [selectedDate])

  async function fetchFinance() {
    const [lancResp, abResp, fechResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false })
    ])

    if (lancResp.error) throw new Error(`Não foi possível carregar os lançamentos. ${lancResp.error.message}`)
    if (abResp.error) throw new Error(`Não foi possível carregar as aberturas. ${abResp.error.message}`)
    if (fechResp.error) throw new Error(`Não foi possível carregar os fechamentos. ${fechResp.error.message}`)

    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
  }

  async function fetchClientes() {
    const { data, error } = await supabase.from('clientes').select('*').order('codigo', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
    if (error) throw new Error(`Não foi possível carregar os clientes. ${error.message}`)
    setClientes(data || [])
  }

  async function fetchAll() {
    setLoading(true)
    setErro('')
    try {
      await Promise.all([fetchFinance(), fetchClientes()])
    } catch (err) {
      setErro(err.message || 'Erro ao carregar dados.')
    } finally {
      setLoading(false)
    }
  }

  const aberturaDoDia = useMemo(() => aberturas.find((item) => item.data === selectedDate) || null, [aberturas, selectedDate])
  const fechamentoDoDia = useMemo(() => fechamentos.find((item) => item.data === selectedDate) || null, [fechamentos, selectedDate])
  const lancamentosDoDia = useMemo(() => lancamentos.filter((item) => item.data === selectedDate), [lancamentos, selectedDate])
  const lancamentosVendaDoDia = useMemo(() => lancamentosDoDia.filter((item) => item.categoria === 'Venda'), [lancamentosDoDia])
  const vendasEntradaDoDia = useMemo(() => lancamentosVendaDoDia.filter((item) => item.tipo === 'Entrada'), [lancamentosVendaDoDia])
  const totalVendasDoDia = useMemo(() => vendasEntradaDoDia.reduce((acc, item) => acc + Number(item.valor || 0), 0), [vendasEntradaDoDia])

  const totalEntradas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentos])
  const totalSaidas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentos])
  const entradasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentosDoDia])
  const saidasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentosDoDia])
  const valorInicialDia = Number(aberturaDoDia?.valor_inicial || 0)
  const saldoDia = valorInicialDia + entradasDia - saidasDia
  const saldo = totalEntradas - totalSaidas
  const statusDia = fechamentoDoDia ? 'Fechado' : aberturaDoDia ? 'Aberto' : 'Não aberto'

  const filtrados = useMemo(() => {
    return lancamentos.filter((item) => {
      const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''} ${item.responsavel}`.toLowerCase()
      return texto.includes(busca.toLowerCase()) &&
        (filtroTipo === 'Todos' || item.tipo === filtroTipo) &&
        (filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel)
    })
  }, [lancamentos, busca, filtroTipo, filtroResponsavel])

  const filtradosDoDia = useMemo(() => filtrados.filter((item) => item.data === selectedDate), [filtrados, selectedDate])

  const sinteseDoDia = useMemo(() => {
    const vendas = filtradosDoDia.filter((item) => item.categoria === 'Venda' && item.tipo === 'Entrada')
    const servicos = filtradosDoDia.filter((item) => item.categoria === 'Serviço' && item.tipo === 'Entrada')
    const saidas = filtradosDoDia.filter((item) => item.tipo === 'Saída')

    return {
      quantidadeVendas: vendas.length,
      totalVendas: vendas.reduce((acc, item) => acc + Number(item.valor || 0), 0),
      quantidadeServicos: servicos.length,
      totalServicos: servicos.reduce((acc, item) => acc + Number(item.valor || 0), 0),
      quantidadeSaidas: saidas.length,
      totalSaidas: saidas.reduce((acc, item) => acc + Number(item.valor || 0), 0)
    }
  }, [filtradosDoDia])

  const resumoPorResponsavel = useMemo(() => {
    return responsaveis.map((nome) => {
      const itens = lancamentos.filter((item) => item.responsavel === nome)
      const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0)
      const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0)
      return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
    })
  }, [lancamentos])

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase()
    if (!termo) return clientes
    return clientes.filter((cliente) => {
      const base = `${cliente.codigo || ''} ${cliente.cpf || ''} ${cliente.nome || ''} ${cliente.contato || ''} ${cliente.cidade || ''}`.toLowerCase()
      return base.includes(termo)
    })
  }, [clientes, clienteBusca])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateClienteField(field, value) {
    setClienteForm((prev) => ({ ...prev, [field]: value }))
  }

  function abrirCliente(cliente) {
    setClienteSelecionado(cliente)
    setShowClienteModal(true)
  }

  async function submitClienteForm(e) {
    e.preventDefault()
    setErro('')
    setSalvandoCliente(true)

    if (!clienteForm.nome.trim()) {
      setErro('Informe o nome do cliente.')
      setSalvandoCliente(false)
      return
    }

    const payload = {
      cpf: clienteForm.cpf.trim(),
      nome: clienteForm.nome.trim(),
      contato: clienteForm.contato.trim(),
      endereco: clienteForm.endereco.trim(),
      numero: clienteForm.numero.trim(),
      bairro: clienteForm.bairro.trim(),
      cidade: clienteForm.cidade.trim(),
      uf: clienteForm.uf.trim(),
      complemento: clienteForm.complemento.trim(),
      observacao: clienteForm.observacao.trim()
    }

    const { error } = await supabase.from('clientes').insert([payload])
    if (error) {
      setErro(`Não foi possível salvar o cliente. ${error.message}`)
      setSalvandoCliente(false)
      return
    }

    setClienteForm(emptyClienteForm())
    setSalvandoCliente(false)
    fetchClientes().catch((err) => setErro(err.message || 'Erro ao atualizar clientes.'))
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    if (!aberturaDoDia) {
      setErro('Abra o caixa do dia antes de lançar movimentações.')
      setSalvando(false)
      return
    }
    if (fechamentoDoDia) {
      setErro('Este dia já foi fechado. Não é possível lançar novos movimentos.')
      setSalvando(false)
      return
    }

    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.data || !form.descricao.trim() || !form.responsavel || !form.tipo) {
      setErro('Preencha data, descrição, tipo e responsável.')
      setSalvando(false)
      return
    }
    if (!Number.isFinite(valor) || valor <= 0) {
      setErro('Informe um valor válido maior que zero.')
      setSalvando(false)
      return
    }

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

    setForm(emptyFinanceForm(selectedDate))
    setSalvando(false)
    fetchFinance().catch((err) => setErro(err.message || 'Erro ao atualizar lançamentos.'))
  }

  async function confirmarAbertura() {
    try {
      setErro('')
      const valorInicial = Number(String(aberturaValor || '0').replace(',', '.'))

      if (!Number.isFinite(valorInicial) || valorInicial < 0) {
        setErro('Informe um valor inicial válido.')
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
      await fetchFinance()
    } catch (err) {
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
    fetchFinance().catch((err) => setErro(err.message || 'Erro ao atualizar fechamento.'))
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="tag">Gestão da ótica</p>
          <h1>Óticas Fácil</h1>
          <p className="muted">Cadastro de clientes e controle financeiro com visual laranja, preto e branco.</p>
        </div>

        <div className="menu-card">
          <button className={`menu-item ${currentPage === 'clientes' ? 'active' : ''}`} onClick={() => setCurrentPage('clientes')}>Clientes</button>
          <button className={`menu-item ${currentPage === 'financeiro' ? 'active' : ''}`} onClick={() => setCurrentPage('financeiro')}>Livro Caixa</button>
        </div>

        <div className="highlight-card">
          <p className="small-label">Saldo geral</p>
          <h3>{formatMoney(saldo)}</h3>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker">Painel empresarial</p>
            <h2>{currentPage === 'clientes' ? 'Cadastro de clientes' : 'Controle Financeiro da Ótica'}</h2>
          </div>

          {currentPage === 'financeiro' ? (
            <div className="date-card">
              <span>Data de trabalho</span>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          ) : (
            <div className="date-card compact-info-card">
              <span>Total de clientes</span>
              <strong>{clientes.length}</strong>
            </div>
          )}
        </header>

        {erro ? <div className="error-box">{erro}</div> : null}

        {currentPage === 'clientes' ? (
          <>
            <section className="stats-grid client-stats-grid">
              <div className="stat-card"><span className="small-label neutral">Clientes cadastrados</span><strong>{clientes.length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Com CPF</span><strong>{clientes.filter((item) => item.cpf).length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Com cidade</span><strong>{clientes.filter((item) => item.cidade).length}</strong></div>
              <div className="stat-card accent"><span className="small-label light">Busca rápida</span><strong>{clientesFiltrados.length}</strong><p>cliente(s) visível(is)</p></div>
            </section>

            <section className="main-grid client-main-grid">
              <form className="panel form-panel" onSubmit={submitClienteForm}>
                <div className="panel-head">
                  <div>
                    <h3>Novo cliente</h3>
                    <p>Cadastro enxuto com os campos que você definiu.</p>
                  </div>
                </div>

                <div className="form-grid client-form-grid">
                  <label className="field">
                    <span>Código do cliente</span>
                    <input value="Automaticamente" disabled className="disabled-clean" />
                  </label>

                  <label className="field">
                    <span>CPF</span>
                    <input value={clienteForm.cpf} onChange={(e) => updateClienteField('cpf', e.target.value)} />
                  </label>

                  <label className="field field-full">
                    <span>Nome</span>
                    <input value={clienteForm.nome} onChange={(e) => updateClienteField('nome', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>Contato</span>
                    <input value={clienteForm.contato} onChange={(e) => updateClienteField('contato', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>Endereço</span>
                    <input value={clienteForm.endereco} onChange={(e) => updateClienteField('endereco', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>Número</span>
                    <input value={clienteForm.numero} onChange={(e) => updateClienteField('numero', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>Bairro</span>
                    <input value={clienteForm.bairro} onChange={(e) => updateClienteField('bairro', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>Cidade</span>
                    <input value={clienteForm.cidade} onChange={(e) => updateClienteField('cidade', e.target.value)} />
                  </label>

                  <label className="field">
                    <span>UF</span>
                    <select value={clienteForm.uf} onChange={(e) => updateClienteField('uf', e.target.value)}>{ufs.map((item) => <option key={item}>{item}</option>)}</select>
                  </label>

                  <label className="field field-full">
                    <span>Complemento</span>
                    <input value={clienteForm.complemento} onChange={(e) => updateClienteField('complemento', e.target.value)} />
                  </label>

                  <label className="field field-full">
                    <span>Observação</span>
                    <textarea rows="4" value={clienteForm.observacao} onChange={(e) => updateClienteField('observacao', e.target.value)} />
                  </label>
                </div>

                <button className="primary-btn" type="submit" disabled={salvandoCliente}>{salvandoCliente ? 'Salvando...' : 'Salvar cliente'}</button>
              </form>

              <section className="panel list-panel">
                <div className="panel-head list-head">
                  <div>
                    <h3>Busca de clientes</h3>
                    <p>Clique em um cliente para abrir a ficha menor sobre a tela principal.</p>
                  </div>
                  <div className="filters single-search">
                    <input placeholder="Buscar por código, CPF, nome, contato ou cidade" value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} />
                  </div>
                </div>

                {loading ? <div className="empty-state">Carregando clientes...</div> : (
                  <div className="client-list-scroll">
                    {clientesFiltrados.length === 0 ? (
                      <div className="empty-state">Nenhum cliente encontrado.</div>
                    ) : clientesFiltrados.map((cliente) => (
                      <button type="button" className="cliente-card" key={cliente.id} onClick={() => abrirCliente(cliente)}>
                        <div className="cliente-card-top">
                          <div>
                            <span className="cliente-code">Código {cliente.codigo || cliente.id}</span>
                            <strong>{cliente.nome}</strong>
                          </div>
                          <span className="cliente-city">{textValue(cliente.cidade)}</span>
                        </div>
                        <div className="cliente-card-bottom">
                          <span>CPF: {textValue(cliente.cpf)}</span>
                          <span>Contato: {textValue(cliente.contato)}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </section>
          </>
        ) : (
          <>
            <section className="stats-grid">
              <div className="stat-card"><span className="small-label neutral">Valor inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(entradasDia)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(saidasDia)}</strong></div>
              <div className="stat-card accent"><span className="small-label light">Status / Saldo</span><strong>{statusDia}</strong><p>{formatMoney(saldoDia)}</p></div>
            </section>

            <section className="panel">
              <div className="panel-title-row">
                <h3>Fluxo do caixa</h3>
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
              <form className="panel form-panel" onSubmit={submitForm}>
                <div className="panel-head">
                  <div>
                    <h3>Novo lançamento financeiro</h3>
                    <p>Lançamentos liberados apenas após a abertura.</p>
                  </div>
                </div>

                <div className="form-grid">
                  <label className="field"><span>Descrição</span><input value={form.descricao} onChange={(e) => updateField('descricao', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
                  <label className="field"><span>Tipo</span><select value={form.tipo} onChange={(e) => updateField('tipo', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}><option>Entrada</option><option>Saída</option></select></label>
                  <label className="field"><span>Valor</span><input value={form.valor} onChange={(e) => updateField('valor', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
                  <label className="field"><span>Categoria</span><select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{categorias.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field"><span>Forma</span><select value={form.forma} onChange={(e) => updateField('forma', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{formas.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field"><span>Responsável</span><select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field field-full"><span>Observação</span><textarea rows="3" value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
                </div>

                <button className="primary-btn" type="submit" disabled={salvando || !aberturaDoDia || !!fechamentoDoDia}>{salvando ? 'Salvando...' : 'Adicionar lançamento'}</button>
              </form>

              <section className="panel list-panel">
                <div className="panel-head list-head">
                  <div>
                    <h3>Livro caixa</h3>
                    <p>A visão sintética continua resumida e a analítica abre em uma janela menor com rolagem.</p>
                  </div>
                  <div className="filters">
                    <input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select>
                    <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}><option>Todos</option>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select>
                    <button type="button" className="secondary-btn" onClick={() => setShowAnaliticoModal(true)}>Analítico</button>
                  </div>
                </div>

                {loading ? <div className="empty-state">Carregando dados do banco...</div> : (
                  <div className="sintetico-grid">
                    <article className="sintetico-card destaque">
                      <span className="small-label neutral">Vendas do dia</span>
                      <strong>{formatMoney(sinteseDoDia.totalVendas)}</strong>
                      <p>{sinteseDoDia.quantidadeVendas} lançamento(s) de venda</p>
                    </article>
                    <article className="sintetico-card">
                      <span className="small-label neutral">Serviços</span>
                      <strong>{formatMoney(sinteseDoDia.totalServicos)}</strong>
                      <p>{sinteseDoDia.quantidadeServicos} lançamento(s)</p>
                    </article>
                    <article className="sintetico-card">
                      <span className="small-label neutral">Saídas</span>
                      <strong>{formatMoney(sinteseDoDia.totalSaidas)}</strong>
                      <p>{sinteseDoDia.quantidadeSaidas} lançamento(s)</p>
                    </article>
                    <article className="sintetico-card mini-vendas">
                      <div className="mini-vendas-head">
                        <div>
                          <span className="small-label neutral">Venda</span>
                          <strong>{formatMoney(totalVendasDoDia)}</strong>
                        </div>
                        <button type="button" className="secondary-compact-btn" onClick={() => setShowAnaliticoModal(true)}>Ver analítico</button>
                      </div>
                      <div className="mini-vendas-scroll">
                        {vendasEntradaDoDia.length === 0 ? (
                          <div className="empty-inline">Nenhuma venda lançada no dia.</div>
                        ) : vendasEntradaDoDia.map((item) => (
                          <div className="mini-venda-item" key={item.id}>
                            <div>
                              <strong>{item.descricao}</strong>
                              <span>{item.forma} • {item.responsavel}</span>
                            </div>
                            <b>{formatMoney(item.valor)}</b>
                          </div>
                        ))}
                      </div>
                    </article>
                  </div>
                )}
              </section>
            </section>

            <section className="panel resumo-panel">
              <div className="panel-title-row"><h3>Resumo por responsável</h3></div>
              <div className="responsavel-grid">
                {resumoPorResponsavel.map((item) => (
                  <div className="responsavel-card" key={item.nome}>
                    <div className="responsavel-top"><h4>{item.nome}</h4><span>{item.quantidade} lançamentos</span></div>
                    <div className="responsavel-values">
                      <div><small>Entradas</small><strong className="in-text">{formatMoney(item.entradas)}</strong></div>
                      <div><small>Saídas</small><strong className="out-text">{formatMoney(item.saidas)}</strong></div>
                    </div>
                    <div className="responsavel-total"><small>Saldo</small><strong>{formatMoney(item.saldo)}</strong></div>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {showClienteModal && clienteSelecionado ? (
          <div className="modal-overlay">
            <div className="modal-card cliente-modal-card">
              <div className="modal-head">
                <div>
                  <p className="page-kicker">Ficha do cliente</p>
                  <h3>{clienteSelecionado.nome}</h3>
                  <p className="dark-text">Visualização compacta e acolhedora, sobrepondo a tela principal.</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowClienteModal(false)}>×</button>
              </div>

              <div className="cliente-modal-scroll">
                <div className="form-grid client-form-grid modal-form compact-form">
                  <label className="field"><span>Código</span><input value={clienteSelecionado.codigo || clienteSelecionado.id || ''} disabled /></label>
                  <label className="field"><span>CPF</span><input value={clienteSelecionado.cpf || ''} disabled /></label>
                  <label className="field field-full"><span>Nome</span><input value={clienteSelecionado.nome || ''} disabled /></label>
                  <label className="field"><span>Contato</span><input value={clienteSelecionado.contato || ''} disabled /></label>
                  <label className="field"><span>Endereço</span><input value={clienteSelecionado.endereco || ''} disabled /></label>
                  <label className="field"><span>Número</span><input value={clienteSelecionado.numero || ''} disabled /></label>
                  <label className="field"><span>Bairro</span><input value={clienteSelecionado.bairro || ''} disabled /></label>
                  <label className="field"><span>Cidade</span><input value={clienteSelecionado.cidade || ''} disabled /></label>
                  <label className="field"><span>UF</span><input value={clienteSelecionado.uf || ''} disabled /></label>
                  <label className="field field-full"><span>Complemento</span><input value={clienteSelecionado.complemento || ''} disabled /></label>
                  <label className="field field-full"><span>Observação</span><textarea rows="4" value={clienteSelecionado.observacao || ''} disabled /></label>
                </div>
              </div>

              <div className="modal-actions sticky-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowClienteModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        ) : null}

        {showAberturaModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div><p className="page-kicker">Início do expediente</p><h3>Abrir caixa de {formatDate(selectedDate)}</h3></div>
                <button type="button" className="modal-close" onClick={() => setShowAberturaModal(false)}>×</button>
              </div>
              <div className="form-grid modal-form">
                <label className="field"><span>Responsável pela abertura</span><select value={aberturaPor} onChange={(e) => setAberturaPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Valor inicial do caixa</span><input value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} placeholder="Ex.: 200,00" /></label>
                <label className="field field-full"><span>Observação da abertura</span><textarea rows="3" value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} placeholder="Ex.: caixa aberto com troco inicial." /></label>
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
                <div><p className="page-kicker">Conferência final</p><h3>Fechar caixa de {formatDate(selectedDate)}</h3></div>
                <button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>×</button>
              </div>
              <div className="modal-summary">
                <div className="daily-metric"><small>Inicial</small><strong>{formatMoney(valorInicialDia)}</strong></div>
                <div className="daily-metric"><small>Entradas</small><strong className="in-text">{formatMoney(entradasDia)}</strong></div>
                <div className="daily-metric"><small>Saídas</small><strong className="out-text">{formatMoney(saidasDia)}</strong></div>
                <div className="daily-metric"><small>Saldo</small><strong>{formatMoney(saldoDia)}</strong></div>
              </div>
              <div className="form-grid modal-form">
                <label className="field"><span>Responsável pelo fechamento</span><select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field field-full"><span>Observação do fechamento</span><textarea rows="3" value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} /></label>
              </div>
              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button>
                <button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>{fechando ? 'Fechando...' : 'Confirmar fechamento'}</button>
              </div>
            </div>
          </div>
        ) : null}

        {showAnaliticoModal ? (
          <div className="modal-overlay">
            <div className="modal-card analitico-modal-card">
              <div className="modal-head">
                <div>
                  <p className="page-kicker">Visão detalhada</p>
                  <h3>Analítico de vendas • {formatDate(selectedDate)}</h3>
                  <p className="dark-text">Rolagem liberada para ver todos os lançamentos do dia na categoria venda.</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowAnaliticoModal(false)}>×</button>
              </div>

              <div className="analitico-topbar">
                <div className="daily-metric compact">
                  <small>Total de vendas</small>
                  <strong>{formatMoney(totalVendasDoDia)}</strong>
                </div>
                <div className="daily-metric compact">
                  <small>Quantidade</small>
                  <strong>{vendasEntradaDoDia.length}</strong>
                </div>
              </div>

              <div className="analitico-scroll-area">
                {vendasEntradaDoDia.length === 0 ? (
                  <div className="empty-state">Nenhuma venda encontrada para este dia.</div>
                ) : vendasEntradaDoDia.map((item) => (
                  <article className="launch-card" key={item.id}>
                    <div className="launch-top">
                      <div>
                        <div className="launch-title">{item.descricao}</div>
                        <div className="launch-meta">{formatDate(item.data)} • {item.categoria} • {item.forma}</div>
                      </div>
                      <div className="pill in">{item.tipo}</div>
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

              <div className="modal-actions sticky-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowAnaliticoModal(false)}>Fechar</button>
              </div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
