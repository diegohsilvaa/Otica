# Atualização — ficha do cliente com exames e financeiro

Arquivos principais para substituir:
- App.jsx
- styles.css

Script para rodar no Supabase:
- cliente_ficha_exames_financeiro.sql

O que foi adicionado:
- Aba Dados do cliente
- Aba Exames, com OD/OE, eixo, DNP, altura, adição, lente, armação, OS e observação
- Aba Financeiro, com emissão, duplicata, vencimento, parcela, valor total, valor quitado, data de pagamento, forma, tipo de cobrança, banco e observação
- Status visual: Em aberto, Parcial e Pago
- Botão “Salvar e lançar no caixa”, que grava a ficha financeira e cria entrada no Livro Caixa quando houver valor quitado

Observação: para usar “Salvar e lançar no caixa”, o caixa do dia precisa estar aberto e não pode estar fechado.
