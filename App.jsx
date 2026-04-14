
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

function emptyClienteForm() {
  return {
    nome: '',
    contato: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: ''
  }
}

function InitialPage({ onOpen }) {
  return (
    <section className="initial-page">
      <div className="initial-hero">
        <div>
          <p className="page-kicker dark-kicker">Página inicial</p>
          <h2>Ótica Fácil</h2>
          <p className="topbar-subtitle">
            Esta área ficará reservada para a futura tela de login com acesso por email.
            Por enquanto, ela funciona como página inicial neutra do sistema.
          </p>
        </div>
      </div>

      <div className="initial-grid">
        <button type="button" className="initial-card" onClick={() => onOpen('clientes')}>
          <small>Cadastro</small>
          <strong>Clientes</strong>
          <span>Acesse os cadastros e a ficha básica dos clientes.</span>
        </button>

        <button type="button" className="initial-card" onClick={() => onOpen('fluxo-caixa')}>
          <small>Financeiro</small>
          <strong>Livro Caixa</strong>
          <span>Abra o fluxo financeiro e acompanhe as movimentações.</span>
        </button>

        <div className="initial-info-card">
          <small>Empresa</small>
          <strong>Ótica Fácil</strong>
        </div>

        <div className="initial-info-card">
          <small>Cidade</small>
          <strong>Agrestina - PE</strong>
        </div>

        <div className="initial-info-card">
          <small>Endereço</small>
          <strong>Rua João de Deus, nº 292</strong>
        </div>

        <div className="initial-info-card">
          <small>Telefone</small>
          <strong>81 99748-6190</strong>
        </div>
      </div>
    </section>
  )
}

