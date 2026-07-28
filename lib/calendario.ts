import { Animal, Campeonato } from './supabase'

export type DaySchedule = {
  date: string
  weekday: string
  time: string
  highlight?: boolean
  events: string[]
}

export const SCHEDULE: DaySchedule[] = [
  {
    date: '18/07', weekday: 'Sabado', time: '7h30', events: [
      'Saudacao aos Expositores, Criadores e Apresentadores',
      'Progenie de Mae (MB)', 'Progenie de Mae (MP)',
      'Progenie de Pai Jovem (MB)', 'Progenie de Pai Jovem (MP)',
      'Progenie de Pai Senior (MB)', 'Progenie de Pai Senior (MP)',
      'Morfologia Cavalo Junior (MB)',
      'Campeonato de Marcha Castrado Junior (MP)',
      'Morfologia Cavalo Junior (MP)',
      'Campeonato de Marcha Castrado Jovem (MP)',
      'Campeonato de Marcha Cavalo Castrado (MP)',
      'Campeonato de Marcha Castrado Junior (MB)',
      'Campeonato de Marcha Castrado Jovem (MB)',
    ]
  },
  {
    date: '19/07', weekday: 'Domingo', time: '7h30', events: [
      'Campeonato Potro Mirim (MB)', 'Campeonato Potro Mirim (MP)',
      'Campeonato Potro Mirim Maior (MB)', 'Campeonato Potro Mirim Maior (MP)',
      'Morfologia Cavalo Junior Maior (MB)',
      'Campeonato de Marcha Castrado Adulto (MP)',
      'Morfologia Cavalo Junior Maior (MP)',
      'Campeonato de Marcha Castrado Senior (MP)',
      'Morfologia Cavalo Jovem (MB)',
      'Campeonato de Marcha Castrado Graduado (MP)',
      'Morfologia Cavalo Jovem (MP)',
      'Campeonato de Marcha Cavalo Castrado (MB)',
      'Campeonato de Marcha Castrado Adulto (MB)',
      'Campeonato de Marcha Castrado Senior (MB)',
      'Campeonato de Marcha Castrado Graduado (MB)',
    ]
  },
  {
    date: '20/07', weekday: 'Segunda', time: '7h30', events: [
      'Campeonato Potro Jovem (MB)', 'Campeonato Potro Jovem (MP)',
      'Campeonato Potro Jovem Maior (MB)', 'Campeonato Potro Jovem Maior (MP)',
      'Morfologia Cavalo Jovem Maior (MB)',
      'Campeonato de Marcha Cavalo Junior (MP)',
      'Morfologia Cavalo Jovem Maior (MP)',
      'Morfologia Cavalo (MB)',
      'Campeonato de Marcha Cavalo Junior Maior (MP)',
      'Morfologia Cavalo (MP)',
      'Campeonato de Marcha Castrado Master (MB)',
      'Campeonato de Marcha Cavalo Junior (MB)',
      'Campeonato de Marcha Cavalo Junior Maior (MB)',
    ]
  },
  {
    date: '21/07', weekday: 'Terca', time: '7h30', events: [
      'Campeonato Potro (MB)', 'Campeonato Potro (MP)',
      'Campeonato Potro Maior (MB)', 'Campeonato Potro Maior (MP)',
      'Morfologia Cavalo Maior (MB)',
      'Campeonato de Marcha Cavalo Jovem (MP)',
      'Morfologia Cavalo Maior (MP)',
      'Morfologia Cavalo Adulto (MB)',
      'Campeonato de Marcha Cavalo Jovem Maior (MP)',
      'Morfologia Cavalo Adulto (MP)',
      'Campeonato de Marcha Cavalo Jovem (MB)',
      'Campeonato de Marcha Cavalo Jovem Maior (MB)',
      'Campeonato de Marcha Cavalo (MB)',
    ]
  },
  {
    date: '22/07', weekday: 'Quarta', time: '7h30', events: [
      'Campeonato Potro Junior (MB)', 'Campeonato Potro Junior (MP)',
      'Campeonato Potro Junior Maior (MB)',
      'Campeonato Potra Mirim (MP)',
      'Morfologia Cavalo Adulto Maior (MB)',
      'Campeonato de Marcha Cavalo (MP)',
      'Morfologia Cavalo Adulto Maior (MP)',
      'Morfologia Cavalo Senior (MB)',
      'Campeonato de Marcha Cavalo Maior (MP)',
      'Morfologia Cavalo Senior (MP)',
      'Campeonato de Marcha Cavalo Maior (MB)',
      'Campeonato de Marcha Cavalo Adulto (MB)',
      'Campeonato de Marcha Cavalo Adulto Maior (MB)',
    ]
  },
  {
    date: '23/07', weekday: 'Quinta', time: '7h30', events: [
      'Campeonato Potro Graduado (MB)',
      'Campeonato Potra Mirim Maior (MP)',
      'Campeonato Potro Graduado Maior (MB)',
      'Campeonato Potra Jovem (MP)',
      'Morfologia Cavalo Senior Maior (MB)',
      'Campeonato de Marcha Cavalo Adulto (MP)',
      'Morfologia Cavalo Senior Maior (MP)',
      'Morfologia Cavalo Graduado (MB)',
      'Campeonato de Marcha Cavalo Adulto Maior (MP)',
      'Morfologia Egua Junior (MP)',
      'Campeonato de Marcha Cavalo Senior (MB)',
      '19h30 - Premiacao Etapa Nacional do Caminhos do Marchador 2025/2026',
      'Campeonato de Marcha Cavalo Senior Maior (MB)',
    ]
  },
  {
    date: '24/07', weekday: 'Sexta', time: '7h30', events: [
      'Campeonato Potra Mirim (MB)',
      'Campeonato Potra Jovem Maior (MP)',
      'Campeonato Potra Mirim Maior (MB)',
      'Campeonato Potra (MP)',
      'Morfologia Cavalo Graduado Maior (MB)',
      'Campeonato de Marcha Cavalo Senior (MP)',
      'Morfologia Egua Junior Maior (MP)',
      'Morfologia Cavalo Master (MB)',
      'Campeonato de Marcha Cavalo Senior Maior (MP)',
      'Morfologia Egua Jovem (MP)',
      'Campeonato de Marcha Cavalo Graduado (MB)',
      'Campeonato de Marcha Cavalo Graduado Maior (MB)',
      'Campeonato de Marcha Cavalo Master (MB)',
    ]
  },
  {
    date: '25/07', weekday: 'Sabado', time: '7h30', events: [
      'Campeonato Potra Jovem (MB)',
      'Campeonato Potra Maior (MP)',
      'Campeonato Potra Jovem Maior (MB)',
      'Campeonato Potra Junior (MP)',
      'Morfologia Cavalo Master Maior (MB)',
      'Campeonato de Marcha Egua Junior (MP)',
      'Morfologia Egua Jovem Maior (MP)',
      'Morfologia Egua Junior (MB)',
      'Campeonato de Marcha Egua Junior Maior (MP)',
      'Morfologia Egua (MP)',
      '17h - Solenidade Oficial',
      'Campeonato de Marcha Cavalo Master Maior (MB)',
      'Campeonato de Marcha Egua Junior (MB)',
    ]
  },
  {
    date: '26/07', weekday: 'Domingo', time: '7h30', events: [
      'Campeonato Potra (MB)',
      'Campeonato Potra Junior Maior (MP)',
      'Campeonato Potra Maior (MB)',
      'Campeonato Potra Graduada (MP)',
      'Morfologia Egua Junior Maior (MB)',
      'Campeonato de Marcha Egua Jovem (MP)',
      'Morfologia Egua Maior (MP)',
      'Morfologia Egua Jovem (MB)',
      'Campeonato de Marcha Egua Jovem Maior (MP)',
      'Morfologia Egua Adulta (MP)',
      'Morfologia Egua Jovem Maior (MB)',
      'Campeonato de Marcha Egua Junior Maior (MB)',
      'Campeonato de Marcha Egua Jovem (MB)',
      'Campeonato de Marcha Egua Jovem Maior (MB)',
    ]
  },
  {
    date: '27/07', weekday: 'Segunda', time: '7h30', events: [
      'Campeonato Potra Junior (MB)',
      'Campeonato Potra Graduada Maior (MP)',
      'Campeonato Potra Junior Maior (MB)',
      'Morfologia Egua (MB)',
      'Morfologia Egua Adulta Maior (MP)',
      'Morfologia Egua Maior (MB)',
      'Campeonato de Marcha Egua (MP)',
      'Morfologia Egua Senior (MP)',
      'Morfologia Egua Adulta (MB)',
      'Campeonato de Marcha Egua Maior (MP)',
      'Campeonato de Marcha Egua (MB)',
      'Campeonato de Marcha Egua Maior (MB)',
    ]
  },
  {
    date: '28/07', weekday: 'Terca', time: '7h30', events: [
      'Campeonato Potra Graduada (MB)',
      'Morfologia Egua Senior Maior (MP)',
      'Campeonato Potra Graduada Maior (MB)',
      'Morfologia Egua Graduada (MP)',
      'Morfologia Egua Adulta Maior (MB)',
      'Campeonato de Marcha Egua Adulta Maior (MP)',
      'Morfologia Egua Graduada Maior (MP)',
      'Morfologia Egua Senior (MB)',
      'Campeonato de Marcha Egua Adulta (MP)',
      'Morfologia Egua Senior Maior (MB)',
      'Campeonato de Marcha Egua Adulta (MB)',
      'Campeonato de Marcha Egua Adulta Maior (MB)',
      'Campeonato de Marcha Egua Senior (MB)',
    ]
  },
  {
    date: '29/07', weekday: 'Quarta', time: '7h30', events: [
      'Campeonato Potra Master (MB)',
      'Campeonato Potra Master Maior (MB)',
      'Morfologia Egua Graduada (MB)',
      'Campeonato de Marcha Egua Senior (MP)',
      'Morfologia Egua Master (MP)',
      'Morfologia Egua Graduada Maior (MB)',
      'Campeonato de Marcha Egua Senior Maior (MP)',
      'Morfologia Egua Master Maior (MP)',
      'Campeonato de Marcha Egua Graduada (MP)',
      'Campeonato de Marcha Egua Senior Maior (MB)',
      'Campeonato de Marcha Egua Graduada (MB)',
    ]
  },
  {
    date: '30/07', weekday: 'Quinta', time: '7h30', events: [
      'Campeonato de Marcha Egua Graduada Maior (MP)',
      'Morfologia Egua Master (MB)',
      'Campeonato de Marcha Egua Master (MP)',
      'Morfologia Egua Master Maior (MB)',
      'Campeonato de Marcha Egua Master Maior (MP)',
      'Campeonato de Marcha Egua Graduada Maior (MB)',
      'Campeonato de Marcha Egua Master (MB)',
      'Campeonato de Marcha Egua Master Maior (MB)',
    ]
  },
  {
    date: '31/07', weekday: 'Sexta', time: '8h', highlight: true, events: [
      'Grande Campeonato Jovem da Raca Machos (MB)',
      'Grande Campeonato Jovem da Raca Machos (MP)',
      'Grande Campeonato Jovem da Raca Femeas (MB)',
      'Grande Campeonato Jovem da Raca Femeas (MP)',
      'Provas Sociais',
    ]
  },
  {
    date: '01/08', weekday: 'Sabado', time: '8h', highlight: true, events: [
      'Morfologia dos Grandes Campeonatos Adultos da Raca',
      'Campeao dos Campeoes Castrado (MP)',
      'Campeao dos Campeoes Castrado (MB)',
      'Campeao dos Campeoes (MP)',
      'Campeao dos Campeoes (MB)',
      'Campea das Campeas (MP)',
      'Campea das Campeas (MB)',
      'Encerramento e Premiacao Final',
    ]
  },
]

