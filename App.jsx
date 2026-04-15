import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE', 'AIUMA', 'APARECIDA']
const categorias = ['Venda', 'Serviço', 'Fornecedor', 'Despesa Fixa', 'Aluguel', 'Energia', 'Internet', 'Funcionário', 'Retirada', 'Outros']
const formas = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Débito', 'Crédito']
const tiposPessoa = ['Física', 'Jurídica']

function formatMoney(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value) || 0)
}

function formatDate(date) {
  if (!date) return '-'
  const [y, m, d] = String(date).split('-')
  if (!y || !m || !d) return date
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
    nome_fantasia: '',
    cpf_cnpj: '',
    tipo_pessoa: 'Física',
    ativo: true,
    status: 'Ativo',
    telefone: '',
    celular: '',
    whatsapp: '',
    email: '',
    email_nfe: '',
    homepage: '',
    contato: '',
    operador: '',
    endereco: '',
    numero: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    complemento: '',
    inscricao_estadual: '',
    inscricao_municipal: '',
    indicador_inscricao: '',
    observacao: ''
  }
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '')
}

function formatCpfCnpj(value) {
  const digits = onlyDigits(value)
  if (digits.length <= 11) {
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
}

function formatPhone(value) {
  const digits = onlyDigits(value).slice(0, 11)
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
}

function formatCep(value) {
  const digits = onlyDigits(value).slice(0, 8)
  return digits.replace(/(\d{5})(\d)/, '$1-$2')
}

function Sidebar({ activePage, setActivePage, saldo }) {
  return (
    <aside className="sidebar">
      <div className="brand-card">
        <p className="tag">Sistema interno</p>
        <h1>Óticas Fácil</h1>
        <p className="muted">Cadastro de clientes e controle financeiro com visual moderno.</p>
      </div>

      <div className="menu-card">
        <button type="button" className={`menu-item ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}>
          Dashboard Financeiro
        </button>
        <button type="button" className={`menu-item ${activePage === 'clientes' ? 'active' : ''}`} onClick={() => setActivePage('clientes')}>
          Clientes
        </button>
        <button type="button" className={`menu-item ${activePage === 'livro' ? 'active' : ''}`} onClick={() => setActivePage('livro')}>
          Livro Caixa
        </button>
      </div>

      <div className="highlight-card">
        <p className="small-label">Saldo geral</p>
        <h3>{formatMoney(saldo)}</h3>
      </div>
    </aside>
  )
}

function DashboardPage({
  selectedDate,
  setSelectedDate,
  erro,
  statusDia,
  valorInicialDia,
  entradasDia,
  saidasDia,
  saldoDia,
  aberturaDoDia,
  fechamentoDoDia,
  setShowAberturaModal,
  setShowFechamentoModal,
  submitForm,
  form,
  updateField,
  salvando,
  loading,
  busca,
  setBusca,
  filtroTipo,
  setFiltroTipo,
  filtroResponsavel,
  setFiltroResponsavel,
  sinteseDoDia,
  totalVendasDoDia,
  vendasEntradaDoDia,
  setShowAnaliticoModal,
  resumoPorResponsavel
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="page-kicker">Painel empresarial</p>
          <h2>Controle Financeiro da Ótica</h2>
        </div>

        <div className="date-card">
          <span>Data de trabalho</span>
          <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </header>

      {erro ? <div className="error-box">{erro}</div> : null}

      <section className="stats-grid fade-in">
        <div className="stat-card"><span className="small-label neutral">Valor inicial</span><strong>{formatMoney(valorInicialDia)}</strong></div>
        <div className="stat-card"><span className="small-label neutral">Entradas do dia</span><strong>{formatMoney(entradasDia)}</strong></div>
        <div className="stat-card"><span className="small-label neutral">Saídas do dia</span><strong>{formatMoney(saidasDia)}</strong></div>
        <div className="stat-card accent"><span className="small-label light">Status / Saldo</span><strong>{statusDia}</strong><p>{formatMoney(saldoDia)}</p></div>
      </section>

      <section className="panel fade-in">
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

      <section className="main-grid fade-in">
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

      <section className="panel resumo-panel fade-in">
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
  )
}

function ClientesPage({
  erroClientes,
  loadingClientes,
  clientes,
  buscaCliente,
  setBuscaCliente,
  tipoFiltroCliente,
  setTipoFiltroCliente,
  statusFiltroCliente,
  setStatusFiltroCliente,
  clienteForm,
  setClienteForm,
  salvarCliente,
  salvandoCliente,
  abrirVisualizacaoCliente
}) {
  const clientesFiltrados = useMemo(() => {
    return clientes.filter((cliente) => {
      const texto = `${cliente.codigo || ''} ${cliente.nome || ''} ${cliente.nome_fantasia || ''} ${cliente.cpf_cnpj || ''} ${cliente.cidade || ''} ${cliente.telefone || ''} ${cliente.celular || ''}`.toLowerCase()
      const matchBusca = texto.includes(buscaCliente.toLowerCase())
      const matchTipo = tipoFiltroCliente === 'Todos' || cliente.tipo_pessoa === tipoFiltroCliente
      const matchStatus = statusFiltroCliente === 'Todos' || (statusFiltroCliente === 'Ativo' ? cliente.ativo : !cliente.ativo)
      return matchBusca && matchTipo && matchStatus
    })
  }, [clientes, buscaCliente, tipoFiltroCliente, statusFiltroCliente])

  const totalAtivos = clientes.filter((item) => item.ativo).length

  function updateClienteField(field, value) {
    setClienteForm((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <>
      <header className="topbar">
        <div>
          <p className="page-kicker">Cadastro de pessoas</p>
          <h2>Clientes</h2>
          <p className="section-subtitle">Busca moderna com visualização compacta sobreposta no estilo do modelo enviado.</p>
        </div>
      </header>

      {erroClientes ? <div className="error-box">{erroClientes}</div> : null}

      <section className="stats-grid fade-in clients-stats-grid">
        <div className="stat-card"><span className="small-label neutral">Total de clientes</span><strong>{clientes.length}</strong></div>
        <div className="stat-card"><span className="small-label neutral">Ativos</span><strong>{totalAtivos}</strong></div>
        <div className="stat-card"><span className="small-label neutral">Pessoa física</span><strong>{clientes.filter((item) => item.tipo_pessoa === 'Física').length}</strong></div>
        <div className="stat-card accent"><span className="small-label light">Pessoa jurídica</span><strong>{clientes.filter((item) => item.tipo_pessoa === 'Jurídica').length}</strong><p>Visualização rápida disponível</p></div>
      </section>

      <section className="main-grid clients-main-grid fade-in">
        <section className="panel form-panel">
          <div className="panel-head">
            <div>
              <h3>Novo cliente</h3>
              <p>O código do cliente é gerado pelo banco, sem mostrar “gerado automaticamente”.</p>
            </div>
          </div>

          <div className="client-form-shell">
            <div className="client-form-header compact-delphi-header">
              <div className="client-row-4">
                <label className="field compact"><span>Código</span><input value="" placeholder="" disabled /></label>
                <label className="field compact"><span>CPF/CNPJ</span><input value={clienteForm.cpf_cnpj} onChange={(e) => updateClienteField('cpf_cnpj', formatCpfCnpj(e.target.value))} /></label>
                <label className="field compact"><span>Status</span><input value={clienteForm.ativo ? 'Ativo' : 'Inativo'} disabled /></label>
                <label className="field compact"><span>Tipo</span><select value={clienteForm.tipo_pessoa} onChange={(e) => updateClienteField('tipo_pessoa', e.target.value)}>{tiposPessoa.map((tipo) => <option key={tipo}>{tipo}</option>)}</select></label>
              </div>

              <div className="client-row-2">
                <label className="field compact"><span>Nome</span><input value={clienteForm.nome} onChange={(e) => updateClienteField('nome', e.target.value)} /></label>
                <label className="field compact"><span>Nome fantasia</span><input value={clienteForm.nome_fantasia} onChange={(e) => updateClienteField('nome_fantasia', e.target.value)} /></label>
              </div>
            </div>

            <div className="client-tabs-inline">
              <span className="client-tab active">Dados</span>
              <span className="client-tab">Endereço</span>
              <span className="client-tab">Obs.</span>
            </div>

            <div className="client-form-grid">
              <label className="field compact"><span>Indicador de inscrição</span><input value={clienteForm.indicador_inscricao} onChange={(e) => updateClienteField('indicador_inscricao', e.target.value)} /></label>
              <label className="field compact"><span>Inscrição estadual</span><input value={clienteForm.inscricao_estadual} onChange={(e) => updateClienteField('inscricao_estadual', e.target.value)} /></label>
              <label className="field compact"><span>Inscrição municipal</span><input value={clienteForm.inscricao_municipal} onChange={(e) => updateClienteField('inscricao_municipal', e.target.value)} /></label>
              <label className="field compact"><span>Contato</span><input value={clienteForm.contato} onChange={(e) => updateClienteField('contato', e.target.value)} /></label>
              <label className="field compact"><span>Telefone</span><input value={clienteForm.telefone} onChange={(e) => updateClienteField('telefone', formatPhone(e.target.value))} /></label>
              <label className="field compact"><span>Celular</span><input value={clienteForm.celular} onChange={(e) => updateClienteField('celular', formatPhone(e.target.value))} /></label>
              <label className="field compact"><span>WhatsApp</span><input value={clienteForm.whatsapp} onChange={(e) => updateClienteField('whatsapp', formatPhone(e.target.value))} /></label>
              <label className="field compact"><span>Operador</span><input value={clienteForm.operador} onChange={(e) => updateClienteField('operador', e.target.value)} /></label>
              <label className="field compact"><span>Email</span><input value={clienteForm.email} onChange={(e) => updateClienteField('email', e.target.value)} /></label>
              <label className="field compact"><span>Email NFe</span><input value={clienteForm.email_nfe} onChange={(e) => updateClienteField('email_nfe', e.target.value)} /></label>
              <label className="field compact"><span>Home page</span><input value={clienteForm.homepage} onChange={(e) => updateClienteField('homepage', e.target.value)} /></label>
              <label className="field compact"><span>CEP</span><input value={clienteForm.cep} onChange={(e) => updateClienteField('cep', formatCep(e.target.value))} /></label>
              <label className="field compact"><span>Endereço</span><input value={clienteForm.endereco} onChange={(e) => updateClienteField('endereco', e.target.value)} /></label>
              <label className="field compact"><span>Número</span><input value={clienteForm.numero} onChange={(e) => updateClienteField('numero', e.target.value)} /></label>
              <label className="field compact"><span>Bairro</span><input value={clienteForm.bairro} onChange={(e) => updateClienteField('bairro', e.target.value)} /></label>
              <label className="field compact"><span>Cidade</span><input value={clienteForm.cidade} onChange={(e) => updateClienteField('cidade', e.target.value)} /></label>
              <label className="field compact"><span>UF</span><input value={clienteForm.uf} onChange={(e) => updateClienteField('uf', e.target.value.toUpperCase().slice(0, 2))} /></label>
              <label className="field compact"><span>Complemento</span><input value={clienteForm.complemento} onChange={(e) => updateClienteField('complemento', e.target.value)} /></label>
              <label className="field compact field-full"><span>Observação</span><textarea rows="3" value={clienteForm.observacao} onChange={(e) => updateClienteField('observacao', e.target.value)} /></label>
            </div>
          </div>

          <button className="primary-btn" type="button" onClick={salvarCliente} disabled={salvandoCliente}>{salvandoCliente ? 'Salvando cliente...' : 'Salvar cliente'}</button>
        </section>

        <section className="panel list-panel">
          <div className="panel-head list-head">
            <div>
              <h3>Busca de clientes</h3>
              <p>Ao clicar em um cliente, abre uma janela menor sobreposta com todos os dados do cadastro.</p>
            </div>
            <div className="filters">
              <input placeholder="Buscar por nome, código, CPF/CNPJ ou cidade" value={buscaCliente} onChange={(e) => setBuscaCliente(e.target.value)} />
              <select value={tipoFiltroCliente} onChange={(e) => setTipoFiltroCliente(e.target.value)}>
                <option>Todos</option>
                {tiposPessoa.map((tipo) => <option key={tipo}>{tipo}</option>)}
              </select>
              <select value={statusFiltroCliente} onChange={(e) => setStatusFiltroCliente(e.target.value)}>
                <option>Todos</option>
                <option>Ativo</option>
                <option>Inativo</option>
              </select>
            </div>
          </div>

          {loadingClientes ? (
            <div className="empty-state">Carregando clientes do banco...</div>
          ) : clientesFiltrados.length === 0 ? (
            <div className="empty-state">Nenhum cliente encontrado.</div>
          ) : (
            <div className="clientes-lista-scroll">
              {clientesFiltrados.map((cliente) => (
                <button type="button" className="cliente-card-button" key={cliente.id} onClick={() => abrirVisualizacaoCliente(cliente)}>
                  <article className="cliente-card-modern">
                    <div className="cliente-card-top">
                      <div>
                        <div className="cliente-codigo">Código {cliente.codigo || cliente.id}</div>
                        <h4>{cliente.nome || 'Sem nome'}</h4>
                        <p>{cliente.nome_fantasia || 'Sem nome fantasia'}</p>
                      </div>
                      <div className={`status-badge ${cliente.ativo ? 'on' : 'off'}`}>{cliente.ativo ? 'Ativo' : 'Inativo'}</div>
                    </div>
                    <div className="cliente-card-info-grid">
                      <div><small>CPF/CNPJ</small><strong>{cliente.cpf_cnpj || '-'}</strong></div>
                      <div><small>Tipo</small><strong>{cliente.tipo_pessoa || '-'}</strong></div>
                      <div><small>Telefone</small><strong>{cliente.telefone || cliente.celular || '-'}</strong></div>
                      <div><small>Cidade</small><strong>{cliente.cidade || '-'}</strong></div>
                    </div>
                  </article>
                </button>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  )
}

function ClienteVisualizacaoModal({ cliente, onClose }) {
  if (!cliente) return null

  return (
    <div className="modal-overlay">
      <div className="modal-card cliente-modal-card fade-in-scale">
        <div className="modal-head">
          <div>
            <p className="page-kicker">Cadastro de pessoas</p>
            <h3>Visualização do cliente</h3>
            <p className="dark-text">Janela compacta, inspirada no modelo enviado, com todos os dados cadastrados.</p>
          </div>
          <button type="button" className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="cliente-visual-shell">
          <div className="cliente-visual-header compact-delphi-header">
            <div className="client-row-4">
              <label className="field compact"><span>Código</span><input value={cliente.codigo || cliente.id || ''} disabled /></label>
              <label className="field compact"><span>CPF/CNPJ</span><input value={cliente.cpf_cnpj || ''} disabled /></label>
              <label className="field compact"><span>Status</span><input value={cliente.ativo ? 'Ativo' : 'Inativo'} disabled /></label>
              <label className="field compact"><span>Tipo</span><input value={cliente.tipo_pessoa || ''} disabled /></label>
            </div>

            <div className="client-row-2">
              <label className="field compact"><span>Nome</span><input value={cliente.nome || ''} disabled /></label>
              <label className="field compact"><span>Nome fantasia</span><input value={cliente.nome_fantasia || ''} disabled /></label>
            </div>
          </div>

          <div className="client-tabs-inline">
            <span className="client-tab active">Dados</span>
            <span className="client-tab">Endereço</span>
            <span className="client-tab">Contato</span>
          </div>

          <div className="cliente-visual-scroll">
            <div className="client-form-grid read-only-grid">
              <label className="field compact"><span>Indicador de inscrição</span><input value={cliente.indicador_inscricao || ''} disabled /></label>
              <label className="field compact"><span>Inscrição estadual</span><input value={cliente.inscricao_estadual || ''} disabled /></label>
              <label className="field compact"><span>Inscrição municipal</span><input value={cliente.inscricao_municipal || ''} disabled /></label>
              <label className="field compact"><span>Contato</span><input value={cliente.contato || ''} disabled /></label>
              <label className="field compact"><span>Telefone</span><input value={cliente.telefone || ''} disabled /></label>
              <label className="field compact"><span>Celular</span><input value={cliente.celular || ''} disabled /></label>
              <label className="field compact"><span>WhatsApp</span><input value={cliente.whatsapp || ''} disabled /></label>
              <label className="field compact"><span>Operador</span><input value={cliente.operador || ''} disabled /></label>
              <label className="field compact"><span>Email</span><input value={cliente.email || ''} disabled /></label>
              <label className="field compact"><span>Email NFe</span><input value={cliente.email_nfe || ''} disabled /></label>
              <label className="field compact"><span>Home page</span><input value={cliente.homepage || ''} disabled /></label>
              <label className="field compact"><span>CEP</span><input value={cliente.cep || ''} disabled /></label>
              <label className="field compact"><span>Endereço</span><input value={cliente.endereco || ''} disabled /></label>
              <label className="field compact"><span>Número</span><input value={cliente.numero || ''} disabled /></label>
              <label className="field compact"><span>Bairro</span><input value={cliente.bairro || ''} disabled /></label>
              <label className="field compact"><span>Cidade</span><input value={cliente.cidade || ''} disabled /></label>
              <label className="field compact"><span>UF</span><input value={cliente.uf || ''} disabled /></label>
              <label className="field compact"><span>Complemento</span><input value={cliente.complemento || ''} disabled /></label>
              <label className="field compact field-full"><span>Observação</span><textarea rows="3" value={cliente.observacao || ''} disabled /></label>
            </div>
          </div>
        </div>

        <div className="modal-actions sticky-actions">
          <button type="button" className="secondary-btn" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const hoje = getTodayLocal()

  const [activePage, setActivePage] = useState('clientes')
  const [selectedDate, setSelectedDate] = useState(hoje)
  const [form, setForm] = useState(emptyForm(hoje))
  const [clienteForm, setClienteForm] = useState(emptyClienteForm())
  const [lancamentos, setLancamentos] = useState([])
  const [aberturas, setAberturas] = useState([])
  const [fechamentos, setFechamentos] = useState([])
  const [clientes, setClientes] = useState([])
  const [erro, setErro] = useState('')
  const [erroClientes, setErroClientes] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingClientes, setLoadingClientes] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [salvandoCliente, setSalvandoCliente] = useState(false)
  const [abrindo, setAbrindo] = useState(false)
  const [fechando, setFechando] = useState(false)
  const [busca, setBusca] = useState('')
  const [buscaCliente, setBuscaCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('Todos')
  const [filtroResponsavel, setFiltroResponsavel] = useState('Todos')
  const [tipoFiltroCliente, setTipoFiltroCliente] = useState('Todos')
  const [statusFiltroCliente, setStatusFiltroCliente] = useState('Todos')
  const [showAberturaModal, setShowAberturaModal] = useState(false)
  const [showFechamentoModal, setShowFechamentoModal] = useState(false)
  const [showAnaliticoModal, setShowAnaliticoModal] = useState(false)
  const [showClienteModal, setShowClienteModal] = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState(null)
  const [aberturaPor, setAberturaPor] = useState('MEIRE')
  const [aberturaValor, setAberturaValor] = useState('')
  const [aberturaObs, setAberturaObs] = useState('')
  const [fechamentoPor, setFechamentoPor] = useState('MEIRE')
  const [fechamentoObs, setFechamentoObs] = useState('')

  useEffect(() => {
    fetchAll()
    fetchClientes()

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

  async function fetchClientes() {
    setLoadingClientes(true)
    setErroClientes('')

    const { data, error } = await supabase.from('clientes').select('*').order('codigo', { ascending: true, nullsFirst: false }).order('id', { ascending: true })

    if (error) {
      setErroClientes(`Não foi possível carregar os clientes. ${error.message}`)
      setLoadingClientes(false)
      return
    }

    setClientes(data || [])
    setLoadingClientes(false)
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

  const filtradosDoDia = useMemo(() => {
    return filtrados.filter((item) => item.data === selectedDate)
  }, [filtrados, selectedDate])

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

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
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

  async function salvarCliente() {
    setErroClientes('')
    setSalvandoCliente(true)

    if (!clienteForm.nome.trim()) {
      setErroClientes('Informe pelo menos o nome do cliente.')
      setSalvandoCliente(false)
      return
    }

    const payload = {
      nome: clienteForm.nome.trim(),
      nome_fantasia: clienteForm.nome_fantasia.trim(),
      cpf_cnpj: clienteForm.cpf_cnpj.trim(),
      tipo_pessoa: clienteForm.tipo_pessoa,
      ativo: clienteForm.ativo,
      status: clienteForm.ativo ? 'Ativo' : 'Inativo',
      telefone: clienteForm.telefone.trim(),
      celular: clienteForm.celular.trim(),
      whatsapp: clienteForm.whatsapp.trim(),
      email: clienteForm.email.trim(),
      email_nfe: clienteForm.email_nfe.trim(),
      homepage: clienteForm.homepage.trim(),
      contato: clienteForm.contato.trim(),
      operador: clienteForm.operador.trim(),
      endereco: clienteForm.endereco.trim(),
      numero: clienteForm.numero.trim(),
      bairro: clienteForm.bairro.trim(),
      cidade: clienteForm.cidade.trim(),
      uf: clienteForm.uf.trim(),
      cep: clienteForm.cep.trim(),
      complemento: clienteForm.complemento.trim(),
      inscricao_estadual: clienteForm.inscricao_estadual.trim(),
      inscricao_municipal: clienteForm.inscricao_municipal.trim(),
      indicador_inscricao: clienteForm.indicador_inscricao.trim(),
      observacao: clienteForm.observacao.trim()
    }

    const { error } = await supabase.from('clientes').insert([payload])

    if (error) {
      setErroClientes(`Não foi possível salvar o cliente. ${error.message}`)
      setSalvandoCliente(false)
      return
    }

    setClienteForm(emptyClienteForm())
    setSalvandoCliente(false)
    fetchClientes()
  }

  function abrirVisualizacaoCliente(cliente) {
    setClienteSelecionado(cliente)
    setShowClienteModal(true)
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
      <Sidebar activePage={activePage} setActivePage={setActivePage} saldo={saldo} />

      <main className="content">
        <div className="page-transition" key={activePage}>
          {activePage === 'clientes' ? (
            <ClientesPage
              erroClientes={erroClientes}
              loadingClientes={loadingClientes}
              clientes={clientes}
              buscaCliente={buscaCliente}
              setBuscaCliente={setBuscaCliente}
              tipoFiltroCliente={tipoFiltroCliente}
              setTipoFiltroCliente={setTipoFiltroCliente}
              statusFiltroCliente={statusFiltroCliente}
              setStatusFiltroCliente={setStatusFiltroCliente}
              clienteForm={clienteForm}
              setClienteForm={setClienteForm}
              salvarCliente={salvarCliente}
              salvandoCliente={salvandoCliente}
              abrirVisualizacaoCliente={abrirVisualizacaoCliente}
            />
          ) : (
            <DashboardPage
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              erro={erro}
              statusDia={statusDia}
              valorInicialDia={valorInicialDia}
              entradasDia={entradasDia}
              saidasDia={saidasDia}
              saldoDia={saldoDia}
              aberturaDoDia={aberturaDoDia}
              fechamentoDoDia={fechamentoDoDia}
              setShowAberturaModal={setShowAberturaModal}
              setShowFechamentoModal={setShowFechamentoModal}
              submitForm={submitForm}
              form={form}
              updateField={updateField}
              salvando={salvando}
              loading={loading}
              busca={busca}
              setBusca={setBusca}
              filtroTipo={filtroTipo}
              setFiltroTipo={setFiltroTipo}
              filtroResponsavel={filtroResponsavel}
              setFiltroResponsavel={setFiltroResponsavel}
              sinteseDoDia={sinteseDoDia}
              totalVendasDoDia={totalVendasDoDia}
              vendasEntradaDoDia={vendasEntradaDoDia}
              setShowAnaliticoModal={setShowAnaliticoModal}
              resumoPorResponsavel={resumoPorResponsavel}
            />
          )}
        </div>

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

        {showClienteModal ? (
          <ClienteVisualizacaoModal cliente={clienteSelecionado} onClose={() => setShowClienteModal(false)} />
        ) : null}
      </main>
    </div>
  )
}
