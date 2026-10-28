# DeskMap — andar em 3D

Mapa 3D do andar (estilo The Sims) que vai virar o sistema de **mesas rotativas, reserva de salas e mapeamento de quem senta onde (presencial/home)**.

Esta é a **Fase 1: o modelo 3D**, montado a partir de 4 fotos tiradas da mesa I6‑S1. O plano completo, a leitura das fotos e as próximas fases estão em [docs/PLANO.md](docs/PLANO.md).

| Repositório | Conteúdo |
|---|---|
| **company-desk-room-schedule-3d** (este) | site em React 19 + TypeScript + Vite + three.js (@react-three/fiber, drei, postprocessing) |
| [company-desk-room-schedule-backend](https://github.com/Gabrielkr28/company-desk-room-schedule-backend) | API em Go: valida e resolve o layout, hot reload, calibração das fotos |

## Rodando local

Pré‑requisitos: Go 1.24+ e Node 18+. Clone os dois repositórios lado a lado.

Terminal 1 — API (porta 8090), na pasta do backend:

```bash
go run ./cmd/api
```

Terminal 2 — site (porta 5190, faz proxy de `/api` para a 8090), nesta pasta:

```bash
npm install
npm run dev
```

Abra http://localhost:5190.

## Usando

- **Navegar**: arrastar move pelo andar, botão direito gira, scroll aproxima; `Q`/`E` giram 90°, setas movem. A câmera nunca desce ao nível dos olhos.
- **Paredes**: altas, recortadas (as que ficam entre você e o andar abaixam, como no The Sims) ou baixas.
- **Lugares**: passe o mouse para ver o ID (`<bancada>-<lado><n>`, ex.: `I6-S1`), clique para detalhes, duplo clique centraliza.
- **Confiança**: pinta as mesas de verde/amarelo/vermelho conforme o quanto foram vistas nas fotos.
- **Fotos / calibração**: clique numa foto (painel ou seta no piso) para ver o 3D da mesma posição da câmera com a foto sobreposta. Ajuste a pose e salve.

## Editando o andar

O layout fica no backend, em `data/floors/andar-1/layout.json` (uma bancada/pilar por linha). Edite e salve: a API recarrega sozinha e o site atualiza em ~3 s. Se o JSON ficar inválido, a API continua servindo a última versão boa e o site mostra o erro no topo.

As fotos de referência ficam só na máquina local (`data/floors/andar-1/photos/`, no `.gitignore` do backend), porque aparecem colegas nelas.

## Build

```bash
npm run build
```