export function getEventType(evt: string): 'morfologia' | 'marcha' | 'campeonato' | 'especial' | 'progenie' {
  if (evt.match(/^\d+h|Saudacao|Solenidade|Premiacao|Encerramento|Provas Sociais/)) return 'especial'
  if (evt.startsWith('Progenie')) return 'progenie'
  if (evt.startsWith('Morfologia')) return 'morfologia'
  if (evt.includes('Campeonato de Marcha') || evt.includes('Campeao') || evt.includes('Campea') || evt.includes('Grande Campeonato')) return 'marcha'
  return 'campeonato'
}

export function getMarchaType(evt: string): 'MB' | 'MP' | null {
  if (evt.endsWith('(MB)')) return 'MB'
  if (evt.endsWith('(MP)')) return 'MP'
  return null
}

export function isToday(dateStr: string): boolean {
  const now = new Date()
  const [day, month] = dateStr.split('/')
  const year = 2026
  return now.getDate() === parseInt(day) && (now.getMonth() + 1) === parseInt(month) && now.getFullYear() === year
}

export function isPast(dateStr: string): boolean {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const [day, month] = dateStr.split('/')
  const year = 2026
  const eventDate = new Date(year, parseInt(month) - 1, parseInt(day))
  return eventDate < now
}

// --- Vinculo animal <-> calendario ---------------------------------------
// Um animal entra na pista nas provas da sua categoria. Dependendo do tipo de
// campeonato ele participa de provas diferentes:
//   - Convencional: Morfologia + Campeonato de Marcha (2 entradas) para adultos;
//                   Campeonato unico para potros/potras (mirim, jovem, etc.)
//   - Castrado / Exclusivamente Marcha: apenas prova de marcha (sem morfologia)
// Os nomes no calendario nao tem acento e usam abreviacoes proprias, entao a
// comparacao e feita sobre uma forma normalizada do "assunto" de cada evento.

