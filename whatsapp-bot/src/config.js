/**
 * Configurações centrais do bot.
 * Ajuste template, delays e caminho dos leads conforme necessidade.
 */
module.exports = {
  // Caminho para o arquivo de leads (JSON). Pode ser trocado por consulta a banco.
  leadsFile: process.env.LEADS_FILE || "./leads.json",

  // Diretório onde a sessão do WhatsApp Web será persistida (evita re-scan do QR).
  sessionDir: process.env.SESSION_DIR || "./.wwebjs_auth",

  // Template com placeholders {chave}. Todas as chaves do lead são substituídas.
  messageTemplate:
    "Olá, {nome}! 👋\n\n" +
    "Seu acesso ao {condominio} está com status: *{status}*.\n\n" +
    "Qualquer dúvida, responda esta mensagem.\n\n" +
    "— Portaria AgenddaAqui",

  // Delay aleatório entre envios (anti-ban). Valores em milissegundos.
  minDelayMs: 15_000,
  maxDelayMs: 30_000,

  // Country code padrão caso o telefone venha sem DDI.
  defaultCountryCode: "55",

  // Arquivo de log de resultados.
  logFile: "./logs/report.jsonl",
};
