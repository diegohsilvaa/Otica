import { useEffect, useMemo, useState } from 'react'
import { supabase } from './supabase'

const responsaveis = ['MEIRE','AIUMA','APARECIDA']
const categorias = ['Venda','Serviço','Fornecedor','Despesa Fixa','Aluguel','Energia','Internet','Funcionário','Retirada','Outros']
const formas = ['Pix','Dinheiro','Cartão','Transferência','Débito','Crédito']

const money = (v)=> new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(Number(v)||0)
const fmt = (d)=> d? d.split('-').reverse().join('/'):'-'
const todayLocal = ()=>{
  const n=new Date(); const y=n.getFullYear(); const m=String(n.getMonth()+1).padStart(2,'0'); const d=String(n.getDate()).padStart(2,'0');
  return `${y}-${m}-${d}`
}
const emptyForm=(date)=>({data:date||todayLocal(),descricao:'',categoria:'Venda',tipo:'Entrada',forma:'Pix',valor:'',observacao:'',responsavel:'MEIRE'})

export default function App(){
  const hoje = todayLocal()
  const [selectedDate,setSelectedDate]=useState(hoje)
  const [form,setForm]=useState(emptyForm(hoje))
  const [lanc,setLanc]=useState([])
  const [abert,setAbert]=useState([])
  const [fech,setFech]=useState([])
  const [erro,setErro]=useState('')
  const [loading,setLoading]=useState(true)
  const [salvando,setSalvando]=useState(false)
  const [abrindo,setAbrindo]=useState(false)
  const [fechando,setFechando]=useState(false)
  const [showOpen,setShowOpen]=useState(false)
  const [showClose,setShowClose]=useState(false)
  const [openBy,setOpenBy]=useState('MEIRE')
  const [openVal,setOpenVal]=useState('')
  const [openObs,setOpenObs]=useState('')
  const [closeBy,setCloseBy]=useState('MEIRE')
  const [closeObs,setCloseObs]=useState('')
  const [busca,setBusca]=useState('')
  const [tipo,setTipo]=useState('Todos')
  const [resp,setResp]=useState('Todos')
  const [expand,setExpand]=useState(false)

  useEffect(()=>{fetchAll()},[])
  useEffect(()=>{ setForm(p=>({...p,data:selectedDate})) },[selectedDate])

  async function fetchAll(){
    setLoading(true); setErro('')
    const [r1,r2,r3]=await Promise.all([
      supabase.from('lancamentos_caixa').select('*').order('data',{ascending:false}).order('id',{ascending:false}),
      supabase.from('aberturas_caixa').select('*').order('data',{ascending:false}),
      supabase.from('fechamentos_caixa').select('*').order('data',{ascending:false})
    ])
    if(r1.error){ setErro(r1.error.message); setLoading(false); return }
    if(r2.error){ setErro(r2.error.message); setLoading(false); return }
    if(r3.error){ setErro(r3.error.message); setLoading(false); return }
    setLanc(r1.data||[]); setAbert(r2.data||[]); setFech(r3.data||[]); setLoading(false)
  }

  const aberturaDoDia = useMemo(()=>abert.find(i=>i.data===selectedDate)||null,[abert,selectedDate])
  const fechamentoDoDia = useMemo(()=>fech.find(i=>i.data===selectedDate)||null,[fech,selectedDate])
  const lancDia = useMemo(()=>lanc.filter(i=>i.data===selectedDate),[lanc,selectedDate])

  const entradas = useMemo(()=>lanc.reduce((a,i)=>a+(i.tipo==='Entrada'?Number(i.valor):0),0),[lanc])
  const saidas = useMemo(()=>lanc.reduce((a,i)=>a+(i.tipo==='Saída'?Number(i.valor):0),0),[lanc])
  const eDia = useMemo(()=>lancDia.reduce((a,i)=>a+(i.tipo==='Entrada'?Number(i.valor):0),0),[lancDia])
  const sDia = useMemo(()=>lancDia.reduce((a,i)=>a+(i.tipo==='Saída'?Number(i.valor):0),0),[lancDia])
  const vIni = Number(aberturaDoDia?.valor_inicial||0)
  const saldoDia = vIni + eDia - sDia
  const status = fechamentoDoDia ? 'Fechado' : aberturaDoDia ? 'Aberto' : 'Não aberto'

  const filtrados = useMemo(()=>{
    return lanc.filter(i=>{
      const t = `${i.descricao} ${i.categoria} ${i.forma} ${i.observacao||''} ${i.responsavel}`.toLowerCase()
      return t.includes(busca.toLowerCase()) && (tipo==='Todos'||i.tipo===tipo) && (resp==='Todos'||i.responsavel===resp)
    })
  },[lanc,busca,tipo,resp])

  const exibidos = expand ? filtrados : filtrados.slice(0,6)

  const setF=(k,v)=>setForm(p=>({...p,[k]:v}))
  const reset=()=>{ setForm(emptyForm(selectedDate)); setErro('') }

  async function salvar(e){
    e.preventDefault(); setErro('')
    if(!aberturaDoDia){ setErro('Abra o caixa do dia.'); return }
    if(fechamentoDoDia){ setErro('Dia fechado.'); return }
    const valor = Number(String(form.valor).replace(',','.'))
    if(!form.descricao.trim() || !Number.isFinite(valor) || valor<=0){ setErro('Dados inválidos'); return }
    const payload={...form, valor, descricao:form.descricao.trim(), observacao:(form.observacao||'').trim()}
    setSalvando(true)
    const {error}=await supabase.from('lancamentos_caixa').insert([payload])
    if(error){ setErro(error.message); setSalvando(false); return }
    setSalvando(false); reset(); fetchAll()
  }

  async function confirmarAbertura(){
    try{
      setErro('')
      const valorInicial = Number(String(openVal||'0').replace(',','.'))
      if(!Number.isFinite(valorInicial) || valorInicial<0){ setErro('Valor inválido'); return }
      setAbrindo(true)
      const {error}=await supabase.from('aberturas_caixa').insert([{
        data:selectedDate, valor_inicial:valorInicial, aberto_por:openBy, observacao:(openObs||'').trim()
      }])
      if(error){ setErro(error.message); setAbrindo(false); return }
      setAbrindo(false); setShowOpen(false); setOpenVal(''); setOpenObs(''); fetchAll()
    }catch(e){ setErro('Erro ao abrir'); setAbrindo(false) }
  }

  async function confirmarFechamento(){
    setErro(''); setFechando(true)
    const {error}=await supabase.from('fechamentos_caixa').insert([{
      data:selectedDate, total_entradas:eDia, total_saidas:sDia, saldo:saldoDia, fechado_por:closeBy, observacao:(closeObs||'').trim()
    }])
    if(error){ setErro(error.message); setFechando(false); return }
    setFechando(false); setShowClose(false); setCloseObs(''); fetchAll()
  }

  return (
    <div style={{padding:16,fontFamily:'Inter, Arial'}}>
      <h2>Óticas Fácil</h2>
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <input type="date" value={selectedDate} onChange={e=>setSelectedDate(e.target.value)} />
        <b>Status: {status}</b>
      </div>

      {erro && <div style={{background:'#fee',padding:8,marginTop:8}}>{erro}</div>}

      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginTop:12}}>
        <div>Inicial: <b>{money(vIni)}</b></div>
        <div>Entradas dia: <b>{money(eDia)}</b></div>
        <div>Saídas dia: <b>{money(sDia)}</b></div>
        <div>Saldo dia: <b>{money(saldoDia)}</b></div>
      </div>

      <div style={{marginTop:12}}>
        {!aberturaDoDia && <button onClick={()=>setShowOpen(true)}>Abrir caixa</button>}
        {aberturaDoDia && !fechamentoDoDia && <button onClick={()=>setShowClose(true)}>Fechar caixa</button>}
      </div>

      <form onSubmit={salvar} style={{marginTop:12,display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
        <input placeholder="Descrição" value={form.descricao} onChange={e=>setF('descricao',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}/>
        <select value={form.tipo} onChange={e=>setF('tipo',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}>
          <option>Entrada</option><option>Saída</option>
        </select>
        <input placeholder="Valor" value={form.valor} onChange={e=>setF('valor',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}/>
        <select value={form.categoria} onChange={e=>setF('categoria',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}>
          {categorias.map(c=><option key={c}>{c}</option>)}
        </select>
        <select value={form.forma} onChange={e=>setF('forma',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}>
          {formas.map(f=><option key={f}>{f}</option>)}
        </select>
        <select value={form.responsavel} onChange={e=>setF('responsavel',e.target.value)} disabled={!aberturaDoDia||fechamentoDoDia}>
          {responsaveis.map(r=><option key={r}>{r}</option>)}
        </select>
        <button disabled={salvando||!aberturaDoDia||fechamentoDoDia}>{salvando?'Salvando...':'Adicionar'}</button>
      </form>

      <div style={{marginTop:16}}>
        <h3>Livro caixa</h3>
        <div style={{display:'flex',gap:8}}>
          <input placeholder="Buscar" value={busca} onChange={e=>setBusca(e.target.value)} />
          <select value={tipo} onChange={e=>setTipo(e.target.value)}>
            <option>Todos</option><option>Entrada</option><option>Saída</option>
          </select>
          <select value={resp} onChange={e=>setResp(e.target.value)}>
            <option>Todos</option>{responsaveis.map(r=><option key={r}>{r}</option>)}
          </select>
          <button onClick={()=>setExpand(p=>!p)}>{expand?'Diminuir':'Ampliar'}</button>
        </div>

        {loading ? <p>Carregando...</p> : (
          <div style={{marginTop:8}}>
            {exibidos.map(i=>(
              <div key={i.id} style={{border:'1px solid #ddd',padding:8,marginBottom:6}}>
                <b>{i.descricao}</b> — {fmt(i.data)} — {i.categoria} — {i.forma}
                <div>{i.tipo} • {money(i.valor)} • {i.responsavel}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showOpen && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)'}}>
          <div style={{background:'#fff',margin:'10% auto',padding:16,width:360}}>
            <h3>Abrir caixa {fmt(selectedDate)}</h3>
            <select value={openBy} onChange={e=>setOpenBy(e.target.value)}>
              {responsaveis.map(r=><option key={r}>{r}</option>)}
            </select>
            <input placeholder="Valor inicial" value={openVal} onChange={e=>setOpenVal(e.target.value)} />
            <textarea placeholder="Obs" value={openObs} onChange={e=>setOpenObs(e.target.value)} />
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={()=>setShowOpen(false)}>Cancelar</button>
              <button onClick={confirmarAbertura} disabled={abrindo}>{abrindo?'Abrindo...':'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}

      {showClose && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.4)'}}>
          <div style={{background:'#fff',margin:'10% auto',padding:16,width:360}}>
            <h3>Fechar caixa {fmt(selectedDate)}</h3>
            <div>Inicial: {money(vIni)} | Entradas: {money(eDia)} | Saídas: {money(sDia)} | Saldo: {money(saldoDia)}</div>
            <select value={closeBy} onChange={e=>setCloseBy(e.target.value)}>
              {responsaveis.map(r=><option key={r}>{r}</option>)}
            </select>
            <textarea placeholder="Obs" value={closeObs} onChange={e=>setCloseObs(e.target.value)} />
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <button onClick={()=>setShowClose(false)}>Cancelar</button>
              <button onClick={confirmarFechamento} disabled={fechando}>{fechando?'Fechando...':'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
