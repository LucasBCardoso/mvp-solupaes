# Score Engine & Strategy Engine

Toda a lógica vive em **`packages/shared/src/score.ts`** — código puro, sem deps,
executado no cliente (mobile/web) e no servidor (que é a fonte autoritativa).

## Como o score é calculado

O sistema separa em **duas trilhas** baseadas no campo `worksWithFrozen` do relatório
de visita. Cada trilha tem uma tabela explícita de faixas → pontos.

### Trilha A — Cliente ATIVO (`worksWithFrozen=true`)

Total máximo: **100 pts**.

| # | Critério | Faixa | Pontos |
|---|---|---|---|
| 1 | Volume diário do PDV | ≥ 80 un/dia | **40** |
|   | | 50–79 | 30 |
|   | | 20–49 | 20 |
|   | | 1–19 | 10 |
|   | | 0 ou desconhecido | 0 |
| 2 | Preço pago ao concorrente / nosso preço de referência (R$ 14,50) | > 20% acima | **25** |
|   | | > 10% acima | 18 |
|   | | acima | 12 |
|   | | igual ou abaixo | 5 |
|   | | desconhecido | 0 |
| 3 | Equipamentos do concorrente em comodato | 0 (nenhum) | **15** |
|   | | 1–2 | 10 |
|   | | 3–4 | 5 |
|   | | 5+ | 0 |
| 4 | Foto da fachada capturada | sim | **10** |
| 5 | GPS capturado | sim | **10** |

**Lógica comercial:**
- **Volume** é o critério dominante (Ouro Pães citou: *"a venda diária é determinante para todas as estratégias"*).
- **Preço alto do concorrente = oportunidade nossa** (entramos com preço/qualidade melhor).
- **Poucos equipamentos do concorrente = oportunidade de ofertar os nossos** em comodato.
- **Registro completo (foto + GPS)** garante que a visita foi de fato realizada e ficou auditável.

### Trilha B — PROSPECT (`worksWithFrozen=false`)

Cliente novo, que ainda não trabalha com panificação congelada. Total máximo: **65 pts**.

| # | Critério | Pontos |
|---|---|---|
| 1 | Base mercado novo | **50** |
| 2 | Foto da fachada | 10 |
| 3 | GPS capturado | 5 |

> **Por que prospect não chega a 100?** Por desenho: mesmo com registro completo, prospect
> sempre cai em Classe **B** (50–74). Só vira Classe A após follow-up bem-sucedido e
> promoção manual pelo gestor — evita que o sistema priorize um *talvez* sobre uma
> oportunidade ativa concreta.

## Classificação

| Score | Classe | Significado |
|---|---|---|
| 75 – 100 | **A** | Priorizar visita imediata |
| 50 – 74 | **B** | Planejar em 30 dias |
| 0 – 49 | **C** | Relacionamento longo |

## Exemplos reais (visitas do seed)

| PDV | Volume | Preço | Equip. | Foto/GPS | Pontos | Classe |
|---|---|---|---|---|---|---|
| Padaria Doce Lar (Pelotas) — fornecedor cobrando caro | 28 | R$ 17,50 | 1 | sim | 20+25+10+20 = **75** | A |
| Padaria Central (Rio Grande) — insatisfeito com concorrente | 60 | R$ 16,50 | 1 | sim | 30+18+10+20 = **78** | A |
| Supermercado Sul Bom (Pelotas) — alto volume mas bem equipado | 90 | R$ 13,80 | 5 | sim | 40+5+0+20 = **65** | B |
| Mercadinho Bela Vista (Palhoça) — pequeno mas paga caro | 35 | R$ 16,80 | 1 | sim | 20+18+10+20 = **68** | B |
| Conveniência Posto Trevo (Palhoça) — não trabalha com frozen | – | – | – | sim | 50+10+5 = **65** | B |

Note que o sistema **dispriviliza** clientes "saturados" pelo concorrente
(volume alto + bem equipados + preço competitivo) — eles caem para B porque
o esforço de conversão é maior que abordar uma oportunidade clara.

## Ajustando o engine (tuning comercial)

Toda a tabela está em `packages/shared/src/score.ts`, exportada como `SCORE_RULES`:

```ts
export const SCORE_RULES = {
  volume: {
    tier1: { gte: 80, points: 40 },
    tier2: { gte: 50, points: 30 },
    // ...
  },
  priceVsReference: {
    veryHigh: { ratioGt: 1.2, points: 25 },
    // ...
  },
  competitorEquipment: {
    none:  { count: 0, points: 15 },
    // ...
  },
  // ...
};
```

Após mudar, rode os testes:
```bash
pnpm --filter @solupaes/shared test
```

E, em produção, dispare um job de recálculo (a definir) para que visitas antigas
reflitam a nova régua. No MVP, apenas visitas novas usam o engine atualizado.

## Strategy Engine (`proposeStrategies`)

Regras determinísticas derivadas do mesmo Q&A com Ouro Pães:

| Condição | Estratégia gerada | Follow-up |
|---|---|---|
| `!worksWithFrozen` | `INSTITUTIONAL_PITCH` + `PRODUCT_DEMO` | 14d e 30d |
| `equipmentLent.length < 3` | `EQUIPMENT_OFFER` | 15d |
| `currentPrice > REF` | `PRICE_DIFFERENTIATION` | 7d |
| `dailyVolume >= 30` | `BONIFICATION` | 15d |
| sempre (se frozen) | `PRODUCT_DEMO` | 30d |

`followupForRejection(reason)` devolve dias para retentar:
- `'no_interest'` → 180d
- `'tied_to_supplier'` → 90d
- `'other'` → 60d

## IA opcional (`packages/api/src/services/strategyEngine.ts`)

Quando `ENABLE_AI_STRATEGY=true` no `.env`:
1. Engine de regras gera propostas base
2. Gemini 1.5 Flash refina as descrições mantendo os mesmos `type`
3. Resultado salvo com `generatedByAi=true`
4. Falha de IA → fallback silencioso para as regras

Custo estimado: ~$0.001 por visita.

## Testes

`packages/shared/src/score.test.ts` cobre:
- Trilha A máxima (100)
- Cada classe (A, B, C) com cenário típico
- Trilha B máxima (65) e mínima (50)
- Clamp em 100
- Strategy engine: cada regra dispara o tipo correto

```bash
pnpm --filter @solupaes/shared test
```
