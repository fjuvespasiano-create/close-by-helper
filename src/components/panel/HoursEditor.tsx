import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

const DAYS: { key: string; label: string; short: string }[] = [
  { key: "seg", label: "Segunda-feira", short: "Seg" },
  { key: "ter", label: "Terça-feira", short: "Ter" },
  { key: "qua", label: "Quarta-feira", short: "Qua" },
  { key: "qui", label: "Quinta-feira", short: "Qui" },
  { key: "sex", label: "Sexta-feira", short: "Sex" },
  { key: "sab", label: "Sábado", short: "Sáb" },
  { key: "dom", label: "Domingo", short: "Dom" },
];

const TIME_RE = /^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/;

export type HoursValue = Record<string, string> | null;

type Props = {
  value: HoursValue;
  onChange: (v: HoursValue) => void;
  disabled?: boolean;
};

type DayIntervals = { closed: boolean; intervals: [string, string][] };

function parseValue(v: HoursValue): Record<string, DayIntervals> {
  const out: Record<string, DayIntervals> = {};
  for (const d of DAYS) out[d.key] = { closed: true, intervals: [] };
  if (!v) return out;
  for (const [k, raw] of Object.entries(v)) {
    const days = expandKey(k);
    const intervals = raw.split(",").map((s) => s.trim()).filter(Boolean).map(
      (s) => {
        const m = s.match(TIME_RE);
        return (m ? [`${m[1]}:${m[2]}`, `${m[3]}:${m[4]}`] : ["", ""]) as [string, string];
      },
    );
    for (const day of days) {
      if (out[day]) {
        out[day].closed = intervals.length === 0;
        out[day].intervals = intervals;
      }
    }
  }
  return out;
}

function expandKey(k: string): string[] {
  if (k.includes("-")) {
    const order = DAYS.map((d) => d.key);
    const [a, b] = k.split("-");
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    if (ai >= 0 && bi >= 0 && ai <= bi) return order.slice(ai, bi + 1);
  }
  return [k];
}

function serialize(state: Record<string, DayIntervals>): HoursValue {
  const out: Record<string, string> = {};
  for (const d of DAYS) {
    const s = state[d.key];
    if (s.closed || s.intervals.length === 0) continue;
    const valid = s.intervals.filter(([a, b]) => /^\d{2}:\d{2}$/.test(a) && /^\d{2}:\d{2}$/.test(b));
    if (valid.length === 0) continue;
    out[d.key] = valid.map(([a, b]) => `${a}-${b}`).join(", ");
  }
  return Object.keys(out).length ? out : null;
}

function toMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export function HoursEditor({ value, onChange, disabled }: Props) {
  const state = useMemo(() => parseValue(value), [value]);

  function update(next: Record<string, DayIntervals>) {
    onChange(serialize(next));
  }

  function setClosed(day: string, closed: boolean) {
    const next = { ...state, [day]: { closed, intervals: closed ? [] : (state[day].intervals.length ? state[day].intervals : [["09:00", "18:00"] as [string, string]]) } };
    update(next);
  }

  function addInterval(day: string) {
    const next = { ...state, [day]: { closed: false, intervals: [...state[day].intervals, ["09:00", "18:00"] as [string, string]] } };
    update(next);
  }

  function removeInterval(day: string, idx: number) {
    const iv = state[day].intervals.filter((_, i) => i !== idx);
    const next = { ...state, [day]: { closed: iv.length === 0, intervals: iv } };
    update(next);
  }

  function setInterval(day: string, idx: number, which: 0 | 1, val: string) {
    const iv = state[day].intervals.map((x, i) => (i === idx ? (which === 0 ? [val, x[1]] : [x[0], val]) as [string, string] : x));
    if (which === 1) {
      const [a, b] = iv[idx];
      if (a && b && toMinutes(b) <= toMinutes(a)) {
        toast.error("O horário de término deve ser depois do início.");
        return;
      }
    }
    update({ ...state, [day]: { closed: false, intervals: iv } });
  }

  function copyFromMonday(day: string) {
    if (day === "seg") return;
    const src = state["seg"];
    update({ ...state, [day]: { closed: src.closed, intervals: src.intervals.map((x) => [...x] as [string, string]) } });
    toast.success("Copiado de segunda-feira.");
  }

  return (
    <div className="space-y-2">
      {DAYS.map((d) => {
        const s = state[d.key];
        return (
          <div key={d.key} className="rounded-lg border border-border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <span className="w-28 text-sm font-medium">{d.label}</span>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Switch checked={!s.closed} onCheckedChange={(v) => setClosed(d.key, !v)} disabled={disabled} />
                  <span>{s.closed ? "Fechado" : "Aberto"}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {d.key !== "seg" && !s.closed && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => copyFromMonday(d.key)} disabled={disabled}>
                    <Copy className="h-3 w-3" /> Copiar de segunda
                  </Button>
                )}
                {!s.closed && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={() => addInterval(d.key)} disabled={disabled}>
                    <Plus className="h-3 w-3" /> Intervalo
                  </Button>
                )}
              </div>
            </div>

            {!s.closed && s.intervals.length > 0 && (
              <div className="mt-2 space-y-2">
                {s.intervals.map(([from, to], idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input type="time" value={from} onChange={(e) => setInterval(d.key, idx, 0, e.target.value)} className="h-8 w-28" disabled={disabled} />
                    <span className="text-xs text-muted-foreground">até</span>
                    <Input type="time" value={to} onChange={(e) => setInterval(d.key, idx, 1, e.target.value)} className="h-8 w-28" disabled={disabled} />
                    {s.intervals.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeInterval(d.key, idx)} disabled={disabled}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
