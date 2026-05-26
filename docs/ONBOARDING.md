# Onboarding — Solupães

Guia para treinar os usuários do sistema.

## Para o GESTOR (web)

### Primeiro acesso
1. Abra `https://app.solupaes.com` (ou `http://localhost:5173` em dev)
2. Use as credenciais enviadas pelo Solupães
3. Após login, você verá o **Dashboard** com:
   - Total de visitas
   - Clientes Classe A (maior potencial)
   - Score médio
   - Top oportunidades (score ≥ 70)
   - Estratégias aguardando ação

### Telas
- **Dashboard**: visão executiva
- **Mapa**: pins coloridos por classificação (amber=A, verde=B, cinza=C); clique para detalhes
- **Visitas**: tabela completa com fachada, GPS, score, preço identificado
- **Clientes**: cadastro de estabelecimentos com busca por nome/cidade
- **Estratégias**: Kanban (Proposta → Em andamento → Convertido/Não convertido/Adiado). Card com  é gerado pela IA.
- **Usuários**: criar/desativar representantes

### Fluxo recomendado diário
1. Manhã: abrir Dashboard → ver oportunidades novas
2. Acessar Estratégias → revisar coluna "Proposta" → mover para "Em andamento" as que vai executar
3. Tarde: acessar Mapa para planejar roteiro do(s) rep(s)
4. Final do dia: verificar `Visitas` com sincronização pendente (apenas se algum rep tem app aberto e sem sinal)

## Para o REPRESENTANTE (mobile)

### Instalação
- O app **Solupães** é distribuído via APK (Android) ou TestFlight (iOS) no início.
- Após login, autorize:
  - **Câmera** (para foto da fachada)
  - **Localização precisa** (para marcar no mapa)

### Fluxo de visita
1. Chegou no estabelecimento → toque em **Nova visita**
2. Preencha:
   - **1. Identificação**: nome fantasia (obrigatório), telefone, endereço (obrigatório)
   - **2. Localização**: toque em "Capturar GPS" — espere a confirmação; toque em "Foto da fachada"
   - **3. Qualificação**:
     - Se trabalha com congelados: preencha fornecedor, volume diário, preço, equipamentos em comodato
     - Se NÃO trabalha: aparece a estratégia de introdução (apresente o vídeo institucional e envie o catálogo via WhatsApp)
   - **4. Observações**: descreva próximos passos, objeções, interesse
3. Toque em **Salvar e sincronizar**

A visita é **salva no aparelho** mesmo sem internet. Continue trabalhando normalmente.

### Sincronização
- Tela **Fila**: mostra quantas visitas estão aguardando envio
- Quando o sinal voltar, a fila esvazia automaticamente
- Para forçar: toque em **Tentar enviar agora**

### Boas práticas
- **Sempre capture GPS e foto**: cada item vale 5 pontos no score
- **Volume diário é o fator mais importante**: pergunte com precisão
- **Equipamentos do concorrente**: pergunte quantos e quais. Se forem poucos, é oportunidade direta de oferta
- **Não esqueça observações**: descreva o "porquê" da negativa quando houver — gera estratégia de retorno automática

## Suporte
- Em caso de bug: avise o gestor; ele aciona o Solupães
- Senha esquecida: peça ao gestor para resetar via tela **Usuários**
