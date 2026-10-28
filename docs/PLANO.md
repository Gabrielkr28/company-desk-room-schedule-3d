# DeskMap — Plano de desenvolvimento

Site interno para **ver o andar em 3D**, **mapear a mesa de cada colaborador** (e se está presencial ou home) e **reservar mesas rotativas e salas**.

Esta primeira entrega cobre **apenas a Fase 1 — o modelo 3D do andar**, montado a partir das 4 fotos. Reservas e regras entram quando o modelo estiver validado ("exato").

---

## 1. Leitura das fotos

As fotos foram tiradas do mesmo ponto (a sua mesa), girando 90° por vez. Como os anexos chegaram numerados 1–4 (sem os ângulos no nome e sem EXIF), a ordem foi reconstruída pelas pistas visuais:

| Arquivo | Ângulo | Direção no modelo | Pistas que amarram a direção |
|---|---|---|---|
| `foto-3` | **360°** | Norte — de frente para a sua mesa | 2 monitores + notebook, mouse pad com logo "X" à direita, headset à esquerda; colega do outro lado da divisória; ao fundo ~9 fileiras e a parede com kanbans + quadro branco |
| `foto-2` | **90°** | Leste (virou à direita) | o mesmo mouse pad aparece no canto inferior esquerdo; a sua fileira continua com 3 colegas a ~1,5 m um do outro; parede a ~6,5 m com elevador (moldura de granito + painel verde‑azulado), porta, hidrante, porta **SAÍDA** e relógio de ponto |
| `foto-4` | **180°** | Sul (de costas para a mesa) | a sua cadeira de frente para a câmera; bancada do outro lado do corredor (colega de costas); pilar colorido logo a sudoeste; parede a ~14 m com porta dupla metálica, extintores, quadro branco, kanban e mural geométrico |
| `foto-1` | **270°** | Oeste | o seu headset na ponta da mesa (canto inferior direito); corredor principal com ~38 m até a parede com portas; pilar branco com faixa **"E"**; pilares coloridos na mesma grade |

> Convenção: **"Norte do modelo" = a direção da sua mesa (foto 360°)**. Não é o norte geográfico.

### Primeira calibração (já feita)

Com a ferramenta de calibração do site, cada foto foi sobreposta ao 3D renderizado da mesma posição:

| Foto | Resultado |
|---|---|
| 270° | pilares coloridos, pilar "E", fileiras e até as grelhas de ar do corredor caem sobre as da foto |
| 90° | elevador, porta, hidrante, porta SAÍDA e relógio de ponto nas mesmas posições (±2%) |
| 180° | pilar, quadro branco, extintores, kanban e a bancada do colega alinhados — **corrigiu o corredor principal de 2,9 m para 2,4 m** (fileiras J e K subiram 0,5 m) |
| 360° | mesa, monitores, notebook e pilares alinhados após girar a câmera 7° |

O que as fotos **não** mostram (≈55% dos lugares, marcados como `baixa`): a metade oeste das fileiras A–H e da K, o canto nordeste e o que existe atrás das portas da parede oeste.

### O que foi deduzido (medidas estimadas por perspectiva)

- **Grade estrutural**: pilares a cada **7,5 m** no sentido leste‑oeste, sempre dentro dos corredores transversais; no sentido norte‑sul eles caem na linha central das fileiras B, D, F, H e J. Essa grade bate nas 4 fotos ao mesmo tempo.
- **Bancadas**: 4 lugares por lado × **1,5 m** = 6,0 m, profundidade 2 × 0,8 m, divisória central branca com frisos, gaveteiro sob cada lugar.
- **Fileiras** a cada 4,0 m (corredores de 2,4 m entre bancadas); o **corredor principal** (onde fica a sua cadeira) está alinhado com as portas das paredes leste (SAÍDA) e oeste.
- **Andar** ≈ 46,5 m × 50,5 m, pé‑direito ~3,0 m → 11 fileiras × 6 baias = **66 bancadas / 528 lugares** (a validar).
- **A sua mesa**: bancada **I6**, lugar **S1** (ponta oeste, lado sul).
- Cada elemento tem um nível de **confiança**: `alta` (visto de perto), `media` (visto ao fundo) e `baixa` (inferido pela grade — boa parte do andar não aparece nas fotos). O site pinta o mapa por confiança para guiar a validação.

---

## 2. Arquitetura

```
┌──────────────────────────────┐        HTTP/JSON        ┌───────────────────────────────┐
│ frontend (React + three.js)  │ ──────────────────────▶ │ backend (Go, net/http)        │
│ Vite · R3F · drei · zustand  │   /api/floors/{id}      │ valida + resolve o layout     │
│ câmera "The Sims", instancing│   /api/.../photos       │ hot reload dos JSON           │
└──────────────────────────────┘                         └──────────────┬────────────────┘
                                                                        │
                                              data/floors/<andar>/layout.json  (planta, editável à mão)
                                              data/floors/<andar>/photos.json  (pose calibrada das fotos)
                                              data/floors/<andar>/photos/*.jpg (fotos — fora do git)
```

