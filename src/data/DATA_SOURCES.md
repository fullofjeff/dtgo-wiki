# Data Sources & Dependencies

When information about DTGO entities is updated, it must be reflected in ALL of these locations:

| Data Location | What it contains | When to update |
|---|---|---|
| `/knowledge-base/*.md` | Canonical source of truth — full prose, metrics, sources | When new info arrives (via INTAKE.md process) |
| `src/data/orgData.ts` | Org chart: hierarchy, leaders, summaries, metrics | After any KB update that changes leadership, structure, or key metrics |
| `src/data/charts.json` | Chart datasets (investment allocation, REIT income, etc.) | After any KB update that changes financial figures |
| Wiki.html (legacy) | Original static wiki — modalData object | Deprecated; KB is now the source of truth |

## Entity-to-File Mapping

| Entity | Knowledge Base | orgData.ts ID | Notes |
|--------|---------------|---------------|-------|
| DTGO Corporation | `_index.md` | `dtgo` | Root entity |
| MQDC | `mqdc.md` | `mqdc` | Property pillar |
| T&B Media Global | `tnb.md` | `tnb` | Media pillar |
| DTP / DTGO Prosperous | `dtp.md` | `dtp` | Investment pillar |
| Magnolia Finest Corp | `mqdc.md` § MFC | `mfc` | MQDC sub |
| RISC | `mqdc.md` § RISC | `risc` | MQDC sub |
| FutureTales Lab | `mqdc.md` § FutureTales | `futuretales` | MQDC sub |
| Quinnnova | `mqdc.md` § Quinnnova | `quinnnova` | MQDC sub |
| Worldmark | `mqdc.md` | `worldmark` | MQDC sub |
| Idyllias | `mqdc.md` § Idyllias | `idyllias` | MQDC sub |
| Shellhut Entertainment | `tnb.md` § Shellhut | `shellhut` | T&B sub |
| Rabbit Moon | `tnb.md` § Rabbit Moon | `rabbitmoon` | T&B sub |
| Tree Roots Entertainment | `tnb.md` § Tree Roots | `treeroots` | T&B sub |
| Night's Edge | `tnb.md` § Night's Edge | `nightsedge` | T&B sub |
| OKD | `tnb.md` § OKD | `okd` | T&B sub |
| DYA | `tnb.md` § DYA | `dya` | T&B sub |
| Dreamcrafter | `tnb.md` § Dreamcrafter | `dreamcrafter` | T&B sub |
| DTPRM | `dtp.md` § DTPRM | `dtprm` | DTP sub |
| UK Hotel Portfolio | `dtp.md` § UK Hotels | `ukhotels` | DTP sub |
| REDDS Technology Fund | `dtp.md` § Innovative | `redds` | DTP sub |
| Mind AI | `dtp.md` § Innovative | `mindai` | DTP sub |
| The Forestias | `forestias.md` | — | Project, not org unit |
| Cloud 11 | `cloud11.md` | — | Project, not org unit |
| People | `people.md` | `leader` fields | Cross-referenced |

## What to sync when updating

- **Leader changes** (name, title, new appointment) → update `leader` field in orgData.ts + `people.md`
- **New subsidiary** → add entry to orgData.ts + section in parent's KB file
- **Subsidiary removed/merged** → remove from orgData.ts + update KB file
- **Financial metric changes** → update `keyMetrics` in orgData.ts + KB file tables + `charts.json` if applicable
- **Summary/description changes** → update `summary` field in orgData.ts
