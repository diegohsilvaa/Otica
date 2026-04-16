
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

function parseMoney(value) {
  if (typeof value === 'number') return value
  const normalized = String(value || '').replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '')
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : 0
}

function addMonths(date, months) {
  if (!date) return ''
  const [year, month, day] = String(date).split('-').map(Number)
  const base = new Date(year, month - 1, day || 1)
  const target = new Date(base)
  target.setMonth(target.getMonth() + months)
  const y = target.getFullYear()
  const m = String(target.getMonth() + 1).padStart(2, '0')
  const d = String(target.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function emptyForm(date) {
  return {
    data: date || getTodayLocal(), descricao: '', categoria: 'Venda', tipo: 'Entrada', forma: 'Pix', valor: '', observacao: '', responsavel: 'MEIRE'
  }
}

function emptyCliente() {
  return {
    id: null, codigo: '', cpf: '', nome: '', contato: '', endereco: '', numero: '', bairro: '', cidade: '', uf: 'PE', complemento: '', observacao: ''
  }
}

function emptyExame() {
  return {
    id: null, data_exame: getTodayLocal(), medico: '', vendedora: '', lente: '', armacao: '', adicao: '', os: '', observacao: '', alt: '',
    od_esf: '', od_ch: '', od_eixo: '', od_dnp: '', oe_esf: '', oe_ch: '', oe_eixo: '', oe_dnp: ''
  }
}

function emptyFinanceiro() {
  return {
    id: null,
    emissao: getTodayLocal(),
    duplicata: '',
    vencimento: '',
    valor_total: '',
    valor_quitado: '',
    data_pagamento: '',
    forma_pagamento: '',
    observacao: '',
    tipo_cobranca: 'carne',
    quantidade_parcelas: '1',
    numero_parcela: '1',
    status: 'Em aberto',
    grupo_parcelas: ''
  }
}

export default function App() {
  const hoje = getTodayLocal()
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [activeSection, setActiveSection] = useState('clientes')
  const [erro, setErro] = useState('')
  const [loading, setLoading] = useState(true)

  const [form, setForm] = useState(emptyForm(hoje))
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
  const [showAnaliticoModal, setShowAnaliticoModal] = useState(false)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  const [clientes, setClientes] = useState([])
  const [clienteBusca, setClienteBusca] = useState('')
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [clienteTab, setClienteTab] = useState('dados')
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [clienteForm, setClienteForm] = useState(emptyCliente())
  const [clienteSalvando, setClienteSalvando] = useState(false)
  const [clienteExcluindo, setClienteExcluindo] = useState(false)

  const [exames, setExames] = useState([])
  const [financeiros, setFinanceiros] = useState([])
  const [exameForm, setExameForm] = useState(emptyExame())
  const [financeiroForm, setFinanceiroForm] = useState(emptyFinanceiro())
  const [salvandoExame, setSalvandoExame] = useState(false)
  const [salvandoFinanceiro, setSalvandoFinanceiro] = useState(false)

  useEffect(() => {
    fetchAll()
    const channels = [
      supabase.channel('lancamentos-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'lancamentos_caixa' }, fetchAll).subscribe(),
      supabase.channel('aberturas-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'aberturas_caixa' }, fetchAll).subscribe(),
      supabase.channel('fechamentos-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'fechamentos_caixa' }, fetchAll).subscribe(),
      supabase.channel('clientes-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'clientes' }, fetchAll).subscribe(),
      supabase.channel('cliente-exames-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'cliente_exames' }, fetchAll).subscribe(),
      supabase.channel('cliente-financeiro-realtime').on('postgres_changes', { event: '*', schema: 'public', table: 'cliente_financeiro' }, fetchAll).subscribe()
    ]
    return () => channels.forEach((channel) => supabase.removeChannel(channel))
  }, [])

  useEffect(() => {
    setForm((prev) => ({ ...prev, data: selectedDate }))
  }, [selectedDate])

  async function fetchAll() {
    setLoading(true)
    setErro('')
    const [lancResp, abResp, fechResp, cliResp, exResp, finResp] = await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data', { ascending: false }).order('id', { ascending: false }),
      supabase.from('aberturas_caixa').select('*').order('data', { ascending: false }),
      supabase.from('fechamentos_caixa').select('*').order('data', { ascending: false }),
      supabase.from('clientes').select('*').order('codigo', { ascending: true, nullsFirst: false }).order('id', { ascending: true }),
      supabase.from('cliente_exames').select('*').order('data_exame', { ascending: false }).order('id', { ascending: false }),
      supabase.from('cliente_financeiro').select('*').order('emissao', { ascending: false }).order('id', { ascending: false })
    ])
    const responses = [lancResp, abResp, fechResp, cliResp, exResp, finResp]
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
    setExames(exResp.data || [])
    setFinanceiros(finResp.data || [])
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

  const examesDoCliente = useMemo(() => clienteSelecionado?.id ? exames.filter((item) => item.cliente_id === clienteSelecionado.id) : [], [exames, clienteSelecionado])
  const financeiroDoCliente = useMemo(() => clienteSelecionado?.id ? financeiros.filter((item) => item.cliente_id === clienteSelecionado.id) : [], [financeiros, clienteSelecionado])
  const totalFinanceiroCliente = useMemo(() => financeiroDoCliente.reduce((acc, item) => acc + Number(item.valor_total || 0), 0), [financeiroDoCliente])
  const totalRecebidoCliente = useMemo(() => financeiroDoCliente.reduce((acc, item) => acc + Number(item.valor_quitado || 0), 0), [financeiroDoCliente])
  const saldoFinanceiroCliente = useMemo(() => totalFinanceiroCliente - totalRecebidoCliente, [totalFinanceiroCliente, totalRecebidoCliente])

  const resumoPorResponsavel = useMemo(() => responsaveis.map((nome) => {
    const itens = lancamentosDoDia.filter((item) => item.responsavel === nome)
    const entradas = itens.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : 0), 0)
    const saidas = itens.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor || 0) : 0), 0)
    return { nome, entradas, saidas, saldo: entradas - saidas, quantidade: itens.length }
  }), [lancamentosDoDia])

  function updateField(field, value) { setForm((prev) => ({ ...prev, [field]: value })) }
  function updateClienteField(field, value) { setClienteForm((prev) => ({ ...prev, [field]: value })) }
  function updateExameField(field, value) { setExameForm((prev) => ({ ...prev, [field]: value })) }
  function updateFinanceiroField(field, value) { setFinanceiroForm((prev) => ({ ...prev, [field]: value })) }

  function novoCliente() {
    setClienteSelecionado(null)
    setClienteForm(emptyCliente())
    setExameForm(emptyExame())
    setFinanceiroForm(emptyFinanceiro())
    setClienteTab('dados')
    setShowClienteModal(true)
  }

  function abrirCliente(cliente) {
    setClienteSelecionado(cliente)
    setClienteForm({
      id: cliente.id, codigo: cliente.codigo || '', cpf: cliente.cpf || '', nome: cliente.nome || '', contato: cliente.contato || '', endereco: cliente.endereco || '', numero: cliente.numero || '', bairro: cliente.bairro || '', cidade: cliente.cidade || '', uf: cliente.uf || 'PE', complemento: cliente.complemento || '', observacao: cliente.observacao || ''
    })
    setExameForm(emptyExame())
    setFinanceiroForm(emptyFinanceiro())
    setClienteTab('dados')
    setShowClienteModal(true)
  }

  function fecharModalCliente() {
    setShowClienteModal(false)
    setClienteSelecionado(null)
    setClienteForm(emptyCliente())
    setExameForm(emptyExame())
    setFinanceiroForm(emptyFinanceiro())
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
      cpf: (clienteForm.cpf || '').trim(), nome: (clienteForm.nome || '').trim(), contato: (clienteForm.contato || '').trim(), endereco: (clienteForm.endereco || '').trim(), numero: (clienteForm.numero || '').trim(), bairro: (clienteForm.bairro || '').trim(), cidade: (clienteForm.cidade || '').trim(), uf: (clienteForm.uf || '').trim(), complemento: (clienteForm.complemento || '').trim(), observacao: (clienteForm.observacao || '').trim()
    }
    let response
    if (clienteForm.id) {
      response = await supabase.from('clientes').update(payload).eq('id', clienteForm.id)
    } else {
      response = await supabase.from('clientes').insert([payload]).select('*').maybeSingle()
    }
    if (response.error) {
      setErro(`Não foi possível salvar o cliente. ${response.error.message}`)
      setClienteSalvando(false)
      return
    }
    await fetchAll()
    if (!clienteForm.id && response.data) {
      setClienteSelecionado(response.data)
      setClienteForm({ ...emptyCliente(), ...response.data })
      setClienteTab('exames')
    } else {
      setShowClienteModal(false)
      setClienteSelecionado(null)
      setClienteForm(emptyCliente())
    }
    setClienteSalvando(false)
  }

  async function excluirCliente() {
    if (!clienteSelecionado?.id) return
    if (!window.confirm(`Excluir o cliente ${clienteSelecionado.nome}?`)) return
    setClienteExcluindo(true)
    setErro('')
    const { error } = await supabase.from('clientes').delete().eq('id', clienteSelecionado.id)
    if (error) {
      setErro(`Não foi possível excluir o cliente. ${error.message}`)
      setClienteExcluindo(false)
      return
    }
    setClienteExcluindo(false)
    fecharModalCliente()
    fetchAll()
  }

  async function salvarExame(e) {
    e?.preventDefault?.()
    const clienteId = clienteForm.id || clienteSelecionado?.id
    if (!clienteId) {
      setErro('Salve o cliente primeiro para depois lançar exame e financeiro.')
      return
    }
    setSalvandoExame(true)
    setErro('')
    const payload = {
      cliente_id: clienteId, data_exame: exameForm.data_exame || null, medico: exameForm.medico.trim(), vendedora: exameForm.vendedora.trim(), lente: exameForm.lente.trim(), armacao: exameForm.armacao.trim(), adicao: exameForm.adicao.trim(), os: exameForm.os.trim(), observacao: exameForm.observacao.trim(), alt: exameForm.alt.trim(), od_esf: exameForm.od_esf.trim(), od_ch: exameForm.od_ch.trim(), od_eixo: exameForm.od_eixo.trim(), od_dnp: exameForm.od_dnp.trim(), oe_esf: exameForm.oe_esf.trim(), oe_ch: exameForm.oe_ch.trim(), oe_eixo: exameForm.oe_eixo.trim(), oe_dnp: exameForm.oe_dnp.trim()
    }
    const query = exameForm.id ? supabase.from('cliente_exames').update(payload).eq('id', exameForm.id) : supabase.from('cliente_exames').insert([payload])
    const { error } = await query
    if (error) {
      setErro(`Não foi possível salvar o exame. ${error.message}`)
      setSalvandoExame(false)
      return
    }
    setExameForm(emptyExame())
    setSalvandoExame(false)
    fetchAll()
  }

  function editarExame(item) {
    setExameForm({ ...emptyExame(), ...item })
    setClienteTab('exames')
  }

  async function excluirExame(id) {
    if (!window.confirm('Excluir este exame?')) return
    const { error } = await supabase.from('cliente_exames').delete().eq('id', id)
    if (error) {
      setErro(`Não foi possível excluir o exame. ${error.message}`)
      return
    }
    if (exameForm.id === id) setExameForm(emptyExame())
    fetchAll()
  }

  async function salvarFinanceiro(e) {
    e?.preventDefault?.()
    const clienteId = clienteForm.id || clienteSelecionado?.id
    if (!clienteId) {
      setErro('Salve o cliente primeiro para depois lançar exame e financeiro.')
      return
    }
    setSalvandoFinanceiro(true)
    setErro('')
    const valorTotal = parseMoney(financeiroForm.valor_total || '0')
    const valorQuitado = parseMoney(financeiroForm.valor_quitado || '0')
    const quantidadeParcelas = Math.max(1, Number(financeiroForm.quantidade_parcelas || 1))
    const tipoCobranca = financeiroForm.tipo_cobranca || 'carne'
    if (!Number.isFinite(valorTotal) || valorTotal <= 0) {
      setErro('Informe um valor total válido.')
      setSalvandoFinanceiro(false)
      return
    }
    if (!Number.isFinite(valorQuitado) || valorQuitado < 0) {
      setErro('Informe um valor quitado válido.')
      setSalvandoFinanceiro(false)
      return
    }

    const basePayload = {
      cliente_id: clienteId,
      emissao: financeiroForm.emissao || null,
      duplicata: financeiroForm.duplicata.trim(),
      vencimento: financeiroForm.vencimento || null,
      valor_total: valorTotal,
      valor_quitado: valorQuitado,
      data_pagamento: financeiroForm.data_pagamento || null,
      forma_pagamento: financeiroForm.forma_pagamento.trim(),
      observacao: financeiroForm.observacao.trim(),
      tipo_cobranca: tipoCobranca,
      quantidade_parcelas: quantidadeParcelas,
      numero_parcela: Number(financeiroForm.numero_parcela || 1),
      status: financeiroForm.status || (valorQuitado >= valorTotal && valorTotal > 0 ? 'Pago' : 'Em aberto'),
      grupo_parcelas: financeiroForm.grupo_parcelas || null
    }

    let error = null
    if (financeiroForm.id) {
      const response = await supabase.from('cliente_financeiro').update(basePayload).eq('id', financeiroForm.id)
      error = response.error
    } else if (tipoCobranca === 'carne' && quantidadeParcelas > 1) {
      const valorParcelaBase = Math.floor((valorTotal / quantidadeParcelas) * 100) / 100
      const totalBase = Number((valorParcelaBase * quantidadeParcelas).toFixed(2))
      const diferenca = Number((valorTotal - totalBase).toFixed(2))
      const grupoParcelas = `CARNE-${Date.now()}`
      const parcelas = Array.from({ length: quantidadeParcelas }, (_, index) => {
        const numeroParcela = index + 1
        const ultimoAjuste = numeroParcela === quantidadeParcelas ? diferenca : 0
        const valorParcela = Number((valorParcelaBase + ultimoAjuste).toFixed(2))
        return {
          ...basePayload,
          duplicata: financeiroForm.duplicata.trim() || `Carnê ${numeroParcela}/${quantidadeParcelas}`,
          valor_total: valorParcela,
          valor_quitado: 0,
          data_pagamento: null,
          vencimento: financeiroForm.vencimento ? addMonths(financeiroForm.vencimento, index) : null,
          numero_parcela: numeroParcela,
          quantidade_parcelas: quantidadeParcelas,
          status: 'Em aberto',
          grupo_parcelas: grupoParcelas
        }
      })
      const response = await supabase.from('cliente_financeiro').insert(parcelas)
      error = response.error
    } else {
      const response = await supabase.from('cliente_financeiro').insert([{ ...basePayload, grupo_parcelas: basePayload.grupo_parcelas || `LANC-${Date.now()}` }])
      error = response.error
    }

    if (error) {
      setErro(`Não foi possível salvar o financeiro. ${error.message}`)
      setSalvandoFinanceiro(false)
      return
    }
    setFinanceiroForm(emptyFinanceiro())
    setSalvandoFinanceiro(false)
    fetchAll()
  }

  function editarFinanceiro(item) {
    setFinanceiroForm({
      ...emptyFinanceiro(),
      ...item,
      valor_total: String(item.valor_total ?? ''),
      valor_quitado: String(item.valor_quitado ?? ''),
      forma_pagamento: item.forma_pagamento || '',
      tipo_cobranca: item.tipo_cobranca || 'carne',
      quantidade_parcelas: String(item.quantidade_parcelas || 1),
      numero_parcela: String(item.numero_parcela || 1),
      status: item.status || 'Em aberto',
      grupo_parcelas: item.grupo_parcelas || ''
    })
    setClienteTab('financeiro')
  }

  async function registrarBaixaFinanceiro(item) {
    const payload = {
      valor_quitado: Number(item.valor_total || 0),
      data_pagamento: getTodayLocal(),
      status: 'Pago'
    }
    const { error } = await supabase.from('cliente_financeiro').update(payload).eq('id', item.id)
    if (error) {
      setErro(`Não foi possível dar baixa. ${error.message}`)
      return
    }
    fetchAll()
  }

  async function removerBaixaFinanceiro(item) {
    const { error } = await supabase.from('cliente_financeiro').update({ valor_quitado: 0, data_pagamento: null, status: 'Em aberto' }).eq('id', item.id)
    if (error) {
      setErro(`Não foi possível reabrir a parcela. ${error.message}`)
      return
    }
    fetchAll()
  }

  async function excluirFinanceiro(id) {
    if (!window.confirm('Excluir este lançamento financeiro?')) return
    const { error } = await supabase.from('cliente_financeiro').delete().eq('id', id)
    if (error) {
      setErro(`Não foi possível excluir o financeiro. ${error.message}`)
      return
    }
    if (financeiroForm.id === id) setFinanceiroForm(emptyFinanceiro())
    fetchAll()
  }

  async function submitForm(e) {
    e.preventDefault()
    setErro('')
    setSalvando(true)
    if (!aberturaDoDia) { setErro('Abra o caixa do dia antes de lançar movimentações.'); setSalvando(false); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado. Não é possível lançar novos movimentos.'); setSalvando(false); return }
    const valor = Number(String(form.valor).replace(',', '.'))
    if (!form.data || !form.descricao.trim() || !form.responsavel || !form.tipo) { setErro('Preencha data, descrição, tipo e responsável.'); setSalvando(false); return }
    if (!Number.isFinite(valor) || valor <= 0) { setErro('Informe um valor válido maior que zero.'); setSalvando(false); return }
    const { error } = await supabase.from('lancamentos_caixa').insert([{ data: form.data, descricao: form.descricao.trim(), categoria: form.categoria, tipo: form.tipo, forma: form.forma, valor, observacao: (form.observacao || '').trim(), responsavel: form.responsavel }])
    if (error) { setErro(`Não foi possível salvar o lançamento. ${error.message}`); setSalvando(false); return }
    setForm(emptyForm(selectedDate)); setSalvando(false); fetchAll()
  }

  async function confirmarAbertura() {
    setErro('')
    const valorInicial = Number(String(aberturaValor || '0').replace(',', '.'))
    if (!Number.isFinite(valorInicial) || valorInicial < 0) { setErro('Informe um valor inicial válido.'); return }
    setAbrindo(true)
    const { error } = await supabase.from('aberturas_caixa').insert([{ data: selectedDate, valor_inicial: valorInicial, aberto_por: aberturaPor || 'MEIRE', observacao: (aberturaObs || '').trim() }])
    if (error) { setErro(`Não foi possível abrir o caixa. ${error.message}`); setAbrindo(false); return }
    setAbrindo(false); setShowAberturaModal(false); setAberturaValor(''); setAberturaObs(''); fetchAll()
  }

  async function confirmarFechamento() {
    setErro('')
    if (!aberturaDoDia) { setErro('Abra o caixa antes de fechar o dia.'); return }
    if (fechamentoDoDia) { setErro('Este dia já foi fechado.'); return }
    setFechando(true)
    const { error } = await supabase.from('fechamentos_caixa').insert([{ data: selectedDate, total_entradas: totalEntradas, total_saidas: totalSaidas, saldo: saldoDia, fechado_por: fechamentoPor, observacao: (fechamentoObs || '').trim() }])
    if (error) { setErro(`Não foi possível fechar o caixa. ${error.message}`); setFechando(false); return }
    setFechando(false); setShowFechamentoModal(false); setFechamentoObs(''); fetchAll()
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
        <div className="highlight-card"><p className="small-label black-label">Saldo do dia</p><h3>{formatMoney(saldoDia)}</h3></div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <p className="page-kicker orange-text">Painel empresarial</p>
            <h2>{activeSection === 'clientes' ? 'Cadastro de clientes' : activeSection === 'financeiro' ? 'Controle Financeiro da Ótica' : `Resumo do caixa • ${formatDate(selectedDate)}`}</h2>
          </div>
          <div className="date-card"><span>Data de trabalho</span><input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} /></div>
        </header>

        {erro ? <div className="error-box">{erro}</div> : null}

        {activeSection === 'clientes' ? (
          <>
            <section className="stats-grid client-stats-grid">
              <div className="stat-card"><span className="small-label neutral">Total de clientes</span><strong>{clientes.length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Exames lançados</span><strong>{exames.length}</strong></div>
              <div className="stat-card"><span className="small-label neutral">Financeiros lançados</span><strong>{financeiros.length}</strong></div>
              <div className="stat-card accent orange-accent"><span className="small-label light">Busca rápida</span><strong>{clientesFiltrados.length}</strong><p>registro(s) encontrados</p></div>
            </section>
            <section className="panel clientes-panel">
              <div className="panel-head clientes-head">
                <div><h3>Clientes cadastrados</h3><p>Clique no cliente para abrir a ficha com dados, exame e financeiro.</p></div>
                <div className="filters clientes-filters"><input placeholder="Buscar por código, nome, CPF, contato ou cidade" value={clienteBusca} onChange={(e) => setClienteBusca(e.target.value)} /><button type="button" className="primary-inline-btn" onClick={novoCliente}>Novo cliente</button></div>
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
            <section className="panel"><div className="panel-title-row"><h3>Fluxo do caixa</h3></div>{!aberturaDoDia ? <button className="secondary-compact-btn" type="button" onClick={() => setShowAberturaModal(true)}>Abrir caixa do dia</button> : fechamentoDoDia ? <div className="closed-info"><strong>Aberto por {aberturaDoDia.aberto_por}</strong><span>Fechado por {fechamentoDoDia.fechado_por} • saldo final {formatMoney(fechamentoDoDia.saldo)}</span></div> : <div className="compact-actions"><div className="opened-info"><strong>Caixa aberto por {aberturaDoDia.aberto_por}</strong><span>Valor inicial {formatMoney(aberturaDoDia.valor_inicial)}</span></div><button className="secondary-compact-btn" type="button" onClick={() => setShowFechamentoModal(true)}>Revisar e fechar o dia</button></div>}</section>
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
                <div className="panel-head list-head"><div><h3>Livro caixa</h3><p>O analítico mostra entradas e saídas do dia.</p></div><div className="filters"><input placeholder="Buscar" value={busca} onChange={(e) => setBusca(e.target.value)} /><select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}><option>Todos</option><option>Entrada</option><option>Saída</option></select><select value={filtroResponsavel} onChange={(e) => setFiltroResponsavel(e.target.value)}><option>Todos</option>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select><button type="button" className="secondary-btn" onClick={() => setShowAnaliticoModal(true)}>Analítico</button></div></div>
                <div className="sintetico-grid">
                  <article className="sintetico-card destaque"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : 0), 0))}</strong><p>{filtradosDoDia.filter((item) => item.tipo === 'Entrada').length} lançamento(s)</p></article>
                  <article className="sintetico-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Saída' ? Number(item.valor || 0) : 0), 0))}</strong><p>{filtradosDoDia.filter((item) => item.tipo === 'Saída').length} lançamento(s)</p></article>
                  <article className="sintetico-card"><span className="small-label neutral">Saldo filtrado do dia</span><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : -Number(item.valor || 0)), 0))}</strong><p>resumo conforme filtros</p></article>
                </div>
              </section>
            </section>
          </>
        ) : (
          <section className="panel resumo-panel"><div className="panel-title-row"><h3>Resumo do dia por responsável</h3></div><div className="responsavel-grid">{resumoPorResponsavel.map((item) => <div className="responsavel-card" key={item.nome}><div className="responsavel-top"><h4>{item.nome}</h4><span>{item.quantidade} lançamentos</span></div><div className="responsavel-values"><div><small>Entradas</small><strong className="in-text">{formatMoney(item.entradas)}</strong></div><div><small>Saídas</small><strong className="out-text">{formatMoney(item.saidas)}</strong></div></div><div className="responsavel-total"><small>Saldo</small><strong>{formatMoney(item.saldo)}</strong></div></div>)}</div></section>
        )}

        {showClienteModal ? (
          <div className="modal-overlay">
            <div className="modal-card client-modal-card">
              <div className="modal-head"><div><p className="page-kicker orange-text">Ficha do cliente</p><h3>{clienteForm.nome || 'Novo cliente'}</h3><p className="dark-text">Modelo pensado para ótica, com dados, exame e financeiro ligados ao cliente.</p></div><button type="button" className="modal-close" onClick={fecharModalCliente}>×</button></div>
              <div className="client-summary-grid">
                <div className="daily-metric compact"><small>Código</small><strong>{clienteForm.codigo || clienteForm.id || 'Novo'}</strong></div>
                <div className="daily-metric compact"><small>CPF</small><strong>{clienteForm.cpf || '-'}</strong></div>
                <div className="daily-metric compact"><small>Exames</small><strong>{clienteSelecionado ? examesDoCliente.length : 0}</strong></div>
                <div className="daily-metric compact"><small>Financeiro</small><strong>{formatMoney(clienteSelecionado ? totalFinanceiroCliente : 0)}</strong></div>
              </div>
              <div className="client-tabs">
                <button className={`tab-btn ${clienteTab === 'dados' ? 'active' : ''}`} onClick={() => setClienteTab('dados')}>Dados</button>
                <button className={`tab-btn ${clienteTab === 'exames' ? 'active' : ''}`} onClick={() => setClienteTab('exames')}>Exames</button>
                <button className={`tab-btn ${clienteTab === 'financeiro' ? 'active' : ''}`} onClick={() => setClienteTab('financeiro')}>Financeiro</button>
              </div>
              <div className="client-tab-content">
                {clienteTab === 'dados' ? (
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
                    <div className="modal-actions sticky-actions"><button type="button" className="secondary-btn" onClick={fecharModalCliente}>Fechar</button>{clienteSelecionado?.id ? <button type="button" className="danger-btn" onClick={excluirCliente} disabled={clienteExcluindo}>{clienteExcluindo ? 'Excluindo...' : 'Excluir cliente'}</button> : null}<button type="submit" className="primary-inline-btn" disabled={clienteSalvando}>{clienteSalvando ? 'Salvando...' : 'Salvar cliente'}</button></div>
                  </form>
                ) : clienteTab === 'exames' ? (
                  <div className="client-scroll-area">
                    <form className="panel nested-panel" onSubmit={salvarExame}>
                      <div className="panel-head"><div><h3>Lançar exame</h3><p>Monte a receita com OD e OE, lente, armação e observações.</p></div></div>
                      <div className="form-grid">
                        <label className="field"><span>Data</span><input type="date" value={exameForm.data_exame} onChange={(e) => updateExameField('data_exame', e.target.value)} /></label>
                        <label className="field"><span>Médico</span><input value={exameForm.medico} onChange={(e) => updateExameField('medico', e.target.value)} /></label>
                        <label className="field"><span>Vendedora</span><input value={exameForm.vendedora} onChange={(e) => updateExameField('vendedora', e.target.value)} /></label>
                        <label className="field"><span>OS</span><input value={exameForm.os} onChange={(e) => updateExameField('os', e.target.value)} /></label>
                        <label className="field"><span>Lente</span><input value={exameForm.lente} onChange={(e) => updateExameField('lente', e.target.value)} /></label>
                        <label className="field"><span>Armação</span><input value={exameForm.armacao} onChange={(e) => updateExameField('armacao', e.target.value)} /></label>
                        <label className="field"><span>Adição</span><input value={exameForm.adicao} onChange={(e) => updateExameField('adicao', e.target.value)} /></label>
                        <label className="field"><span>ALT.</span><input value={exameForm.alt} onChange={(e) => updateExameField('alt', e.target.value)} /></label>
                      </div>
                      <div className="rx-grid">
                        <div className="rx-card"><h4>OD</h4><div className="form-grid rx-inner-grid"><label className="field"><span>Esf</span><input value={exameForm.od_esf} onChange={(e) => updateExameField('od_esf', e.target.value)} /></label><label className="field"><span>CH</span><input value={exameForm.od_ch} onChange={(e) => updateExameField('od_ch', e.target.value)} /></label><label className="field"><span>Eixo</span><input value={exameForm.od_eixo} onChange={(e) => updateExameField('od_eixo', e.target.value)} /></label><label className="field"><span>DNP</span><input value={exameForm.od_dnp} onChange={(e) => updateExameField('od_dnp', e.target.value)} /></label></div></div>
                        <div className="rx-card"><h4>OE</h4><div className="form-grid rx-inner-grid"><label className="field"><span>Esf</span><input value={exameForm.oe_esf} onChange={(e) => updateExameField('oe_esf', e.target.value)} /></label><label className="field"><span>CH</span><input value={exameForm.oe_ch} onChange={(e) => updateExameField('oe_ch', e.target.value)} /></label><label className="field"><span>Eixo</span><input value={exameForm.oe_eixo} onChange={(e) => updateExameField('oe_eixo', e.target.value)} /></label><label className="field"><span>DNP</span><input value={exameForm.oe_dnp} onChange={(e) => updateExameField('oe_dnp', e.target.value)} /></label></div></div>
                      </div>
                      <label className="field field-full"><span>Observação</span><textarea rows="3" value={exameForm.observacao} onChange={(e) => updateExameField('observacao', e.target.value)} /></label>
                      <div className="modal-actions sticky-actions"><button type="button" className="secondary-btn" onClick={() => setExameForm(emptyExame())}>Limpar</button><button type="submit" className="primary-inline-btn" disabled={salvandoExame}>{salvandoExame ? 'Salvando...' : exameForm.id ? 'Salvar alteração do exame' : 'Adicionar exame'}</button></div>
                    </form>
                    <div className="stack-list">{examesDoCliente.length === 0 ? <div className="empty-state">Nenhum exame lançado para este cliente.</div> : examesDoCliente.map((item) => <article key={item.id} className="record-sheet"><div className="record-sheet-head"><div><h4>Exame • {formatDate(item.data_exame)}</h4><p>{item.medico || 'Sem médico'} • {item.vendedora || 'Sem vendedora'}</p></div><div className="row-actions"><button className="secondary-compact-btn" type="button" onClick={() => editarExame(item)}>Alterar</button><button className="danger-ghost-btn" type="button" onClick={() => excluirExame(item.id)}>Excluir</button></div></div><div className="sheet-grid"><div><small>OD</small><strong>{item.od_esf || '-'} / {item.od_ch || '-'} / {item.od_eixo || '-'} / {item.od_dnp || '-'}</strong></div><div><small>OE</small><strong>{item.oe_esf || '-'} / {item.oe_ch || '-'} / {item.oe_eixo || '-'} / {item.oe_dnp || '-'}</strong></div><div><small>Lente</small><strong>{item.lente || '-'}</strong></div><div><small>Armação</small><strong>{item.armacao || '-'}</strong></div><div><small>Adição / ALT</small><strong>{item.adicao || '-'} / {item.alt || '-'}</strong></div><div><small>OS</small><strong>{item.os || '-'}</strong></div></div>{item.observacao ? <p className="sheet-note">{item.observacao}</p> : null}</article>)}</div>
                  </div>
                ) : (
                  <div className="client-scroll-area">
                    <div className="client-summary-grid">
                      <div className="daily-metric compact"><small>Total lançado</small><strong>{formatMoney(totalFinanceiroCliente)}</strong></div>
                      <div className="daily-metric compact"><small>Total recebido</small><strong className="in-text">{formatMoney(totalRecebidoCliente)}</strong></div>
                      <div className="daily-metric compact"><small>Saldo aberto</small><strong className="out-text">{formatMoney(saldoFinanceiroCliente)}</strong></div>
                      <div className="daily-metric compact"><small>Parcelas</small><strong>{financeiroDoCliente.length}</strong></div>
                    </div>
                    <form className="panel nested-panel" onSubmit={salvarFinanceiro}>
                      <div className="panel-head"><div><h3>Financeiro do cliente</h3><p>Carnê repete as parcelas. Cartão de crédito fica em uma linha só, mesmo com quantidade de parcelas informada.</p></div></div>
                      <div className="form-grid">
                        <label className="field"><span>Emissão</span><input type="date" value={financeiroForm.emissao} onChange={(e) => updateFinanceiroField('emissao', e.target.value)} /></label>
                        <label className="field"><span>Duplicata / descrição</span><input value={financeiroForm.duplicata} onChange={(e) => updateFinanceiroField('duplicata', e.target.value)} placeholder="Ex.: Carnê, Cartão 6x, Entrada" /></label>
                        <label className="field"><span>Tipo de cobrança</span><select value={financeiroForm.tipo_cobranca} onChange={(e) => updateFinanceiroField('tipo_cobranca', e.target.value)}><option value="carne">Carnê</option><option value="cartao_credito">Cartão de crédito</option><option value="avista">À vista</option><option value="pix">Pix</option><option value="boleto">Boleto</option></select></label>
                        <label className="field"><span>Qtd. parcelas</span><input type="number" min="1" value={financeiroForm.quantidade_parcelas} onChange={(e) => updateFinanceiroField('quantidade_parcelas', e.target.value)} /></label>
                        <label className="field"><span>Vencimento inicial</span><input type="date" value={financeiroForm.vencimento} onChange={(e) => updateFinanceiroField('vencimento', e.target.value)} /></label>
                        <label className="field"><span>Valor total</span><input value={financeiroForm.valor_total} onChange={(e) => updateFinanceiroField('valor_total', e.target.value)} /></label>
                        <label className="field"><span>Valor quitado</span><input value={financeiroForm.valor_quitado} onChange={(e) => updateFinanceiroField('valor_quitado', e.target.value)} /></label>
                        <label className="field"><span>Data de pagamento</span><input type="date" value={financeiroForm.data_pagamento} onChange={(e) => updateFinanceiroField('data_pagamento', e.target.value)} /></label>
                        <label className="field"><span>Forma de pagamento</span><input value={financeiroForm.forma_pagamento} onChange={(e) => updateFinanceiroField('forma_pagamento', e.target.value)} placeholder="Ex.: Pix, Dinheiro, Cartão" /></label>
                        <label className="field"><span>Status</span><select value={financeiroForm.status} onChange={(e) => updateFinanceiroField('status', e.target.value)}><option>Em aberto</option><option>Pago</option><option>Parcial</option></select></label>
                        <label className="field field-full"><span>Observação</span><textarea rows="3" value={financeiroForm.observacao} onChange={(e) => updateFinanceiroField('observacao', e.target.value)} /></label>
                      </div>
                      <div className="modal-actions sticky-actions"><button type="button" className="secondary-btn" onClick={() => setFinanceiroForm(emptyFinanceiro())}>Limpar</button><button type="submit" className="primary-inline-btn" disabled={salvandoFinanceiro}>{salvandoFinanceiro ? 'Salvando...' : financeiroForm.id ? 'Salvar alteração do financeiro' : 'Adicionar financeiro'}</button></div>
                    </form>
                    <div className="panel nested-panel">
                      <div className="panel-head"><div><h3>Ficha financeira</h3><p>Modelo em tabela para dar baixa nas parcelas, parecido com a ficha da ótica.</p></div></div>
                      {financeiroDoCliente.length === 0 ? <div className="empty-state">Nenhum lançamento financeiro para este cliente.</div> : (
                        <div className="financeiro-table-wrap">
                          <div className="financeiro-table">
                            <div className="financeiro-row financeiro-head-row">
                              <strong>Emissão</strong>
                              <strong>Duplicata</strong>
                              <strong>Parcela</strong>
                              <strong>Vencimento</strong>
                              <strong>Valor</strong>
                              <strong>Data pgto</strong>
                              <strong>Baixa</strong>
                              <strong>Status</strong>
                            </div>
                            {financeiroDoCliente.map((item) => {
                              const pago = Number(item.valor_quitado || 0) >= Number(item.valor_total || 0) && Number(item.valor_total || 0) > 0
                              const parcelaLabel = item.tipo_cobranca === 'carne' ? `${item.numero_parcela || 1}/${item.quantidade_parcelas || 1}` : `${item.quantidade_parcelas || 1}x`
                              return (
                                <div key={item.id} className="financeiro-row">
                                  <span>{formatDate(item.emissao)}</span>
                                  <span>{item.duplicata || '-'}</span>
                                  <span>{parcelaLabel}</span>
                                  <span>{formatDate(item.vencimento)}</span>
                                  <span>{formatMoney(item.valor_total)}</span>
                                  <span>{formatDate(item.data_pagamento)}</span>
                                  <span className="row-actions">
                                    {pago ? <button className="secondary-compact-btn" type="button" onClick={() => removerBaixaFinanceiro(item)}>Reabrir</button> : <button className="primary-inline-btn" type="button" onClick={() => registrarBaixaFinanceiro(item)}>Dar baixa</button>}
                                  </span>
                                  <span><span className={`pill ${pago ? 'in' : 'out'}`}>{item.status || (pago ? 'Pago' : 'Em aberto')}</span></span>
                                  <span className="financeiro-actions">
                                    <button className="secondary-compact-btn" type="button" onClick={() => editarFinanceiro(item)}>Alterar</button>
                                    <button className="danger-ghost-btn" type="button" onClick={() => excluirFinanceiro(item.id)}>Excluir</button>
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {showAberturaModal ? <div className="modal-overlay"><div className="modal-card"><div className="modal-head"><div><p className="page-kicker orange-text">Início do expediente</p><h3>Abrir caixa de {formatDate(selectedDate)}</h3></div><button type="button" className="modal-close" onClick={() => setShowAberturaModal(false)}>×</button></div><div className="form-grid modal-form"><label className="field"><span>Responsável pela abertura</span><select value={aberturaPor} onChange={(e) => setAberturaPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field"><span>Valor inicial do caixa</span><input value={aberturaValor} onChange={(e) => setAberturaValor(e.target.value)} placeholder="Ex.: 200,00" /></label><label className="field field-full"><span>Observação da abertura</span><textarea rows="3" value={aberturaObs} onChange={(e) => setAberturaObs(e.target.value)} /></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowAberturaModal(false)}>Cancelar</button><button type="button" className="primary-inline-btn" onClick={confirmarAbertura} disabled={abrindo}>{abrindo ? 'Abrindo...' : 'Confirmar abertura'}</button></div></div></div> : null}
        {showFechamentoModal ? <div className="modal-overlay"><div className="modal-card"><div className="modal-head"><div><p className="page-kicker orange-text">Conferência final</p><h3>Fechar caixa de {formatDate(selectedDate)}</h3></div><button type="button" className="modal-close" onClick={() => setShowFechamentoModal(false)}>×</button></div><div className="modal-summary"><div className="daily-metric"><small>Inicial</small><strong>{formatMoney(valorInicialDia)}</strong></div><div className="daily-metric"><small>Entradas</small><strong className="in-text">{formatMoney(totalEntradas)}</strong></div><div className="daily-metric"><small>Saídas</small><strong className="out-text">{formatMoney(totalSaidas)}</strong></div><div className="daily-metric"><small>Saldo</small><strong>{formatMoney(saldoDia)}</strong></div></div><div className="form-grid modal-form"><label className="field"><span>Responsável pelo fechamento</span><select value={fechamentoPor} onChange={(e) => setFechamentoPor(e.target.value)}>{responsaveis.map((item) => <option key={item}>{item}</option>)}</select></label><label className="field field-full"><span>Observação do fechamento</span><textarea rows="3" value={fechamentoObs} onChange={(e) => setFechamentoObs(e.target.value)} /></label></div><div className="modal-actions"><button type="button" className="secondary-btn" onClick={() => setShowFechamentoModal(false)}>Cancelar</button><button type="button" className="primary-inline-btn" onClick={confirmarFechamento} disabled={fechando}>{fechando ? 'Fechando...' : 'Confirmar fechamento'}</button></div></div></div> : null}
        {showAnaliticoModal ? <div className="modal-overlay"><div className="modal-card analitico-modal-card"><div className="modal-head"><div><p className="page-kicker orange-text">Visão detalhada</p><h3>Analítico do caixa • {formatDate(selectedDate)}</h3><p className="dark-text">Entradas e saídas do dia, respeitando os filtros.</p></div><button type="button" className="modal-close" onClick={() => setShowAnaliticoModal(false)}>×</button></div><div className="analitico-topbar"><div className="daily-metric compact"><small>Total de lançamentos</small><strong>{filtradosDoDia.length}</strong></div><div className="daily-metric compact"><small>Saldo do dia filtrado</small><strong>{formatMoney(filtradosDoDia.reduce((acc, item) => acc + (item.tipo === 'Entrada' ? Number(item.valor || 0) : -Number(item.valor || 0)), 0))}</strong></div></div><div className="analitico-scroll-area">{filtradosDoDia.length === 0 ? <div className="empty-state">Nenhum lançamento encontrado para este dia.</div> : filtradosDoDia.map((item) => <article className="launch-card" key={item.id}><div className="launch-top"><div><div className="launch-title">{item.descricao}</div><div className="launch-meta">{formatDate(item.data)} • {item.categoria} • {item.forma}</div></div><div className={`pill ${item.tipo === 'Entrada' ? 'in' : 'out'}`}>{item.tipo}</div></div><div className="launch-bottom"><div><div className="launch-value">{formatMoney(item.valor)}</div><div className="launch-note">{item.observacao || 'Sem observação'} • Lançado por: {item.responsavel}</div></div></div></article>)}</div><div className="modal-actions sticky-actions"><button type="button" className="secondary-btn" onClick={() => setShowAnaliticoModal(false)}>Fechar</button></div></div></div> : null}
      </main>
    </div>
  )
}
