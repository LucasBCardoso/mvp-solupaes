# Score Engine & Strategy Engine

Toda a lógica vive em **`packages/shared/src/score.ts`** — código puro, sem deps, executado client + server.

## Constantes (`packages/shared/src/constants.ts`)

```ts
REFERENCE_PRICE_PER_UNIT = 14.50   // R$ — preço médio Ouro Pães por unidade
CLASSIFICATION_THRESHOLDS = { A: 75, B: 50 }
```

Ajuste comercial: alterar essas constantes recalcula imediatamente toda a base ao chamar `/visits/recalculate` (não implementado no MVP, mas trivial via job).

## Algoritmo (`calculateScore`)

Entrada:
```ts
{
  worksWithFrozen: boolean,
  dailyVolume?: number,        // unidades/dia
  currentPrice?: number,       // R$/un
  equipmentLent?: string[],
  hasFacadePhoto: boolean,
  hasGps: boolean,
}
```

Pontuação:
```
base = 20

SE worksWithFrozen:
  + min(40, dailyVolume * 0.8)           // volume é o fator dominante (cliente Ouro Pães)
  + 15 se currentPrice > REF, senão +5   // preço alto do concorrente = oportunidade
  + 10 se equipmentLent.length < 3       // poucos equip. = espaço p/ oferta

SENÃO (não trabalha com congelados):
  + 30                                    // mercado novo, potencial alto

+ 5 se foto da fachada
+ 5 se GPS capturado

score = clamp(0, 100, total)
```

Classificação:
- `>= 75` → **A** (priorizar imediato)
- `>= 50 < 75` → **B** (planejar em 30d)
- `< 50` → **C** (relacionamento longo)

## Strategy Engine (`proposeStrategies`)

Regras determinísticas baseadas no Q&A com Ouro Pães:

| Condição | Estratégia | Follow-up |
|---|---|---|
| `!worksWithFrozen` | `INSTITUTIONAL_PITCH` + `PRODUCT_DEMO` | 14d e 30d |
| `equipmentLent < 3` | `EQUIPMENT_OFFER` | 15d |
| `currentPrice > REF` | `PRICE_DIFFERENTIATION` | 7d |
| `dailyVolume >= 30` | `BONIFICATION` | 15d |
| sempre (se frozen) | `PRODUCT_DEMO` | 30d |

`followupForRejection(reason)` devolve dias para retentar:
- `'no_interest'` → 180d
- `'tied_to_supplier'` → 90d
- `'other'` → 60d

## IA opcional (`packages/api/src/services/strategyEngine.ts`)

Quando `ENABLE_AI_STRATEGY=true`:
1. Engine de regras gera propostas base
2. Gemini 1.5 Flash recebe contexto do cliente + propostas e devolve descrições refinadas no mesmo formato (mesmos `type`)
3. Resultado é salvo com `generatedByAi=true` no banco
4. Falha de IA → fallback silencioso para regras base

Custo estimado: ~$0.001 por visita (1k tokens de entrada/saída).

## Testes

`packages/shared/src/score.test.ts` cobre:
- Score base (cliente sem dados)
- Cliente alto volume (Classe A)
- Clamp 0..100
- Mercado novo (no-frozen)
- Razões registradas na rationale
- Threshold classify
- Cada regra de strategyEngine

```bash
pnpm --filter @solupaes/shared test
```
