const { Client, LocalAuth } = require("whatsapp-web.js");
const qrcode = require("qrcode-terminal");
const config = require("./config");

/**
 * Cria e inicializa o client do WhatsApp Web em modo headless, com sessão persistente.
 * Retorna uma Promise que resolve quando o client está pronto para enviar mensagens.
 */
function createClient() {
  const client = new Client({
    authStrategy: new LocalAuth({ dataPath: config.sessionDir }),
    puppeteer: {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    },
  });

  client.on("qr", (qr) => {
    console.log("\n📱 Escaneie o QR Code abaixo no WhatsApp (Aparelhos conectados):\n");
    qrcode.generate(qr, { small: true });
  });

  client.on("authenticated", () => {
    console.log("🔐 Sessão autenticada. Salva localmente para próximas execuções.");
  });

  client.on("auth_failure", (msg) => {
    console.error("❌ Falha de autenticação:", msg);
  });

  client.on("disconnected", (reason) => {
    console.warn("⚠️  Desconectado:", reason);
  });

  const ready = new Promise((resolve) => {
    client.on("ready", () => {
      console.log("✅ WhatsApp Web pronto. Cliente conectado.");
      resolve(client);
    });
  });

  client.initialize();
  return ready;
}

module.exports = { createClient };
