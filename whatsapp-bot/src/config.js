/**
 * Configurações centrais do bot — foco em anti-ban profissional.
 * Todas as constantes aqui podem ser sobrescritas via variáveis de ambiente.
 */
module.exports = {
  leadsFile: process.env.LEADS_FILE || "./leads.json",
  sessionDir: process.env.SESSION_DIR || "./.wwebjs_auth",
  optOutFile: process.env.OPTOUT_FILE || "./data/optout.json",
  warmupFile: process.env.WARMUP_FILE || "./data/warmup.json",
  logFile: process.env.LOG_FILE || "./logs/report.jsonl",

  defaultCountryCode: "55",

  // Template com placeholders {chave} e spintax {opt1|opt2|opt3}.
  // Sorteio de spintax é aplicado ANTES da substituição de variáveis.
  messageTemplate:
    "{Olá|Oi|Bom dia|Boa tarde}, {nome}! {Tudo bem?|Como vai?|Espero que esteja bem.}\n\n" +
    "Seu acesso ao *{condominio}* está com status: *{status}*.\n\n" +
    "{Qualquer dúvida|Se precisar de algo|Em caso de dúvidas}, é só responder esta mensagem — a portaria te atende.\n\n" +
    "— Equipe AgenddaAqui\n\n" +
    "_Caso não queira mais receber avisos por aqui, responda com a palavra *SAIR*._",

  // === RITMO DE ENVIO (Estratégia 1) ===
  // Delay aleatório entre mensagens (ms).
  minDelayMs: 20_000,
  maxDelayMs: 40_000,

  // Simulação de digitação antes do envio (ms).
  minTypingMs: 3_000,
  maxTypingMs: 5_000,

  // Pausa longa a cada N mensagens.
  batchSize: 18, // sortear entre 15 e 20 seria ideal; usamos ponto médio
  minLongPauseMs: 5 * 60 * 1000, // 5 min
  maxLongPauseMs: 10 * 60 * 1000, // 10 min

  // === WARM-UP (Estratégia 2) ===
  // Curva de aquecimento por dia desde o início. Após o último índice,
  // aplica-se dailyLimitAfterWarmup.
  warmupSchedule: [
    // Semana 1 (dias 1–7): sem envios ativos — bot só responde (não implementado aqui).
    0, 0, 0, 0, 0, 0, 0,
    // Semana 2 (dias 8–14): rampa suave
    15, 25, 40, 60, 80, 100, 120,
    // Semana 3 (dias 15–21): rampa até volume-alvo
    150, 200, 250, 300, 400, 500, 600,
  ],
  dailyLimitAfterWarmup: 800,

  // Palavras que disparam opt-out automático quando o lead responde.
  optOutKeywords: ["sair", "parar", "cancelar", "descadastrar", "stop", "unsubscribe"],
};
