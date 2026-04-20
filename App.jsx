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
  const parts = String(date).slice(0, 10).split('-')
  if (parts.length !== 3) return date
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

function getTodayLocal() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase()
}

function emptyForm(date, codempresa = 1) {
  return {
    data: date || getTodayLocal(),
    descricao: '',
    categoria: 'Venda',
    tipo: 'Entrada',
    forma: 'Pix',
    valor: '',
    observacao: '',
    responsavel: 'MEIRE',
    codempresa
  }
}

function emptyCliente() {
  return {
    id: null, codigo: '', cpf: '', nome: '', contato: '', endereco: '', numero: '', bairro: '', cidade: '', uf: 'PE', complemento: '', observacao: ''
  }
}

function emptyProduto() {
  return {
    id: null,
    codigo: '',
    descricao: '',
    marca: '',
    modelo: '',
    cor: '',
    material: '',
    genero: 'Unissex',
    classificacao: 'receituario',
    referencia_fornecedor: '',
    preco_custo: '',
    preco_venda: '',
    foto_url: '',
    observacao: '',
    ativo: true,
    estoque_facil: '',
    estoque_plena: ''
  }
}

function LoginScreen({ onLogin, loading, erro }) {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  function submit(e) {
    e.preventDefault()
    onLogin(email, senha)
  }

  return (
    <div className="login-shell">
      <section className="login-left">
        <p className="tag">ACESSO EMPRESARIAL</p>
        <h1>Gestão inteligente para óticas</h1>
        <p className="login-description">
          Entre com o email e a senha cadastrados na tabela de usuários e acesse o ambiente da sua empresa.
        </p>
        <div className="login-badges">
          <span>Cadastro de clientes</span>
          <span>Livro caixa</span>
          <span>Cadastro de produtos</span>
        </div>
      </section>

      <form className="login-card" onSubmit={submit}>
        <p className="small-label neutral">LOGIN</p>
        <h2>Acesse sua ótica</h2>
        <p className="dark-text">Use o email e senha cadastrados no banco.</p>

        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@otica.com.br" />
        </label>

        <label className="field">
          <span>Senha</span>
          <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
        </label>

        {erro ? <div className="error-box">{erro}</div> : null}

        <button className="primary-btn" type="submit" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar no sistema'}
        </button>
      </form>
    </div>
  )
}

