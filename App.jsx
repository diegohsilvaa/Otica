import { useState } from 'react'

export default function App(){
const [expandido,setExpandido]=useState(false)

return(
<div className="app-shell">

<div className="sidebar">
<h2>Óticas Fácil</h2>
<p>Financeiro</p>
</div>

<div className="content">

<div className="panel">
<h3>Novo lançamento financeiro</h3>
<input placeholder="Descrição"/>
<input placeholder="Valor"/>
<button className="primary-btn">Salvar</button>
</div>

<div className="panel">
<h3>Livro Caixa</h3>

<button onClick={()=>setExpandido(!expandido)}>
{expandido ? 'Reduzir' : 'Expandir tudo'}
</button>

<div className="launch-card">
<p>Venda lente</p>
<p>R$ 200,00</p>
{expandido && <small>Detalhes do lançamento...</small>}
</div>

</div>

</div>

</div>
)
}
