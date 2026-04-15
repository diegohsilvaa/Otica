import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = ['Venda', 'Serviço', 'Fornecedor', 'Despesa Fixa', 'Aluguel', 'Energia', 'Internet', 'Funcionário', 'Retirada', 'Outros']
const formas = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito']
const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

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

function emptyCliente() {
  return {
    id: null,
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

export default function App() {
  const hoje = getTodayLocal()

  const [selectedDate, setSelectedDate] = useState(hoje)
  const [activeSection, setActiveSection] = useState('clientes')
  const [form, setForm] = useState(emptyForm(hoje))
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
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
  const [clienteBusca, setClienteBusca] = useState('')
  const [clienteForm, setClienteForm] = useState(emptyCliente())
  const [clienteSalvando, setClienteSalvando] = useState(false)
  const [clienteExcluindo, setClienteExcluindo] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)

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

    const canalClientes = supabase
      .channel('clientes-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, () => { fetchAll() })
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

  async function fetchAll() {
    setLoading(true)
    setErro('')

    const [lancResp, abResp, fechResp, cliResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false }),
      supabase.from('clientes').select('*').order('codigo', { ascending: true, nullsFirst: false }).order('id', { ascending: true })
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
    if (cliResp.error) {
      setErro(`Não foi possível carregar os clientes. ${cliResp.error.message}`)
      setLoading(false)
      return
    }

    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
    setClientes(cliResp.data || [])
    setLoading(false)
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
      const itens = lancamentosDoDia.filter((item) => item.responsavel === nome)
      const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0)
      const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0)
      return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
    })
  }, [lancamentosDoDia])

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.toLowerCase().trim()
    return clientes.filter((cliente) => {
      const texto = `${cliente.codigo || ''} ${cliente.nome || ''} ${cliente.cpf || ''} ${cliente.contato || ''} ${cliente.cidade || ''}`.toLowerCase()
      return texto.includes(termo)
    })
  }, [clientes, clienteBusca])

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  function updateClienteField(field, value) {
    setClienteForm((prev) => ({ ...prev, [field]: value }))
  }

  function novoCliente() {
    setClienteSelecionado(null)
    setClienteExcluindo(false)
    setClienteSalvando(false)
    setClienteForm(emptyCliente())
    setShowClienteModal(true)
  }

  function abrirCliente(cliente) {
    setClienteSelecionado(cliente)
    setClienteForm({
      id: cliente.id,
      codigo: cliente.codigo || '',
      cpf: cliente.cpf || '',
      nome: cliente.nome || '',
      contato: cliente.contato || '',
      endereco: cliente.endereco || '',
      numero: cliente.numero || '',
      bairro: cliente.bairro || '',
      cidade: cliente.cidade || '',
      uf: cliente.uf || 'PE',
      complemento: cliente.complemento || '',
      observacao: cliente.observacao || ''
    })
    setClienteExcluindo(false)
    setClienteSalvando(false)
    setShowClienteModal(true)
  }

  async function salvarCliente(e) {
    e?.preventDefault?.()
    setErro('')
    setClienteSalvando(true)

    if (!clienteForm.nome.trim()) {
      setErro('Informe o nome do cliente.')
      setClienteSalvando(false)
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

    let response
    const clienteId = clienteForm.id || clienteSelecionado?.id

    if (clienteId) {
      response = await supabase.from('clientes').update(payload).eq('id', clienteId)
    } else {
      response = await supabase.from('clientes').insert([payload])
    }

    if (response.error) {
      setErro(`Não foi possível salvar o cliente. ${response.error.message}`)
      setClienteSalvando(false)
      return
    }

    await fetchAll()
    setClienteSalvando(false)
    setShowClienteModal(false)
    setClienteSelecionado(null)
    setClienteForm(emptyCliente())
  }

  async function excluirCliente() {
    if (!clienteSelecionado?.id) return
    const confirmar = window.confirm(`Excluir o cliente ${clienteSelecionado.nome}?`)
    if (!confirmar) return

    setErro('')
    setClienteExcluindo(true)
    const { error } = await supabase.from('clientes').delete().eq('id', clienteSelecionado.id)

    if (error) {
      setErro(`Não foi possível excluir o cliente. ${error.message}`)
      setClienteExcluindo(false)
      return
    }

    setClienteExcluindo(false)
    setShowClienteModal(false)
    setClienteSelecionado(null)
    setClienteForm(emptyCliente())
    fetchAll()
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

    setForm(emptyForm(selectedDate))
    setSalvando(false)
    fetchAll()
  }

  async function confirmarAbertura() {
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
    await fetchAll()
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
          <p className="tag">GESTÃO DA ÓTICA</p>
          <h1>ÓTICAS FÁCIL</h1>
        </div>

        <div className="menu-card">
          <button className={`menu-item ${activeSection === 'clientes' ? 'active' : ''}`} onClick={() => setActiveSection('clientes')}>Clientes</button>
          <button className={`menu-item ${activeSection === 'financeiro' ? 'active' : ''}`} onClick={() => setActiveSection('financeiro')}>Livro Caixa</button>
          <button className={`menu-item ${activeSection === 'resumo' ? 'active' : ''}`} onClick={() => setActiveSection('resumo')}>Resumo Geral</button>
        </div>

        <div className="highlight-card">
          <p className="small-label black-label">Saldo geral</p>
          <h3>{formatMoney(saldo)}</h3>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker orange-text">Painel empresarial</p>
            <h2>{activeSection === 'clientes' ? 'Cadastro de clientes' : activeSection === 'financeiro' ? 'Controle Financeiro da Ótica' : `Resumo do caixa • ${formatDate(selectedDate)}`}</h2>
          </div>

          <div className="date-card">
            <span>Data de trabalho</span>
            <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </header>

        {erro ? <div className="error-box">{erro}</div> : null}

        {activeSection === 'clientes' ? (
          <>
            <section className="stats-grid client-stats-grid">
              <div className="stat-card"><span className="small-label neutral">Total de clientes</span><strong>{clientes.length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Clientes com cidade</span><strong>{clientes.filter((item) => item.cidade).length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Clientes com CPF</span><strong>{clientes.filter((item) => item.cpf).length}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Busca rápida</span><strong>{clientesFiltrados.length}</strong><p>registro(s) encontrados</p></div>
            </section>

            <section className="panel clientes-panel">
              <div className="panel-head clientes-head">
                <div>
                  <h3>Clientes cadastrados</h3>
                  <p>Clique no cliente para visualizar, alterar ou excluir em uma janela menor.</p>
                </div>
                <div className="filters clientes-filters">
                  <input placeholder="Buscar por código, nome, CPF, contato ou cidade" value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} />
                  <button type="button" className="primary-inline-btn" onClick={novoCliente}>Novo cliente</button>
                </div>
              </div>

              {loading ? <div className="empty-state">Carregando clientes...</div> : (
                <div className="clientes-list">
                  {clientesFiltrados.length === 0 ? (
                    <div className="empty-state">Nenhum cliente encontrado.</div>
                  ) : clientesFiltrados.map((cliente) => (
                    <button type="button" className="cliente-row" key={cliente.id} onClick={() => abrirCliente(cliente)}>
                      <div className="cliente-main">
                        <strong>{cliente.nome || 'Sem nome'}</strong>
                        <span>{cliente.cidade || '-'}{cliente.uf ? ` • ${cliente.uf}` : ''}</span>
                      </div>
                      <div className="cliente-side">
                        <b>Cód. {cliente.codigo || '-'}</b>
                        <small>{cliente.cpf || 'CPF não informado'}</small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}

        {activeSection === 'financeiro' ? (
          <>
            <section className="stats-grid">
              <div className="stat-card"><span className="small-label neutral">Valor inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(entradasDia)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(saidasDia)}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Status / Saldo</span><strong>{statusDia}</strong><p>{formatMoney(saldoDia)}</p></div>
            </section>

            <section className="panel">
              <div className="panel-title-row"><h3>Fluxo do caixa</h3></div>
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
                    <article className="sintetico-card destaque orange-card">
                      <span className="small-label neutral white-text">Vendas do dia</span>
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
          </>
        ) : null}

        {activeSection === 'resumo' ? (
          <section className="panel resumo-panel">
            <div className="panel-title-row"><h3>Resumo do dia por responsável</h3><span className="small-label">{formatDate(selectedDate)}</span></div>
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
        ) : null}

        {showClienteModal ? (
          <div className="modal-overlay">
            <div className="modal-card cliente-modal">
              <div className="modal-head">
                <div>
                  <p className="page-kicker orange-text">Ficha do cliente</p>
                  <h3>{clienteSelecionado ? 'Alterar cliente' : 'Novo cliente'}</h3>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowClienteModal(false)}>×</button>
              </div>

              <form className="cliente-scroll" onSubmit={salvarCliente}>
                <div className="form-grid cliente-form-grid">
                  <label className="field"><span>Código</span><input value={clienteForm.codigo || ''} disabled /></label>
                  <label className="field"><span>CPF</span><input value={clienteForm.cpf} onChange={(e) => updateClienteField('cpf', e.target.value)} /></label>
                  <label className="field field-full"><span>Nome</span><input value={clienteForm.nome} onChange={(e) => updateClienteField('nome', e.target.value)} /></label>
                  <label className="field"><span>Contato</span><input value={clienteForm.contato} onChange={(e) => updateClienteField('contato', e.target.value)} /></label>
                  <label className="field"><span>Endereço</span><input value={clienteForm.endereco} onChange={(e) => updateClienteField('endereco', e.target.value)} /></label>
                  <label className="field"><span>Número</span><input value={clienteForm.numero} onChange={(e) => updateClienteField('numero', e.target.value)} /></label>
                  <label className="field"><span>Bairro</span><input value={clienteForm.bairro} onChange={(e) => updateClienteField('bairro', e.target.value)} /></label>
                  <label className="field"><span>Cidade</span><input value={clienteForm.cidade} onChange={(e) => updateClienteField('cidade', e.target.value)} /></label>
                  <label className="field"><span>UF</span><select value={clienteForm.uf} onChange={(e) => updateClienteField('uf', e.target.value)}>{estados.map((uf) => <option key={uf}>{uf}</option>)}</select></label>
                  <label className="field field-full"><span>Complemento</span><input value={clienteForm.complemento} onChange={(e) => updateClienteField('complemento', e.target.value)} /></label>
                  <label className="field field-full"><span>Observação</span><textarea rows="4" value={clienteForm.observacao} onChange={(e) => updateClienteField('observacao', e.target.value)} /></label>
                </div>

                <div className="modal-actions sticky-actions between-actions">
                  <div>
                    {clienteSelecionado ? (
                      <button type="button" className="danger-btn" onClick={excluirCliente} disabled={clienteExcluindo}>{clienteExcluindo ? 'Excluindo...' : 'Excluir cliente'}</button>
                    ) : null}
                  </div>
                  <div className="action-group">
                    <button type="button" className="secondary-btn" onClick={() => setShowClienteModal(false)}>Fechar</button>
                    <button type="submit" className="primary-inline-btn" disabled={clienteSalvando}>{clienteSalvando ? 'Salvando...' : clienteSelecionado ? 'Salvar alteração' : 'Cadastrar cliente'}</button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showAberturaModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head">
                <div><p className="page-kicker orange-text">Início do expediente</p><h3>Abrir caixa de {formatDate(selectedDate)}</h3></div>
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
                <div><p className="page-kicker orange-text">Conferência final</p><h3>Fechar caixa de {formatDate(selectedDate)}</h3></div>
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
                  <p className="page-kicker orange-text">Visão detalhada</p>
                  <h3>Analítico do caixa • {formatDate(selectedDate)}</h3>
                  <p className="dark-text">Rolagem liberada para ver todas as entradas e saídas do dia.</p>
                </div>
                <button type="button" className="modal-close" onClick={() => setShowAnaliticoModal(false)}>×</button>
              </div>

              <div className="analitico-topbar">
                <div className="daily-metric compact">
                  <small>Entradas do dia</small>
                  <strong>{formatMoney(entradasDia)}</strong>
                </div>
                <div className="daily-metric compact">
                  <small>Saídas do dia</small>
                  <strong className="out-text">{formatMoney(saidasDia)}</strong>
                </div>
                <div className="daily-metric compact">
                  <small>Quantidade</small>
                  <strong>{filtradosDoDia.length}</strong>
                </div>
              </div>

              <div className="analitico-scroll-area">
                {filtradosDoDia.length === 0 ? (
                  <div className="empty-state">Nenhum lançamento encontrado para este dia.</div>
                ) : filtradosDoDia.map((item) => (
                  <article className="launch-card" key={item.id}>
                    <div className="launch-top">
                      <div>
                        <div className="launch-title">{item.descricao}</div>
                        <div className="launch-meta">{formatDate(item.data)} • {item.categoria} • {item.forma}</div>
                      </div>
                      <div className={`pill ${item.tipo === 'Saída' ? 'out' : 'in'}`}>{item.tipo}</div>
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