export default function App() {
  const hoje = getTodayLocal()
  const [abaAtual, setAbaAtual] = useState('pagina-inicial')
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyForm(hoje))
  const [clienteForm, setClienteForm] = useState(emptyClienteForm())
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
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

    const subs = [
      supabase.channel('lancamentos-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_caixa' }, fetchAll).subscribe(),
      supabase.channel('aberturas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'aberturas_caixa' }, fetchAll).subscribe(),
      supabase.channel('fechamentos-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'fechamentos_caixa' }, fetchAll).subscribe(),
      supabase.channel('clientes-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, fetchAll).subscribe(),
    ]

    return () => subs.forEach(ch => supabase.removeChannel(ch))
  }, [])

  useEffect(() => {
    setForm(prev => ({ ...prev, data: selectedDate }))
  }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    setErro('')

    const [lancResp, abResp, fechResp, cliResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false }),
      supabase.from('clientes').select('*').order('codigo', { ascending: true }),
    ])

    if (lancResp.error || abResp.error || fechResp.error || cliResp.error) {
      setErro(
        lancResp.error?.message ||
        abResp.error?.message ||
        fechResp.error?.message ||
        cliResp.error?.message ||
        'Erro ao carregar dados.'
      )
      setLoading(false)
      return
    }

    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
    setClientes(cliResp.data || [])
    setLoading(false)
  }

  const aberturaDoDia = useMemo(() => aberturas.find(item => item.data === selectedDate) || null, [aberturas, selectedDate])
  const fechamentoDoDia = useMemo(() => fechamentos.find(item => item.data === selectedDate) || null, [fechamentos, selectedDate])
  const lancamentosDoDia = useMemo(() => lancamentos.filter(item => item.data === selectedDate), [lancamentos, selectedDate])

  const totalEntradas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentos])
  const totalSaidas = useMemo(() => lancamentos.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentos])
  const entradasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor) : 0), 0), [lancamentosDoDia])
  const saidasDia = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor) : 0), 0), [lancamentosDoDia])

  const valorInicialDia = Number(aberturaDoDia?.valor_inicial || 0)
  const saldoDia = valorInicialDia + entradasDia - saidasDia
  const saldo = totalEntradas - totalSaidas
  const statusDia = fechamentoDoDia ? 'Fechado' : aberturaDoDia ? 'Aberto' : 'Não aberto'

  const filtrados = useMemo(() => {
    return lancamentos.filter(item => {
      const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''} ${item.responsavel}`.toLowerCase()
      return texto.includes(busca.toLowerCase()) &&
        (filtroTipo === 'Todos' || item.tipo === filtroTipo) &&
        (filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel)
    })
  }, [lancamentos, busca, filtroTipo, filtroResponsavel])

  const lancamentosExibidos = useMemo(() => {
    return mostrarTodosLancamentos ? filtrados : filtrados.slice(0, 6)
  }, [filtrados, mostrarTodosLancamentos])

  const resumoCategorias = useMemo(() => {
    const mapa = {}
    lancamentosExibidos.forEach(item => {
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

  const clientesFiltrados = useMemo(() => {
    return clientes.filter(item => {
      const texto = `${item.codigo || ''} ${item.nome || ''} ${item.contato || ''} ${item.endereco || ''} ${item.bairro || ''} ${item.cidade || ''} ${item.uf || ''} ${item.cep || ''}`.toLowerCase()
      return texto.includes(buscaCliente.toLowerCase())
    })
  }, [clientes, buscaCliente])

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function updateClienteField(field, value) {
    setClienteForm(prev => ({ ...prev, [field]: value }))
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')

    if (!aberturaDoDia) return setErro('Abra o caixa do dia antes de lançar movimentações.')
    if (fechamentoDoDia) return setErro('Este dia já foi fechado.')

    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.descricao.trim()) return setErro('Informe a descrição.')
    if (!Number.isFinite(valor) || valor <= 0) return setErro('Informe um valor válido.')

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

    setSalvando(false)

    if (error) return setErro(`Não foi possível salvar o lançamento. ${error.message}`)

    setForm(emptyForm(selectedDate))
    fetchAll()
  }

  async function submitCliente(e) {
    e.preventDefault()
    setErro('')

    if (!clienteForm.nome.trim()) return setErro('Preencha o nome do cliente.')

    setSalvandoCliente(true)

    const { error } = await supabase.from('clientes').insert([{
      nome: clienteForm.nome.trim(),
      contato: (clienteForm.contato || '').trim(),
      endereco: (clienteForm.endereco || '').trim(),
      numero: (clienteForm.numero || '').trim(),
      complemento: (clienteForm.complemento || '').trim(),
      bairro: (clienteForm.bairro || '').trim(),
      cidade: (clienteForm.cidade || '').trim(),
      uf: (clienteForm.uf || '').trim(),
      cep: (clienteForm.cep || '').trim()
    }]).select()

    setSalvandoCliente(false)

    if (error) return setErro(`Não foi possível salvar o cliente. ${error.message}`)

    setClienteForm(emptyClienteForm())
    fetchAll()
  }

  async function confirmarAbertura() {
    setErro('')
    const valorInicial = Number(String(aberturaValor || '0').replace(',', '.'))
    if (!Number.isFinite(valorInicial) || valorInicial < 0) return setErro('Informe um valor inicial válido.')

    setAbrindo(true)

    const { error } = await supabase.from('aberturas_caixa').insert([{
      data: selectedDate,
      valor_inicial: valorInicial,
      aberto_por: aberturaPor,
      observacao: (aberturaObs || '').trim()
    }])

    setAbrindo(false)

    if (error) return setErro(`Não foi possível abrir o caixa. ${error.message}`)

    setShowAberturaModal(false)
    setAberturaValor('')
    setAberturaObs('')
    fetchAll()
  }

  async function confirmarFechamento() {
    setErro('')
    if (!aberturaDoDia) return setErro('Abra o caixa antes de fechar o dia.')
    if (fechamentoDoDia) return setErro('Este dia já foi fechado.')

    setFechando(true)

    const { error } = await supabase.from('fechamentos_caixa').insert([{
      data: selectedDate,
      total_entradas: entradasDia,
      total_saidas: saidasDia,
      saldo: saldoDia,
      fechado_por: fechamentoPor,
      observacao: (fechamentoObs || '').trim()
    }])

    setFechando(false)

    if (error) return setErro(`Não foi possível fechar o caixa. ${error.message}`)

    setShowFechamentoModal(false)
    setFechamentoObs('')
    fetchAll()
  }

  function renderPage() {
    if (abaAtual === 'pagina-inicial') {
      return <InitialPage onOpen={(destino) => setAbaAtual(destino)} />
    }

    if (abaAtual === 'fluxo-caixa') {
      return (
        <>
          <header className="topbar">
            <div>
              <p className="page-kicker">Painel financeiro</p>
              <h2>Livro Caixa</h2>
              <p className="topbar-subtitle">Controle entradas, saídas e recebimentos de forma rápida.</p>
            </div>
            <div className="date-card">
              <span>Data de trabalho</span>
              <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
          </header>

          <section className="stats-grid">
            <div className="stat-card"><span className="small-label">Valor inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
            <div className="stat-card"><span className="small-label">Entradas do dia</span><strong className="in-text">{formatMoney(entradasDia)}</strong></div>
            <div className="stat-card"><span className="small-label">Saídas do dia</span><strong className="out-text">{formatMoney(saidasDia)}</strong></div>
            <div className="stat-card accent"><span className="small-label">Status / Saldo</span><strong>{statusDia}</strong><p>{formatMoney(saldoDia)}</p></div>
          </section>

          <section className="panel">
            <div className="panel-title-row">
              <div>
                <h3>Fluxo do caixa</h3>
                <p className="topbar-subtitle">Abra, acompanhe e feche o caixa do dia.</p>
              </div>
            </div>

            {!aberturaDoDia ? (
              <button className="secondary-btn" type="button" onClick={() => setShowAberturaModal(true)}>Abrir caixa do dia</button>
            ) : fechamentoDoDia ? (
              <div className="opened-info">
                <strong>Aberto por {aberturaDoDia.aberto_por}</strong>
                <span>Fechado por {fechamentoDoDia.fechado_por} • saldo final {formatMoney(fechamentoDoDia.saldo)}</span>
              </div>
            ) : (
              <div className="opened-info">
                <strong>Caixa aberto por {aberturaDoDia.aberto_por}</strong>
                <span>Valor inicial {formatMoney(aberturaDoDia.valor_inicial)}</span>
                <button className="secondary-btn" type="button" onClick={() => setShowFechamentoModal(true)}>Revisar e fechar o dia</button>
              </div>
            )}
          </section>

          <section className="main-grid">
            <form className="panel featured-form" onSubmit={submitForm}>
              <div className="panel-head">
                <div>
                  <span className="badge-title">Área principal</span>
                  <h3>Novo lançamento financeiro</h3>
                  <p>É aqui que você registra recebimentos, entradas e saídas do caixa.</p>
                </div>
              </div>

              <div className="quick-type-row">
                <button type="button" className={form.tipo === 'Entrada' ? 'type-chip active-chip' : 'type-chip'} onClick={() => updateField('tipo', 'Entrada')}>Recebimento / Entrada</button>
                <button type="button" className={form.tipo === 'Saída' ? 'type-chip danger-chip active-chip' : 'type-chip'} onClick={() => updateField('tipo', 'Saída')}>Saída / Retirada</button>
              </div>

              <div className="form-grid">
                <label className="field field-full"><span>Descrição</span><input value={form.descricao} onChange={(e) => updateField('descricao', e.target.value)} placeholder="Ex.: Recebimento de óculos, pagamento..." disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
                <label className="field"><span>Valor</span><input value={form.valor} onChange={(e) => updateField('valor', e.target.value)} placeholder="0,00" disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
                <label className="field"><span>Categoria</span><select value={form.categoria} onChange={(e) => updateField('categoria', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{categorias.map(item => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Forma</span><select value={form.forma} onChange={(e) => updateField('forma', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{formas.map(item => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Responsável</span><select value={form.responsavel} onChange={(e) => updateField('responsavel', e.target.value)} disabled={!aberturaDoDia || !!fechamentoDoDia}>{responsaveis.map(item => <option key={item}>{item}</option>)}</select></label>
                <label className="field field-full"><span>Observação</span><textarea rows="3" value={form.observacao} onChange={(e) => updateField('observacao', e.target.value)} placeholder="Observações do lançamento..." disabled={!aberturaDoDia || !!fechamentoDoDia} /></label>
              </div>

              <button className="primary-btn" type="submit" disabled={salvando || !aberturaDoDia || !!fechamentoDoDia}>{salvando ? 'Salvando...' : 'Salvar lançamento'}</button>
            </form>

            <section className="panel">
              <div className="panel-head">
                <div>
                  <h3>Livro caixa</h3>
                  <p>Veja de forma sintética ou analítica.</p>
                </div>
                <div className="view-switch">
                  <button type="button" className={modoLivro === 'sintetica' ? 'switch-btn active-switch' : 'switch-btn'} onClick={() => setModoLivro('sintetica')}>Sintética</button>
                  <button type="button" className={modoLivro === 'analitica' ? 'switch-btn active-switch' : 'switch-btn'} onClick={() => setModoLivro('analitica')}>Analítica</button>
                </div>
              </div>

              <div className="filters">
                <input placeholder="Buscar lançamento" value={busca} onChange={(e) => setBusca(e.target.value)} />
                <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select>
                <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}><option>Todos</option>{responsaveis.map(item => <option key={item}>{item}</option>)}</select>
                <button type="button" className="secondary-btn" onClick={() => setMostrarTodosLancamentos(prev => !prev)}>{mostrarTodosLancamentos ? 'Reduzir' : 'Expandir tudo'}</button>
              </div>

              {loading ? <div className="empty-state">Carregando dados do banco...</div> : modoLivro === 'sintetica' ? (
                <div className="summary-list">
                  {resumoCategorias.length === 0 ? <div className="empty-state">Nenhum lançamento encontrado.</div> : resumoCategorias.map(grupo => (
                    <article className="summary-card" key={grupo.chave}>
                      <div className="summary-header">
                        <div>
                          <div className="summary-title-row"><h4>{grupo.categoria}</h4><span className={grupo.tipo === 'Entrada' ? 'pill in' : 'pill out'}>{grupo.tipo}</span></div>
                          <p>{grupo.quantidade} lançamento(s)</p>
                        </div>
                        <strong>{formatMoney(grupo.valor)}</strong>
                      </div>
                      {mostrarTodosLancamentos ? <div className="summary-items">{grupo.itens.map(item => <div className="mini-launch" key={item.id}><div><div className="mini-title">{item.descricao}</div><div className="mini-meta">{formatDate(item.data)} • {item.forma} • {item.responsavel}</div></div><strong>{formatMoney(item.valor)}</strong></div>)}</div> : null}
                    </article>
                  ))}
                </div>
              ) : (
                <div className="launch-list">
                  {lancamentosExibidos.length === 0 ? <div className="empty-state">Nenhum lançamento encontrado.</div> : lancamentosExibidos.map(item => (
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
        </>
      )
    }

    return (
      <>
        <header className="topbar">
          <div>
            <p className="page-kicker">Cadastro</p>
            <h2>Clientes</h2>
            <p className="topbar-subtitle">Código gerado pelo banco e sem edição pelo usuário.</p>
          </div>
        </header>

        <section className="main-grid clientes-grid">
          <form className="panel featured-form" onSubmit={submitCliente}>
            <div className="panel-head">
              <div>
                <span className="badge-title">Novo cadastro</span>
                <h3>Cadastrar cliente</h3>
                <p>O código é gerado automaticamente pelo banco de dados.</p>
              </div>
            </div>

            <div className="auto-code-box">Código do cliente: <strong>gerado automaticamente</strong></div>

            <div className="form-grid">
              <label className="field"><span>Contato</span><input value={clienteForm.contato} onChange={(e) => updateClienteField('contato', e.target.value)} placeholder="Telefone ou WhatsApp" /></label>
              <label className="field"><span>CEP</span><input value={clienteForm.cep} onChange={(e) => updateClienteField('cep', e.target.value)} placeholder="CEP" /></label>
              <label className="field field-full"><span>Nome</span><input value={clienteForm.nome} onChange={(e) => updateClienteField('nome', e.target.value)} placeholder="Nome completo do cliente" /></label>
              <label className="field field-full"><span>Endereço</span><input value={clienteForm.endereco} onChange={(e) => updateClienteField('endereco', e.target.value)} placeholder="Rua, avenida, travessa..." /></label>
              <label className="field"><span>Número</span><input value={clienteForm.numero} onChange={(e) => updateClienteField('numero', e.target.value)} placeholder="Nº" /></label>
              <label className="field"><span>Complemento</span><input value={clienteForm.complemento} onChange={(e) => updateClienteField('complemento', e.target.value)} placeholder="Casa, apto, referência..." /></label>
              <label className="field"><span>Bairro</span><input value={clienteForm.bairro} onChange={(e) => updateClienteField('bairro', e.target.value)} placeholder="Bairro" /></label>
              <label className="field"><span>Cidade</span><input value={clienteForm.cidade} onChange={(e) => updateClienteField('cidade', e.target.value)} placeholder="Cidade" /></label>
              <label className="field"><span>UF</span><input value={clienteForm.uf} onChange={(e) => updateClienteField('uf', e.target.value)} placeholder="UF" maxLength="2" /></label>
            </div>

            <button className="primary-btn" type="submit" disabled={salvandoCliente}>{salvandoCliente ? 'Salvando...' : 'Salvar cliente'}</button>
          </form>

          <section className="panel">
            <div className="panel-head">
              <div>
                <h3>Lista de clientes</h3>
                <p>Veja os dados principais e o endereço resumido.</p>
              </div>
            </div>

            <div className="filters">
              <input placeholder="Buscar por código, nome, contato ou endereço" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} />
            </div>

            {loading ? <div className="empty-state">Carregando clientes...</div> : clientesFiltrados.length === 0 ? <div className="empty-state">Nenhum cliente cadastrado.</div> : (
              <div className="clientes-lista">
                {clientesFiltrados.map(cliente => (
                  <article className="cliente-card" key={cliente.id}>
                    <div className="cliente-linha"><span className="cliente-label">Código</span><strong>{cliente.codigo}</strong></div>
                    <div className="cliente-linha"><span className="cliente-label">Nome</span><strong>{cliente.nome}</strong></div>
                    <div className="cliente-linha"><span className="cliente-label">Contato</span><strong>{cliente.contato || '-'}</strong></div>
                    <div className="cliente-linha"><span className="cliente-label">Endereço</span><strong>{[cliente.endereco, cliente.numero, cliente.complemento].filter(Boolean).join(', ') || '-'}</strong></div>
                    <div className="cliente-linha"><span className="cliente-label">Bairro / Cidade</span><strong>{[cliente.bairro, cliente.cidade, cliente.uf].filter(Boolean).join(' - ') || '-'}</strong></div>
                    <div className="cliente-linha"><span className="cliente-label">CEP</span><strong>{cliente.cep || '-'}</strong></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>
      </>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="tag">Gestão interna</p>
          <h1>Óticas Fácil</h1>
          <p className="muted">Agrestina - PE • Rua João de Deus, nº 292 • 81 99748-6190</p>
        </div>

        <div className="menu-card">
          <button type="button" className={abaAtual === 'pagina-inicial' ? 'menu-item active menu-button' : 'menu-item menu-button'} onClick={() => setAbaAtual('pagina-inicial')}>Página Inicial</button>
          <button type="button" className={abaAtual === 'clientes' ? 'menu-item active menu-button' : 'menu-item menu-button'} onClick={() => setAbaAtual('clientes')}>Clientes</button>
          <button type="button" className={abaAtual === 'fluxo-caixa' ? 'menu-item active menu-button' : 'menu-item menu-button'} onClick={() => setAbaAtual('fluxo-caixa')}>Livro Caixa</button>
        </div>

        <div className="highlight-card">
          {abaAtual === 'fluxo-caixa'
            ? <><p className="small-label">Saldo geral</p><h3>{formatMoney(saldo)}</h3><span>{lancamentos.length} lançamento(s)</span></>
            : <><p className="small-label">Clientes</p><h3>{clientes.length}</h3><span>cadastro(s) no sistema</span></>}
        </div>
      </aside>

      <main className="content">
        {erro ? <div className="error-box">{erro}</div> : null}
        <div key={abaAtual} className="app-page-transition">
          {renderPage()}
        </div>
      </main>

      {showAberturaModal ? (
        <div className="modal-overlay">
          <div className="modal-card modal-enter">
            <div className="panel-head">
              <h3>Abrir caixa</h3>
              <button type="button" className="secondary-btn" onClick={() => setShowAberturaModal(false)}>Fechar</button>
            </div>
            <div className="form-grid">
              <label className="field"><span>Responsável</span><select value={aberturaPor} onChange={(e) => setAberturaPor(e.target.value)}>{responsaveis.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field"><span>Valor inicial</span><input value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} placeholder="Ex.: 200,00" /></label>
              <label className="field field-full"><span>Observação</span><textarea rows="3" value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} /></label>
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
          <div className="modal-card modal-enter">
            <div className="panel-head">
              <h3>Fechar caixa</h3>
              <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Fechar</button>
            </div>
            <div className="stats-grid" style={{ marginBottom: 16 }}>
              <div className="stat-card"><span className="small-label">Inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
              <div className="stat-card"><span className="small-label">Entradas</span><strong className="in-text">{formatMoney(entradasDia)}</strong></div>
              <div className="stat-card"><span className="small-label">Saídas</span><strong className="out-text">{formatMoney(saidasDia)}</strong></div>
              <div className="stat-card"><span className="small-label">Saldo</span><strong>{formatMoney(saldoDia)}</strong></div>
            </div>
            <div className="form-grid">
              <label className="field"><span>Responsável</span><select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>{responsaveis.map(item => <option key={item}>{item}</option>)}</select></label>
              <label className="field field-full"><span>Observação</span><textarea rows="3" value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} /></label>
            </div>
            <div className="modal-actions">
              <button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button>
              <button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>{fechando ? 'Fechando...' : 'Confirmar fechamento'}</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
