# AgenddaAqui — WhatsApp Bot v2 (Anti-Ban Edition)

Bot Node.js para disparo profissional no WhatsApp Web com **5 camadas anti-ban**:

1. **Delay dinâmico** — pausa aleatória de **20–40s** entre mensagens.
2. **Pausa longa** — **5–10 min** a cada bloco de **~18 mensagens**.
3. **Presence typing** — simula "Digitando…" por 3–5s antes de cada envio.
4. **Hiper-personalização + spintax** — variáveis do lead + variações aleatórias de saudação/fechamento.
5. **Warm-up + opt-out** — curva de aquecimento de 21 dias com limite diário + palavra-chave `SAIR` respeitada.

> ⚠️ Módulo **standalone Node.js** — não roda no runtime Cloudflare Workers. Execute em máquina local, VPS ou container Docker.

---

## 📦 Estrutura

```
whatsapp-bot/
├── src/
│   ├── config.js       # template, spintax, delays, warm-up schedule, opt-out
│   ├── client.js       # WhatsApp Web + QR + sessão persistente
│   ├── sender.js       # envio com presence typing, delay, pausa longa
│   ├── warmup.js       # curva 21 dias + limite diário
│   ├── optout.js       # persistência + listener automático de "SAIR"
│   ├── utils.js        # spintax resolver, phone, sleep, log
│   └── index.js        # CLI
├── data/               # opt-out + warm-up (gerado)
├── logs/               # report.jsonl (gerado)
└── leads.example.json
```

---

## 🚀 Instalação

```bash
cd whatsapp-bot
npm install
cp leads.example.json leads.json
```

Primeira execução (escaneia QR):

```bash
npm start
```

---

## 🧠 Estratégias Anti-Ban Implementadas

### 1. Ritmo de envio (`src/sender.js` + `src/config.js`)

| Comportamento | Config | Padrão |
|---|---|---|
| Delay entre msgs | `minDelayMs` / `maxDelayMs` | 20–40s aleatório |
| Pausa longa | `batchSize` + `min/maxLongPauseMs` | 5–10 min a cada 18 msgs |
| Simulação de digitação | `min/maxTypingMs` | 3–5s antes de cada envio |
| Verificação de número | `getNumberId` | Antes de cada envio |

### 2. Warm-up (`src/warmup.js`)

Curva pré-configurada de 21 dias em `config.warmupSchedule`:

- **Semana 1 (dias 1–7):** `0` envios ativos (só uso manual/humano).
- **Semana 2 (dias 8–14):** `15 → 25 → 40 → 60 → 80 → 100 → 120`.
- **Semana 3 (dias 15–21):** `150 → 200 → 250 → 300 → 400 → 500 → 600`.
- **Após dia 21:** `dailyLimitAfterWarmup = 800`.

O bot **aborta automaticamente** ao atingir o limite diário. Comandos:

```bash
npm run warmup:status    # ver dia atual, limite, enviadas, restantes
npm run warmup:reset     # zerar (use ao trocar de chip)
```

### 3. Hiper-personalização + Spintax (`src/utils.js`)

O template aceita **dois tipos** de token:

- `{chave}` — substituído por `lead.chave` (variáveis do banco).
- `{opção1|opção2|opção3}` — spintax: escolhe uma aleatoriamente.

Exemplo em `config.js`:

```js
messageTemplate:
  "{Olá|Oi|Bom dia}, {nome}! {Tudo bem?|Como vai?}\n\n" +
  "Seu acesso ao *{condominio}* está com status: *{status}*.\n\n" +
  "{Qualquer dúvida|Se precisar de algo} é só responder.\n\n" +
  "— AgenddaAqui\n\n" +
  "_Caso não queira mais receber avisos, responda *SAIR*._"
```

Cada envio gera uma variação única — reduz drasticamente detecção por padrão.

### 4. Opt-out (`src/optout.js`)

- Um **listener** escuta toda mensagem recebida.
- Se o corpo for `sair`, `parar`, `cancelar`, `stop`, `unsubscribe` (config `optOutKeywords`), o número é adicionado a `data/optout.json` e recebe confirmação automática.
- Antes de cada envio, o `sender` **verifica opt-out** e pula silenciosamente.
- Também é possível adicionar manualmente:

```bash
npm run optout:add -- --phone=5531999990000
```

### 5. Sessão persistente (`src/client.js`)

Usa `LocalAuth` do `whatsapp-web.js` → mesmo device fingerprint entre execuções, evita "novo dispositivo" no WhatsApp.

---

## ▶️ Modos de operação

```bash
npm run send:auto                          # dispara toda a fila com anti-ban
npm run send:manual                        # confirma lead a lead
npm run send:one -- --phone=5531999990000  # teste unitário
npm run warmup:status                      # painel de warm-up
```

---

## 📊 Logs (`logs/report.jsonl`)

Cada linha é um evento JSON:

```json
{"ts":"2026-07-11T14:22:03Z","status":"success","lead":{...},"message":"Olá, João! ..."}
{"ts":"2026-07-11T14:22:34Z","status":"skipped_optout","lead":{...}}
{"ts":"2026-07-11T14:30:12Z","status":"long_pause","durationMs":423000}
{"ts":"2026-07-11T15:10:00Z","status":"daily_limit_reached","limit":40,"sent":40}
```

Fácil de importar em BI / planilha.

---

## 🔒 Recomendações profissionais

- **Nunca** dispare para listas frias — só para leads que consentiram (moradores, cadastros).
- Faça a **Semana 1 100% manualmente** (converse com contatos reais).
- Alterne o tom do template mensalmente — evite reuso idêntico por 30+ dias.
- Para volumes acima de **~800/dia**, migre para **WhatsApp Business API oficial (Cloud API)**.
- Monitore o `report.jsonl` diariamente — pico de falhas = possível banimento em curso.

---

## 🐛 Troubleshooting

| Sintoma | Ação |
|---|---|
| Chip banido em < 1 semana | Você pulou o warm-up. Chip novo + `warmup:reset` + siga a curva. |
| QR não aparece | Instale libs do Chromium (Linux) — ver seção Requisitos no v1. |
| Opt-out não persiste | Confirme permissão de escrita em `data/`. |
| Delay parece o mesmo sempre | Confirme que `minDelayMs ≠ maxDelayMs` em `config.js`. |

---

## 📄 Uso responsável

Este bot automatiza mensagens para leads que **autorizaram** o contato. Uso para spam viola os Termos do WhatsApp e resulta em banimento permanente — sem apelação.