### Backend — Go (só biblioteca padrão)
- **Dono do domínio**: transforma a *spec* editável (paredes, pilares, bancadas paramétricas) num **modelo resolvido** (cada lugar com ID estável, posição e orientação). Os IDs (`I6-S1`) serão a chave das reservas nas próximas fases.
- **Validação**: IDs duplicados, portas fora da parede, bancadas fora do andar, overrides de lugares inexistentes; sobreposições viram *avisos*.
- **Hot reload**: editou o `layout.json`, deu F5, o modelo atualiza. Se o JSON novo for inválido, a API continua servindo o último válido e devolve o erro para a tela.
- **Calibração**: `PATCH /api/floors/{id}/photos/{photoId}` grava a pose (posição, yaw, pitch, FOV) de cada foto.
- Camadas: `internal/floorplan` (domínio puro + testes), `internal/storage` (arquivos, trocável por Postgres depois), `internal/httpapi` (rotas, CORS, logs).

### Frontend — React 19 + TypeScript + Vite 6
- **three.js via @react-three/fiber 9 + drei 10**: cena declarativa, ecossistema maduro.
- **Instancing**: cada peça repetida (tampo, gaveteiro, monitor, cadeira…) é um único `InstancedMesh` → 500+ lugares rodando liso; hover/seleção por `instanceId`.
- **Câmera estilo The Sims** (`CameraControls`): visão de fora, arrasta para mover, botão direito gira, scroll dá zoom; **ângulo limitado** — não dá para descer ao nível dos olhos nem "andar" no setor. Botões de girar 90°, vista isométrica e planta.
- **Paredes recortadas** como no The Sims: altas / recortadas (as que ficam entre você e o andar abaixam) / baixas.
- **Visual**: piso de granito polido com reflexo das luminárias (ambiente procedural, sem download), sombras suaves e oclusão de ambiente (N8AO), pilares com arte procedural, kanbans, extintores, portas.
- **Modo calibração**: posiciona a câmera exatamente onde cada foto foi tirada e sobrepõe a foto ao 3D (opacidade / diferença) com sliders de pose. É a ferramenta para chegar no "modelo exato".
- Estado de UI em **zustand**; tipos espelhando o JSON da API.

---

## 3. Fases

| Fase | Entrega | Status |
|---|---|---|
| **1. Modelo 3D** | API Go + viewer 3D, planta inferida das fotos, IDs de bancada/lugar, modo confiança, calibração por foto | ✅ esta entrega |
| **2. Modelo exato** | calibrar as 4 fotos; medir 3–4 cotas (ou usar a planta baixa CAD/PDF do facilities); fotos extras das áreas `baixa`; **editor de layout no navegador** (arrastar bancadas, portas, salas); salas de reunião como entidade | próxima |
| **3. Pessoas e presença** | cadastro/importação (CSV ou diretório), times, mesa **fixa × rotativa**, agenda semanal **presencial / home**, "quem está onde hoje", buscar colega no mapa | |
| **4. Reserva de mesas rotativas** | reservar por dia/período, check‑in (QR na mesa), liberação automática por no‑show, vizinhança por time, limites por semana | |
| **5. Reserva de salas** | grade de horários, capacidade/recursos, recorrência, integração com calendário (Outlook/Google) | |
| **6. Produção** | Postgres, SSO (OIDC / Entra ID), papéis (admin, facilities, colaborador), Docker, observabilidade, LGPD | |

### Modelo de dados previsto (Fases 3–5, Postgres)
- `floors`, `benches`, `seats` (vindos do layout; `seat.id` estável), `rooms` (capacidade, recursos)
- `people`, `teams`, `seat_assignments` (mesa fixa, com vigência)
- `presence_days` (pessoa × dia → presencial / home / ausente)
- `desk_bookings` (lugar × pessoa × período, status: reservada / check‑in / cancelada / no‑show) — sem sobreposição garantida no banco com `EXCLUDE USING gist (seat_id WITH =, period WITH &&)`
- `room_bookings` (sala × organizador × período × participantes) — mesma restrição
- `policies` (antecedência máxima, prazo de check‑in, limite por semana, zonas por time)

---

## 4. Decisões em aberto (preciso de você antes da Fase 3)

1. Quais mesas são **fixas** e quais são **rotativas**? Existe "vizinhança" por time?
2. Reserva de mesa por **dia inteiro**, **meio período** ou **hora**? Com quantos dias de antecedência?
3. **Check‑in** obrigatório? Até que horas antes de liberar a mesa?
4. Onde ficam as **salas de reunião** (portas da parede oeste? outro andar?) e quais as capacidades?
5. Login com a conta corporativa (Microsoft/Google)? Quem administra?
6. Presença é **declarada** pela pessoa (agenda semanal) ou **derivada** das reservas?

---

## 5. Como validar o modelo (Fase 2)

1. Abra o site → painel **Fotos** → escolha uma foto → ajuste yaw/pitch/FOV até as linhas do 3D casarem com a foto → **Salvar pose**.
2. Ligue **Cor por confiança** e confira as áreas `baixa` no andar (fotos extras dessas áreas resolvem rápido).
3. Ajustes de planta: edite `backend/data/floors/andar-1/layout.json` e recarregue a página (hot reload).
