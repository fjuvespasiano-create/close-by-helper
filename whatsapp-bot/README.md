# AgenddaAqui — WhatsApp Bot (Portaria / Condomínio)

Módulo **standalone** em Node.js para disparo personalizado e automatizado de mensagens no WhatsApp Web, com foco em gestão de leads de portaria/condomínio.

> ⚠️ Este módulo **não roda dentro da aplicação Lovable** (Cloudflare Workers não suporta Puppeteer). É um script independente, feito para rodar em uma máquina local, VPS ou container Docker com acesso a Chromium.

---

## 📦 O que está incluso

```
whatsapp-bot/
├── package.json
├── leads.example.json          # exemplo de estrutura de leads
├── src/
│   ├── config.js               # template, delays, caminhos
│   ├── client.js               # inicializa WhatsApp Web + QR Code
│   ├── sender.js               # envio individual e em lote
│   ├── utils.js                # helpers (delay, phone, template)
│   └── index.js                # CLI (auto | manual | one)
└── .gitignore
```

---

## 🧰 Requisitos

- **Node.js 18+**
- Sistema com dependências do Chromium (Linux):
  ```bash
  sudo apt-get install -y libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2
  ```
- Windows/macOS: nenhuma dependência extra além do Node.

---

## 🚀 Instalação

```bash
cd whatsapp-bot
npm install
cp leads.example.json leads.json
# edite leads.json com seus contatos reais
```

---

## ▶️ Uso

### 1. Primeira execução (autenticação via QR Code)

```bash
npm start
```

Um QR Code aparecerá no terminal. Abra **WhatsApp → Aparelhos conectados → Conectar um aparelho** e escaneie.
A sessão fica salva em `.wwebjs_auth/`, então **você não precisa escanear novamente** nas próximas execuções.

### 2. Modo Automático (dispara para todos os leads)

```bash
npm run send:auto
```

Envia para todos os leads do `leads.json` sequencialmente, com **delay aleatório de 15–30s** entre mensagens (anti-ban).

### 3. Modo Manual (confirmação lead-a-lead)

```bash
npm run send:manual
```

Para cada lead, o terminal pergunta `Enviar para X? (s/n/q)`. `q` encerra o fluxo.

### 4. Envio de teste para um único número

```bash
npm run send:one -- --phone=5531999990000
```

---

## 📝 Formato dos leads (`leads.json`)

```json
[
  {
    "nome": "João Silva",
    "telefone": "5531999990001",
    "condominio": "Residencial Jardim Vespasiano",
    "status": "Liberado"
  }
]
```

- **telefone**: aceita com ou sem DDI (`55`). Formato final: apenas dígitos.
- Você pode adicionar **qualquer campo extra** (`bloco`, `apartamento`, etc.) — todos ficam disponíveis como `{chave}` no template.

---

## ✉️ Personalização da mensagem

Edite `messageTemplate` em `src/config.js`. Placeholders no formato `{chave}` são substituídos pelos campos do lead:

```js
messageTemplate:
  "Olá, {nome}! 👋\n\n" +
  "Seu acesso ao {condominio} está com status: *{status}*.\n\n" +
  "— Portaria AgenddaAqui",
```

---

## 🛡️ Anti-ban (importante!)

- **Delay aleatório** de 15–30s entre envios (`minDelayMs` / `maxDelayMs` em `config.js`).
- **Verificação prévia** com `getNumberId` antes de enviar (evita disparo em números inválidos).
- **Sessão local persistente** (mesmo device fingerprint entre execuções).
- **Recomendações extras**:
  - Não dispare mais de **~200 mensagens/dia** em número novo.
  - Aqueça o número: envie/receba mensagens humanas por 3–7 dias antes de automatizar.
  - Não use o mesmo template idêntico para milhares — varie saudação, use nome/condomínio.
  - Prefira **WhatsApp Business API oficial** para volumes altos ou produção séria.

---

## 📊 Logs

Cada envio é registrado em `logs/report.jsonl` (uma linha JSON por envio):

```json
{"ts":"2026-07-11T14:22:03.111Z","status":"success","lead":{"nome":"João","telefone":"5531..."}}
{"ts":"2026-07-11T14:22:31.720Z","status":"error","lead":{...},"error":"Número não possui WhatsApp"}
```

Fácil de importar em planilhas ou pipeline de BI.

---

## 🔌 Integração com o AgenddaAqui

Para puxar leads direto do banco em vez de JSON, substitua `loadLeads()` em `src/index.js` por uma consulta HTTP a um endpoint público do próprio AgenddaAqui (ex.: `/api/public/leads/pending`), retornando o mesmo shape de array de objetos.

---

## 🐛 Troubleshooting

| Problema | Solução |
|---|---|
| QR Code não aparece | Rode com `DEBUG=whatsapp-web.js:*` para logs verbosos. |
| `Failed to launch chromium` | Instale as libs do sistema (ver Requisitos). |
| Sessão expira toda hora | Confira se `.wwebjs_auth/` tem permissão de escrita e não está sendo apagado. |
| Número banido | Reduza volume, aumente delay (`maxDelayMs: 60_000`), aqueça número novo. |

---

## 📄 Licença de uso responsável

Este bot automatiza envio para leads **que consentiram** em receber mensagens. Uso para spam viola os Termos do WhatsApp e pode resultar em banimento permanente do número.
