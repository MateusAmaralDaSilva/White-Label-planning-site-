/**
 * Formatação de tempo para exibição, calculada na LEITURA a partir de um instante
 * real (`timestamptz`) — substitui os rótulos estáticos que ficavam congelados no
 * banco (ver migração 0015). O contrato da API segue mandando string nos campos
 * `time`/`date`; só a origem mudou (instante real → texto, a cada leitura).
 *
 * As partes ABSOLUTAS (data e hora do dia) são extraídas no fuso do app
 * (America/São_Paulo) via Intl, então independem do fuso em que o servidor roda.
 * As partes RELATIVAS ("há 5 min") são só diferença de instantes, sem fuso.
 */

const TZ = 'America/Sao_Paulo'
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** Componentes civis (ano/mês/dia/hora/min) no fuso do app, como no relógio local. */
function civil(when: Date): {
  year: number
  month: number
  day: number
  hour: string
  minute: string
} {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(when)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  // hour12:false pode devolver "24" à meia-noite em algumas engines — normaliza.
  const hour = get('hour') === '24' ? '00' : get('hour')
  return {
    year: Number(get('year')),
    month: Number(get('month')),
    day: Number(get('day')),
    hour,
    minute: get('minute'),
  }
}

/** Índice do dia civil (no fuso do app) para diferença estável entre datas. */
function civilDayIndex(when: Date): number {
  const c = civil(when)
  return Math.floor(Date.UTC(c.year, c.month - 1, c.day) / 86_400_000)
}

/** "30 jun 2026" — dia + mês abreviado + ano, no fuso do app. */
export function shortDate(when: Date): string {
  const c = civil(when)
  return `${c.day} ${MESES[c.month - 1]} ${c.year}`
}

/** "14:32" — hora do dia no fuso do app. */
export function timeOfDay(when: Date): string {
  const c = civil(when)
  return `${c.hour}:${c.minute}`
}

/** "Hoje" / "Ontem" / "30 jun 2026" — para o campo `date` (activity, news). */
export function dayLabel(when: Date, now: Date = new Date()): string {
  const diff = civilDayIndex(now) - civilDayIndex(when)
  if (diff <= 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return shortDate(when)
}

/**
 * "agora" / "há 5 min" / "há 2 h" / "há 3 d" — e, a partir de 7 dias, a data curta.
 * Para o campo `time` de notificações e chamados de suporte.
 */
export function relativeLabel(when: Date, now: Date = new Date()): string {
  const min = Math.floor((now.getTime() - when.getTime()) / 60_000)
  if (min < 1) return 'agora'
  if (min < 60) return `há ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `há ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7) return `há ${d} d`
  return shortDate(when)
}