export default function App() {
  const hoje = getTodayLocal()
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [activeSection, setActiveSection] = useState('clientes')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)
  const [authLoading, setAuthLoading] = useState(false)
  const [empresaAtual, setEmpresaAtual] = useState(null)
  const [usuarioAtual, setUsuarioAtual] = useState(null)

  const [form, setForm] = useState(emptyForm(hoje, 1))
  const [salvando, setSalvando] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [busca, setBusca] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')

  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [showAberturaModal, setShowAberturaModal] = useState(false)
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  const [clientes, setClientes] = useState([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [clienteForm, setClienteForm] = useState(emptyCliente())
  const [clienteSalvando, setClienteSalvando] = useState(false)

  const [produtos, setProdutos] = useState([])
  const [produtoBusca, setProdutoBusca] = useState('')
  const [showProdutoModal, setShowProdutoModal] = useState(false)
  const [produtoForm, setProdutoForm] = useState(emptyProduto())
  const [produtoSalvando, setProdutoSalvando] = useState(false)

  useEffect(() => {
    const persistedEmpresa = localStorage.getItem('otica_empresa')
    const persistedUsuario = localStorage.getItem('otica_usuario')
    if (!persistedEmpresa || !persistedUsuario) {
      setLoading(false)
      return
    }
    try {
      const empresa = JSON.parse(persistedEmpresa)
      const usuario = JSON.parse(persistedUsuario)
      if (empresa?.codempresa) {
        setEmpresaAtual(empresa)
        setUsuarioAtual(usuario || null)
        setForm(emptyForm(hoje, empresa.codempresa))
        fetchAll(empresa.codempresa)
      }
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: selectedDate, codempresa: empresaAtual?.codempresa || prev.codempresa || 1 }))
  }, [selectedDate, empresaAtual])

  async function handleLogin(emailDigitado, senhaDigitada) {
    const email = normalizeEmail(emailDigitado)
    const senha = String(senhaDigitada || '')
    if (!email || !senha) {
      setErro('Informe email e senha.')
      return
    }

    setAuthLoading(true)
    setErro('')

    const { data, error } = await supabase.rpc('autenticar_usuario', {
      login_email: email,
      login_senha: senha
    })

    if (error) {
      setErro(`Não foi possível entrar. ${error.message}`)
      setAuthLoading(false)
      return
    }

    const user = Array.isArray(data) ? data[0] : data
    if (!user?.codempresa) {
      setErro('Email ou senha inválidos, ou usuário inativo.')
      setAuthLoading(false)
      return
    }

    const empresa = { codempresa: user.codempresa, nome: user.empresa_nome }
    localStorage.setItem('otica_empresa', JSON.stringify(empresa))
    localStorage.setItem('otica_usuario', JSON.stringify(user))
    setEmpresaAtual(empresa)
    setUsuarioAtual(user)
    setForm(emptyForm(hoje, user.codempresa))
    await fetchAll(user.codempresa)
    setAuthLoading(false)
  }

  function sairDoSistema() {
    localStorage.removeItem('otica_empresa')
    localStorage.removeItem('otica_usuario')
    setEmpresaAtual(null)
    setUsuarioAtual(null)
    setErro('')
    setLancamentos([])
    setAberturas([])
    setFechamentos([])
    setClientes([])
    setProdutos([])
    setForm(emptyForm(hoje, 1))
  }

  async function fetchAll(codempresaParam = empresaAtual?.codempresa) {
    if (!codempresaParam) return
    setLoading(true)
    setErro('')

    const [lancResp, abResp, fechResp, cliResp, produtosResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').eq('codempresa', codempresaParam).order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').eq('codempresa', codempresaParam).order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').eq('codempresa', codempresaParam).order('data', { ascending: false }),
      supabase.from('clientes').select('*').order('codigo', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
      supabase.from('vw_produtos_com_estoque').select('*').order('descricao', { ascending: true })
    ])

    const responses = [lancResp, abResp, fechResp, cliResp, produtosResp]
    const firstError = responses.find((item) => item.error)
    if (firstError?.error) {
      setErro(firstError.error.message)
      setLoading(false)
      return
    }

    setLancamentos(lancResp.data || [])
    setAberturas(abResp.data || [])
    setFechamentos(fechResp.data || [])
    setClientes(cliResp.data || [])
    setProdutos(produtosResp.data || [])
    setLoading(false)
  }

  const aberturaDoDia = useMemo(() => aberturas.find((item) => item.data === selectedDate) || null, [aberturas, selectedDate])
  const fechamentoDoDia = useMemo(() => fechamentos.find((item) => item.data === selectedDate) || null, [fechamentos, selectedDate])
  const lancamentosDoDia = useMemo(() => lancamentos.filter((item) => item.data === selectedDate), [lancamentos, selectedDate])
  const totalEntradas = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : 0), 0), [lancamentosDoDia])
  const totalSaidas = useMemo(() => lancamentosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor || 0) : 0), 0), [lancamentosDoDia])
  const valorInicialDia = Number(aberturaDoDia?.valor_inicial || 0)
  const saldoDia = valorInicialDia + totalEntradas - totalSaidas
  const statusDia = fechamentoDoDia ? 'Fechado' : aberturaDoDia ? 'Aberto' : 'Não aberto'

  const filtrados = useMemo(() => lancamentos.filter((item) => {
    const texto = `${item.descricao} ${item.categoria} ${item.forma} ${item.observacao || ''} ${item.responsavel}`.toLowerCase()
    return texto.includes(busca.toLowerCase()) && (filtroTipo === 'Todos' || item.tipo === filtroTipo) && (filtroResponsavel === 'Todos' || item.responsavel === filtroResponsavel)
  }), [lancamentos, busca, filtroTipo, filtroResponsavel])

  const filtradosDoDia = useMemo(() => filtrados.filter((item) => item.data === selectedDate), [filtrados, selectedDate])

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.toLowerCase().trim()
    return clientes.filter((cliente) => `${cliente.codigo || ''} ${cliente.nome || ''} ${cliente.cpf || ''} ${cliente.contato || ''} ${cliente.cidade || ''}`.toLowerCase().includes(termo))
  }, [clientes, clienteBusca])

  const produtosFiltrados = useMemo(() => {
    const termo = produtoBusca.toLowerCase().trim()
    return produtos.filter((item) => `${item.codigo || ''} ${item.descricao || ''} ${item.marca || ''} ${item.modelo || ''} ${item.classificacao || ''}`.toLowerCase().includes(termo))
  }, [produtos, produtoBusca])

  const resumoPorResponsavel = useMemo(() => responsaveis.map((nome) => {
    const itens = lancamentosDoDia.filter((item) => item.responsavel === nome)
    const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : 0), 0)
    const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor || 0) : 0), 0)
    return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
  }), [lancamentosDoDia])

  function updateField(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }
  function updateClienteField(field, value) { setClienteForm((prev) => ({ ...prev, [field]: value })) }
  function updateProdutoField(field, value) { setProdutoForm((prev) => ({ ...prev, [field]: value })) }

  function novoCliente() {
    setClienteForm(emptyCliente())
    setShowClienteModal(true)
  }

  function abrirCliente(cliente) {
    setClienteForm({
      id: cliente.id, codigo: cliente.codigo || '', cpf: cliente.cpf || '', nome: cliente.nome || '', contato: cliente.contato || '', endereco: cliente.endereco || '', numero: cliente.numero || '', bairro: cliente.bairro || '', cidade: cliente.cidade || '', uf: cliente.uf || 'PE', complemento: cliente.complemento || '', observacao: cliente.observacao || ''
    })
    setShowClienteModal(true)
  }

  async function salvarCliente(e) {
    e.preventDefault()
    setErro('')
    setClienteSalvando(true)

    if (!clienteForm.nome.trim()) {
      setErro('Informe o nome do cliente.')
      setClienteSalvando(false)
      return
    }

    const payload = {
      cpf: (clienteForm.cpf || '').trim(),
      nome: (clienteForm.nome || '').trim(),
      contato: (clienteForm.contato || '').trim(),
      endereco: (clienteForm.endereco || '').trim(),
      numero: (clienteForm.numero || '').trim(),
      bairro: (clienteForm.bairro || '').trim(),
      cidade: (clienteForm.cidade || '').trim(),
      uf: (clienteForm.uf || '').trim(),
      complemento: (clienteForm.complemento || '').trim(),
      observacao: (clienteForm.observacao || '').trim()
    }

    const response = clienteForm.id
      ? await supabase.from('clientes').update(payload).eq('id', clienteForm.id)
      : await supabase.from('clientes').insert([payload])

    if (response.error) {
      setErro(`Não foi possível salvar o cliente. ${response.error.message}`)
      setClienteSalvando(false)
      return
    }

    setClienteSalvando(false)
    setShowClienteModal(false)
    setClienteForm(emptyCliente())
    await fetchAll(empresaAtual?.codempresa)
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)

    if (!empresaAtual?.codempresa) { setErro('Nenhuma empresa identificada no acesso.'); setSalvando(false); return }
    if (!aberturaDoDia) { setErro('Abra o caixa do dia antes de lançar movimentações.'); setSalvando(false); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado. Não é possível lançar novos movimentos.'); setSalvando(false); return }

    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.data || !form.descricao.trim() || !form.responsavel || !form.tipo) { setErro('Preencha data, descrição, tipo e responsável.'); setSalvando(false); return }
    if (!Number.isFinite(valor) || valor <= 0) { setErro('Informe um valor válido maior que zero.'); setSalvando(false); return }

    const { error } = await supabase.from('lancamentos_caixa').insert([{
      data: form.data,
      descricao: form.descricao.trim(),
      categoria: form.categoria,
      tipo: form.tipo,
      forma: form.forma,
      valor,
      observacao: (form.observacao || '').trim(),
      responsavel: form.responsavel,
      codempresa: empresaAtual.codempresa
    }])

    if (error) { setErro(`Não foi possível salvar o lançamento. ${error.message}`); setSalvando(false); return }

    setForm(emptyForm(selectedDate, empresaAtual.codempresa))
    setSalvando(false)
    fetchAll(empresaAtual?.codempresa)
  }

  async function confirmarAbertura() {
    setErro('')
    if (!empresaAtual?.codempresa) { setErro('Nenhuma empresa identificada no acesso.'); return }
    const valorInicial = Number(String(aberturaValor || '0').replace(',', '.'))
    if (!Number.isFinite(valorInicial) || valorInicial < 0) { setErro('Informe um valor inicial válido.'); return }

    setAbrindo(true)
    const { error } = await supabase.from('aberturas_caixa').insert([{
      data: selectedDate,
      valor_inicial: valorInicial,
      aberto_por: aberturaPor || 'MEIRE',
      observacao: (aberturaObs || '').trim(),
      codempresa: empresaAtual.codempresa
    }])
    if (error) { setErro(`Não foi possível abrir o caixa. ${error.message}`); setAbrindo(false); return }

    setAbrindo(false)
    setShowAberturaModal(false)
    setAberturaValor('')
    setAberturaObs('')
    fetchAll(empresaAtual?.codempresa)
  }

  async function confirmarFechamento() {
    setErro('')
    if (!empresaAtual?.codempresa) { setErro('Nenhuma empresa identificada no acesso.'); return }
    if (!aberturaDoDia) { setErro('Abra o caixa antes de fechar o dia.'); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado.'); return }

    setFechando(true)
    const { error } = await supabase.from('fechamentos_caixa').insert([{
      data: selectedDate,
      total_entradas: totalEntradas,
      total_saidas: totalSaidas,
      saldo: saldoDia,
      fechado_por: fechamentoPor,
      observacao: (fechamentoObs || '').trim(),
      codempresa: empresaAtual.codempresa
    }])
    if (error) { setErro(`Não foi possível fechar o caixa. ${error.message}`); setFechando(false); return }

    setFechando(false)
    setShowFechamentoModal(false)
    setFechamentoObs('')
    fetchAll(empresaAtual?.codempresa)
  }

  function novoProduto() {
    setProdutoForm(emptyProduto())
    setShowProdutoModal(true)
  }

  function editarProduto(produto) {
    setProdutoForm({
      id: produto.id,
      codigo: produto.codigo || '',
      descricao: produto.descricao || '',
      marca: produto.marca || '',
      modelo: produto.modelo || '',
      cor: produto.cor || '',
      material: produto.material || '',
      genero: produto.genero || 'Unissex',
      classificacao: produto.classificacao || 'receituario',
      referencia_fornecedor: produto.referencia_fornecedor || '',
      preco_custo: String(produto.preco_custo ?? ''),
      preco_venda: String(produto.preco_venda ?? ''),
      foto_url: produto.foto_url || '',
      observacao: produto.observacao || '',
      ativo: produto.ativo ?? true,
      estoque_facil: String(produto.estoque_facil ?? ''),
      estoque_plena: String(produto.estoque_plena ?? '')
    })
    setShowProdutoModal(true)
  }

  async function salvarProduto(e) {
    e.preventDefault()
    setErro('')
    setProdutoSalvando(true)

    if (!produtoForm.descricao.trim()) {
      setErro('Informe a descrição da armação.')
      setProdutoSalvando(false)
      return
    }

    const payload = {
      descricao: produtoForm.descricao.trim(),
      marca: produtoForm.marca.trim(),
      modelo: produtoForm.modelo.trim(),
      cor: produtoForm.cor.trim(),
      material: produtoForm.material.trim(),
      genero: produtoForm.genero.trim(),
      classificacao: produtoForm.classificacao,
      referencia_fornecedor: produtoForm.referencia_fornecedor.trim(),
      preco_custo: Number(String(produtoForm.preco_custo || '0').replace(',', '.')) || 0,
      preco_venda: Number(String(produtoForm.preco_venda || '0').replace(',', '.')) || 0,
      foto_url: produtoForm.foto_url.trim(),
      observacao: produtoForm.observacao.trim(),
      ativo: !!produtoForm.ativo
    }

    let produtoId = produtoForm.id

    if (produtoForm.id) {
      const { error } = await supabase.from('produtos').update(payload).eq('id', produtoForm.id)
      if (error) {
        setErro(`Não foi possível salvar o produto. ${error.message}`)
        setProdutoSalvando(false)
        return
      }
    } else {
      const { data, error } = await supabase.from('produtos').insert([payload]).select('*').maybeSingle()
      if (error) {
        setErro(`Não foi possível salvar o produto. ${error.message}`)
        setProdutoSalvando(false)
        return
      }
      produtoId = data?.id
    }

    const estoqueFacil = parseInt(String(produtoForm.estoque_facil || '0'), 10) || 0
    const estoquePlena = parseInt(String(produtoForm.estoque_plena || '0'), 10) || 0

    const { error: estoqueError } = await supabase
      .from('estoque_produtos_empresa')
      .upsert([
        { produto_id: produtoId, codempresa: 1, quantidade: estoqueFacil },
        { produto_id: produtoId, codempresa: 2, quantidade: estoquePlena }
      ], { onConflict: 'produto_id,codempresa' })

    if (estoqueError) {
      setErro(`Produto salvo, mas não foi possível ajustar o estoque. ${estoqueError.message}`)
      setProdutoSalvando(false)
      return
    }

    setProdutoSalvando(false)
    setShowProdutoModal(false)
    setProdutoForm(emptyProduto())
    await fetchAll(empresaAtual?.codempresa)
  }

  if (!empresaAtual) {
    return <LoginScreen onLogin={handleLogin} loading={authLoading} erro={erro} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-card">
          <p className="tag">GESTÃO DA ÓTICA</p>
          <h1>{empresaAtual?.nome || 'Ótica'}</h1>
          {usuarioAtual?.nome ? <p style={{ margin: '10px 0 0', color: 'rgba(255,255,255,.7)' }}>{usuarioAtual.nome}</p> : null}
        </div>

        <div className="menu-card">
          <button className={`menu-item ${activeSection === 'clientes' ? 'active' : ''}`} onClick={() => setActiveSection('clientes')}>Clientes</button>
          <button className={`menu-item ${activeSection === 'financeiro' ? 'active' : ''}`} onClick={() => setActiveSection('financeiro')}>Livro Caixa</button>
          <button className={`menu-item ${activeSection === 'produtos' ? 'active' : ''}`} onClick={() => setActiveSection('produtos')}>Produtos</button>
          <button className={`menu-item ${activeSection === 'resumo' ? 'active' : ''}`} onClick={() => setActiveSection('resumo')}>Resumo Geral</button>
        </div>

        <div className="highlight-card">
          <p className="small-label black-label">Saldo do dia</p>
          <h3>{formatMoney(saldoDia)}</h3>
        </div>

        <button type="button" className="secondary-btn" onClick={sairDoSistema}>Sair</button>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker orange-text">Painel empresarial</p>
            <h2>
              {activeSection === 'clientes'
                ? 'Cadastro de clientes'
                : activeSection === 'financeiro'
                ? 'Controle Financeiro da Ótica'
                : activeSection === 'produtos'
                ? 'Cadastro de produtos'
                : `Resumo do caixa • ${formatDate(selectedDate)}`}
            </h2>
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
              <div className="stat-card"><span className="small-label neutral">Cidade filtrada</span><strong>{new Set(clientes.filter(c=>c.cidade).map(c=>c.cidade)).size}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Com contato</span><strong>{clientes.filter(c=>c.contato).length}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Busca rápida</span><strong>{clientesFiltrados.length}</strong><p>registro(s) encontrados</p></div>
            </section>

            <section className="panel clientes-panel">
              <div className="panel-head clientes-head">
                <div><h3>Clientes cadastrados</h3><p>Cadastro compartilhado entre as empresas.</p></div>
                <div className="filters clientes-filters">
                  <input placeholder="Buscar por código, nome, CPF, contato ou cidade" value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} />
                  <button type="button" className="primary-inline-btn" onClick={novoCliente}>Novo cliente</button>
                </div>
              </div>

              {loading ? <div className="empty-state">Carregando clientes...</div> : (
                <div className="clientes-list">
                  {clientesFiltrados.length === 0 ? <div className="empty-state">Nenhum cliente encontrado.</div> : clientesFiltrados.map((cliente) => (
                    <button type="button" className="cliente-row" key={cliente.id} onClick={() => abrirCliente(cliente)}>
                      <div className="cliente-main"><strong>{cliente.nome || 'Sem nome'}</strong><span>{cliente.endereco || '-'} {cliente.numero ? `, ${cliente.numero}` : ''}</span></div>
                      <div className="cliente-side"><b>{cliente.codigo || cliente.id}</b><span>{cliente.cidade || '-'}{cliente.uf ? ` • ${cliente.uf}` : ''}</span></div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : activeSection === 'financeiro' ? (
          <>
            <section className="stats-grid">
              <div className="stat-card"><span className="small-label neutral">Valor inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(totalEntradas)}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(totalSaidas)}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Status / Saldo</span><strong>{statusDia}</strong><p>{formatMoney(saldoDia)}</p></div>
            </section>

            <section className="panel">
              <div className="panel-title-row"><h3>Fluxo do caixa</h3></div>
              {!aberturaDoDia ? (
                <button className="secondary-compact-btn" type="button" onClick={() => setShowAberturaModal(true)}>Abrir caixa do dia</button>
              ) : fechamentoDoDia ? (
                <div className="closed-info"><strong>Aberto por {aberturaDoDia.aberto_por}</strong><span>Fechado por {fechamentoDoDia.fechado_por} • saldo final {formatMoney(fechamentoDoDia.saldo)}</span></div>
              ) : (
                <div className="compact-actions"><div className="opened-info"><strong>Caixa aberto por {aberturaDoDia.aberto_por}</strong><span>Valor inicial {formatMoney(aberturaDoDia.valor_inicial)}</span></div><button className="secondary-compact-btn" type="button" onClick={() => setShowFechamentoModal(true)}>Revisar e fechar o dia</button></div>
              )}
            </section>

            <section className="main-grid">
              <form className="panel form-panel" onSubmit={submitForm}>
                <div className="panel-head"><div><h3>Novo lançamento financeiro</h3><p>Lançamentos liberados apenas após a abertura.</p></div></div>
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
                  <div><h3>Livro caixa</h3><p>Somente registros da empresa logada.</p></div>
                  <div className="filters">
                    <input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} />
                    <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select>
                    <select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}><option>Todos</option>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select>
                  </div>
                </div>

                <div className="sintetico-grid">
                  <article className="sintetico-card destaque"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : 0), 0))}</strong><p>{filtradosDoDia.filter((item) => item.tipo === 'Entrada').length} lançamento(s)</p></article>
                  <article className="sintetico-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor || 0) : 0), 0))}</strong><p>{filtradosDoDia.filter((item) => item.tipo === 'Saída').length} lançamento(s)</p></article>
                  <article className="sintetico-card"><span className="small-label neutral">Saldo filtrado do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : -Number(item.valor || 0)), 0))}</strong><p>resumo conforme filtros</p></article>
                </div>

                <div className="stack-list" style={{ marginTop: 16 }}>
                  {filtradosDoDia.length === 0 ? <div className="empty-state">Nenhum lançamento para esta data.</div> : filtradosDoDia.map((item) => (
                    <article key={item.id} className="record-sheet">
                      <div className="record-sheet-head">
                        <div>
                          <h4>{item.descricao}</h4>
                          <p>{item.categoria} • {item.forma} • {item.responsavel}</p>
                        </div>
                        <div className={`pill ${item.tipo === 'Entrada' ? 'in' : 'out'}`}>{item.tipo}</div>
                      </div>
                      <div className="sheet-grid">
                        <div><small>Data</small><strong>{formatDate(item.data)}</strong></div>
                        <div><small>Valor</small><strong>{formatMoney(item.valor)}</strong></div>
                        <div><small>Empresa</small><strong>{empresaAtual?.nome || '-'}</strong></div>
                      </div>
                      {item.observacao ? <p className="sheet-note">{item.observacao}</p> : null}
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </>
        ) : activeSection === 'produtos' ? (
          <>
            <section className="stats-grid client-stats-grid">
              <div className="stat-card"><span className="small-label neutral">Produtos cadastrados</span><strong>{produtos.length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Receituário</span><strong>{produtos.filter((item) => item.classificacao === 'receituario').length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Solar</span><strong>{produtos.filter((item) => item.classificacao === 'solar').length}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Estoque da empresa atual</span><strong>{empresaAtual?.codempresa === 1 ? produtos.reduce((acc, item) => acc + Number(item.estoque_facil || 0), 0) : produtos.reduce((acc, item) => acc + Number(item.estoque_plena || 0), 0)}</strong><p>{empresaAtual?.nome || 'Ótica'}</p></div>
            </section>

            <section className="panel clientes-panel">
              <div className="panel-head clientes-head">
                <div><h3>Armações cadastradas</h3><p>Cadastro único de produtos com estoque separado por empresa.</p></div>
                <div className="filters clientes-filters">
                  <input placeholder="Buscar por código, descrição, marca, modelo ou tipo" value={produtoBusca} onChange={(e) => setProdutoBusca(e.target.value)} />
                  <button type="button" className="primary-inline-btn" onClick={novoProduto}>Novo produto</button>
                </div>
              </div>

              <div className="clientes-list">
                {produtosFiltrados.length === 0 ? <div className="empty-state">Nenhuma armação cadastrada.</div> : produtosFiltrados.map((produto) => (
                  <button type="button" className="cliente-row" key={produto.id} onClick={() => editarProduto(produto)}>
                    <div className="cliente-main">
                      <strong>{produto.descricao || 'Sem descrição'}</strong>
                      <span>{produto.codigo || 'Automático'} • {produto.marca || '-'} • {produto.modelo || '-'} • {produto.classificacao === 'solar' ? 'Solar' : 'Receituário'}</span>
                    </div>
                    <div className="cliente-side">
                      <b>{formatMoney(produto.preco_venda)}</b>
                      <span>Fácil {produto.estoque_facil || 0} • Plena {produto.estoque_plena || 0}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        ) : (
          <section className="panel resumo-panel">
            <div className="panel-title-row"><h3>Resumo do dia por responsável</h3></div>
            <div className="responsavel-grid">
              {resumoPorResponsavel.map((item) => (
                <div className="responsavel-card" key={item.nome}>
                  <div className="responsavel-top"><h4>{item.nome}</h4><span>{item.quantidade} lançamentos</span></div>
                  <div className="responsavel-values"><div><small>Entradas</small><strong className="in-text">{formatMoney(item.entradas)}</strong></div><div><small>Saídas</small><strong className="out-text">{formatMoney(item.saidas)}</strong></div></div>
                  <div className="responsavel-total"><small>Saldo</small><strong>{formatMoney(item.saldo)}</strong></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {showClienteModal ? (
          <div className="modal-overlay">
            <div className="modal-card client-modal-card">
              <div className="modal-head">
                <div><p className="page-kicker orange-text">Ficha do cliente</p><h3>{clienteForm.nome || 'Novo cliente'}</h3><p className="dark-text">Cadastro compartilhado entre as empresas.</p></div>
                <button type="button" className="modal-close" onClick={() => setShowClienteModal(false)}>×</button>
              </div>

              <form onSubmit={salvarCliente} className="client-scroll-area">
                <div className="form-grid">
                  <label className="field"><span>Código</span><input value={clienteForm.codigo || ''} disabled placeholder="Automático" /></label>
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

                <div className="modal-actions sticky-actions">
                  <button type="button" className="secondary-btn" onClick={() => setShowClienteModal(false)}>Fechar</button>
                  <button type="submit" className="primary-inline-btn" disabled={clienteSalvando}>{clienteSalvando ? 'Salvando...' : 'Salvar cliente'}</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showProdutoModal ? (
          <div className="modal-overlay">
            <div className="modal-card client-modal-card">
              <div className="modal-head">
                <div><p className="page-kicker orange-text">Cadastro de produto</p><h3>{produtoForm.id ? 'Editar armação' : 'Nova armação'}</h3><p className="dark-text">Produtos compartilhados entre as empresas e estoque separado por loja.</p></div>
                <button type="button" className="modal-close" onClick={() => setShowProdutoModal(false)}>×</button>
              </div>

              <form onSubmit={salvarProduto} className="client-scroll-area">
                <div className="form-grid">
                  <label className="field"><span>Código</span><input value={produtoForm.codigo || ''} disabled placeholder="Gerado automaticamente" /></label>
                  <label className="field"><span>Tipo</span><select value={produtoForm.classificacao} onChange={(e) => updateProdutoField('classificacao', e.target.value)}><option value="receituario">Receituário</option><option value="solar">Solar</option></select></label>
                  <label className="field field-full"><span>Descrição da armação</span><input value={produtoForm.descricao} onChange={(e) => updateProdutoField('descricao', e.target.value)} /></label>
                  <label className="field"><span>Marca</span><input value={produtoForm.marca} onChange={(e) => updateProdutoField('marca', e.target.value)} /></label>
                  <label className="field"><span>Modelo</span><input value={produtoForm.modelo} onChange={(e) => updateProdutoField('modelo', e.target.value)} /></label>
                  <label className="field"><span>Cor</span><input value={produtoForm.cor} onChange={(e) => updateProdutoField('cor', e.target.value)} /></label>
                  <label className="field"><span>Material</span><input value={produtoForm.material} onChange={(e) => updateProdutoField('material', e.target.value)} /></label>
                  <label className="field"><span>Gênero</span><select value={produtoForm.genero} onChange={(e) => updateProdutoField('genero', e.target.value)}><option>Unissex</option><option>Masculino</option><option>Feminino</option><option>Infantil</option></select></label>
                  <label className="field"><span>Referência do fornecedor</span><input value={produtoForm.referencia_fornecedor} onChange={(e) => updateProdutoField('referencia_fornecedor', e.target.value)} /></label>
                  <label className="field"><span>Preço de custo</span><input value={produtoForm.preco_custo} onChange={(e) => updateProdutoField('preco_custo', e.target.value)} /></label>
                  <label className="field"><span>Preço de venda</span><input value={produtoForm.preco_venda} onChange={(e) => updateProdutoField('preco_venda', e.target.value)} /></label>
                  <label className="field field-full"><span>Foto do produto (URL)</span><input value={produtoForm.foto_url} onChange={(e) => updateProdutoField('foto_url', e.target.value)} placeholder="https://..." /></label>
                  {produtoForm.foto_url ? <div className="field field-full"><span>Prévia da foto</span><img src={produtoForm.foto_url} alt={produtoForm.descricao || 'Produto'} style={{ width: '100%', maxHeight: 280, objectFit: 'cover', borderRadius: 18, border: '1px solid #e5ebf3' }} /></div> : null}
                  <label className="field"><span>Estoque Fácil</span><input value={produtoForm.estoque_facil} onChange={(e) => updateProdutoField('estoque_facil', e.target.value)} /></label>
                  <label className="field"><span>Estoque Plena</span><input value={produtoForm.estoque_plena} onChange={(e) => updateProdutoField('estoque_plena', e.target.value)} /></label>
                  <label className="field field-full"><span>Observação</span><textarea rows="4" value={produtoForm.observacao} onChange={(e) => updateProdutoField('observacao', e.target.value)} /></label>
                </div>

                <div className="modal-actions sticky-actions">
                  <button type="button" className="secondary-btn" onClick={() => setShowProdutoModal(false)}>Fechar</button>
                  <button type="submit" className="primary-inline-btn" disabled={produtoSalvando}>{produtoSalvando ? 'Salvando...' : 'Salvar produto'}</button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {showAberturaModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head"><div><p className="page-kicker orange-text">Início do expediente</p><h3>Abrir caixa de {formatDate(selectedDate)}</h3></div><button type="button" className="modal-close" onClick={() => setShowAberturaModal(false)}>×</button></div>
              <div className="form-grid modal-form">
                <label className="field"><span>Responsável pela abertura</span><select value={aberturaPor} onChange={(e) => setAberturaPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field"><span>Valor inicial do caixa</span><input value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} placeholder="Ex.: 200,00" /></label>
                <label className="field field-full"><span>Observação da abertura</span><textarea rows="3" value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} /></label>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowAberturaModal(false)}>Cancelar</button><button type="button" className="primary-inline-btn" onClick={confirmarAbertura} disabled={abrindo}>{abrindo ? 'Abrindo...' : 'Confirmar abertura'}</button></div>
            </div>
          </div>
        ) : null}

        {showFechamentoModal ? (
          <div className="modal-overlay">
            <div className="modal-card">
              <div className="modal-head"><div><p className="page-kicker orange-text">Conferência final</p><h3>Fechar caixa de {formatDate(selectedDate)}</h3></div><button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>×</button></div>
              <div className="modal-summary">
                <div className="daily-metric"><small>Inicial</small><strong>{formatMoney(valorInicialDia)}</strong></div>
                <div className="daily-metric"><small>Entradas</small><strong className="in-text">{formatMoney(totalEntradas)}</strong></div>
                <div className="daily-metric"><small>Saídas</small><strong className="out-text">{formatMoney(totalSaidas)}</strong></div>
                <div className="daily-metric"><small>Saldo</small><strong>{formatMoney(saldoDia)}</strong></div>
              </div>
              <div className="form-grid modal-form">
                <label className="field"><span>Responsável pelo fechamento</span><select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label>
                <label className="field field-full"><span>Observação do fechamento</span><textarea rows="3" value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} /></label>
              </div>
              <div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button><button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>{fechando ? 'Fechando...' : 'Confirmar fechamento'}</button></div>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
