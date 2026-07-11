/**
 * Controle de warm-up (aquecimento) e limite diário.
 * Persiste em disco a data de início do chip e o contador do dia.
 */
const config = require("./config");
const { readJson, writeJson } = require("./utils");

function todayKey() { return new Date().toISOString().slice(0, 10); }

function load() {
  const data = readJson(config.warmupFile, { startDate: null, dayCounter: {} });
  if (!data.startDate) data.startDate = todayKey();
  if (!data.dayCounter || typeof data.dayCounter !== "object") data.dayCounter = {};
  return data;
}

function save(d) { writeJson(config.warmupFile, d); }

/** Retorna quantos dias se passaram desde o início (0-indexed). */
function daysSinceStart() {
  const d = load();
  const start = new Date(d.startDate + "T00:00:00Z");
  const now = new Date(todayKey() + "T00:00:00Z");
  return Math.floor((now - start) / (24 * 60 * 60 * 1000));
}

/** Limite de envios permitidos hoje segundo a curva de warm-up. */
function todayLimit() {
  const idx = daysSinceStart();
  const sched = config.warmupSchedule;
  return idx < sched.length ? sched[idx] : config.dailyLimitAfterWarmup;
}

/** Quantas mensagens já enviadas hoje. */
function sentToday() {
  const d = load();
  return d.dayCounter[todayKey()] || 0;
}

/** Registra +1 envio hoje. */
function recordSent() {
  const d = load();
  const key = todayKey();
  d.dayCounter[key] = (d.dayCounter[key] || 0) + 1;
  save(d);
  return d.dayCounter[key];
}

/** Reseta o warm-up (ex.: chip novo). */
function reset() {
  save({ startDate: todayKey(), dayCounter: {} });
}

/** Retorna quantas ainda cabem hoje (nunca negativo). */
function remainingToday() {
  return Math.max(0, todayLimit() - sentToday());
}

function status() {
  return {
    dayIndex: daysSinceStart() + 1,
    startDate: load().startDate,
    limit: todayLimit(),
    sent: sentToday(),
    remaining: remainingToday(),
  };
}

module.exports = { todayLimit, sentToday, recordSent, reset, remainingToday, status, daysSinceStart };
