# Óticas Fácil

Versão com ficha do cliente no padrão de ótica:
- dados principais do cliente
- exames com grau de OD/OE, lente, armação, OS e observações
- financeiro vinculado ao cliente
- livro caixa mantido

No Supabase rode primeiro `clientes.sql` e depois `realtime.sql`.

Se o cliente for novo, salve os dados primeiro. Depois abra a aba Exames ou Financeiro para lançar os registros vinculados ao cliente.

- financeiro ajustado para: emissão, duplicata, vencimento, valor total, valor quitado, data de pagamento e observação
- dados financeiros gravados na tabela public.cliente_financeiro


Arquivos atualizados nesta versão:
- App.jsx
- styles.css
- multiempresa_banco.sql