export type AnimalScheduleEntry = {
  date: string
  weekday: string
  time: string
  highlight?: boolean
  evt: string
  kind: 'morfologia' | 'marcha' | 'campeonato'
}

function normalize(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// Extrai o "assunto" (categoria) de um evento do calendario, sem o prefixo e
// sem o sufixo de marcha. Retorna kind=null para eventos que nao sao provas de
// categoria (progenie, solenidades, grandes campeonatos, etc.).
function eventSubject(evt: string): {
  subject: string
  kind: 'morfologia' | 'marcha' | 'campeonato' | null
  marcha: 'MB' | 'MP' | null
} {
  const marcha = getMarchaType(evt)
  let s = evt.replace(/\s*\((MB|MP)\)\s*$/, '')
  let kind: 'morfologia' | 'marcha' | 'campeonato' | null = null
  if (s.startsWith('Morfologia ')) { kind = 'morfologia'; s = s.slice('Morfologia '.length) }
  else if (s.startsWith('Campeonato de Marcha ')) { kind = 'marcha'; s = s.slice('Campeonato de Marcha '.length) }
  else if (s.startsWith('Campeonato ')) { kind = 'campeonato'; s = s.slice('Campeonato '.length) }
  else return { subject: '', kind: null, marcha }
  return { subject: normalize(s), kind, marcha }
}

// Formas aceitaveis da categoria do animal, normalizadas. O castrado aparece no
// calendario tanto como "Cavalo Castrado" (categoria base) quanto sem o "Cavalo"
// nas subcategorias ("Castrado Adulto", "Castrado Junior", ...).
function animalCategorySubjects(categoria: string): string[] {
  const c = normalize(categoria)
  const set = new Set<string>([c])
  if (c.startsWith('cavalo castrado')) set.add(c.replace(/^cavalo /, ''))
  return [...set]
}

export function getAnimalSchedule(
  animal: Pick<Animal, 'categoria' | 'tipo_marcha' | 'tipo_campeonato'>
): AnimalScheduleEntry[] {
  if (!animal.categoria || !animal.tipo_marcha) return []

  // Convencional disputa morfologia + marcha; castrado e exclusivamente marcha
  // nao tem prova de morfologia.
  const allowedKinds: Array<'morfologia' | 'marcha' | 'campeonato'> =
    animal.tipo_campeonato === 'Convencional'
      ? ['morfologia', 'marcha', 'campeonato']
      : ['marcha', 'campeonato']

  const subjects = animalCategorySubjects(animal.categoria)
  const out: AnimalScheduleEntry[] = []

  for (const day of SCHEDULE) {
    for (const evt of day.events) {
      const e = eventSubject(evt)
      if (!e.kind) continue
      if (e.marcha !== animal.tipo_marcha) continue
      if (!allowedKinds.includes(e.kind)) continue
      if (!subjects.includes(e.subject)) continue
      out.push({
        date: day.date,
        weekday: day.weekday,
        time: day.time,
        highlight: day.highlight,
        evt,
        kind: e.kind,
      })
    }
  }
  return out
}

// --- Vinculo evento do calendario <-> campeonato --------------------------
// O mesmo "assunto" (categoria normalizada) usado pra achar as provas de um
// animal serve pra achar, entre os campeonatos cadastrados, qual e o dono de
// um evento do calendario - permite clicar num evento e ir direto pro
// catalogo filtrado daquela categoria. Eventos sem categoria propria
// (progenie, solenidades, Grande Campeonato/Campeao dos Campeoes - que somam
// varias categorias) simplesmente nao tem correspondente e ficam sem link.
// Usado pelo filtro de categoria do calendario: um evento "e" de uma
// categoria se o assunto normalizado bater, independente da modalidade
// (Convencional/Exclusivamente Marcha) - a pessoa so quer saber quando a
// categoria dela entra na pista.
export function eventMatchesCategoria(evt: string, categoria: string): boolean {
  const e = eventSubject(evt)
  if (!e.kind) return false
  return animalCategorySubjects(categoria).includes(e.subject)
}

export function findCampeonatoParaEvento(
  evt: string,
  campeonatos: Pick<Campeonato, 'nome' | 'categoria' | 'tipo_marcha'>[]
): string | null {
  const e = eventSubject(evt)
  if (!e.kind || !e.marcha) return null
  const match = campeonatos.find(c =>
    c.tipo_marcha === e.marcha && animalCategorySubjects(c.categoria).includes(e.subject)
  )
  return match?.nome ?? null
}
