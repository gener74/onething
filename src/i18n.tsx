/* eslint-disable react-refresh/only-export-components -- provider + hook + constants conviuen a propòsit en aquest mòdul i18n */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

/**
 * i18n lleuger fet a mida (sense dependències). Tres idiomes: anglès, català,
 * espanyol. Detecta l'idioma del navegador (per defecte anglès) i recorda la tria
 * a localStorage. `t(clau, vars)` interpola `{x}`; `tn(base, n)` tria singular/plural.
 */

export type Lang = 'en' | 'ca' | 'es'

export const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'ca', label: 'CA' },
  { code: 'es', label: 'ES' },
]

const STORAGE_KEY = 'onething-lang'

function detect(): Lang {
  // Un enllaç pot fixar l'idioma amb ?lang=ca|es|en (p. ex. per compartir-la amb
  // amics). Té prioritat i es DESA, perquè la tria persisteixi després — també
  // quan s'obre la PWA instal·lada, que arrenca a /?app=1 sense el paràmetre.
  const fromUrl = new URLSearchParams(location.search).get('lang')
  if (fromUrl === 'en' || fromUrl === 'ca' || fromUrl === 'es') {
    localStorage.setItem(STORAGE_KEY, fromUrl)
    return fromUrl
  }
  // Si l'usuari ha triat un idioma abans, el respectem. Per defecte, anglès (el
  // més universal); no detectem el del navegador a propòsit.
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === 'en' || saved === 'ca' || saved === 'es') return saved
  return 'en'
}

type Dict = Record<string, string>

const DICT: Record<Lang, Dict> = {
  en: {
    bucket_now: 'Now',
    bucket_next: 'Later',
    bucket_someday: 'Someday',
    view_done: 'View completed tasks',
    done_today_one: '{n} done today',
    done_today_other: '{n} done today',
    today_short: 'today',
    lets_start: 'let’s start',
    input_placeholder: 'What’s on your mind?…',
    add_aria: 'Add a thing',
    add: 'Add',
    empty_title: 'One thing at a time.',
    empty_motto: 'You don’t have to do it all. Just the next thing.',
    empty_hint: 'Write what’s on your mind up there. The rest can wait.',
    nothing_here: 'Nothing here.',
    start: 'Start',
    resume: 'Resume',
    mark_done: 'Mark as done',
    delete: 'Delete',
    move_to: 'Move to {label}',
    data_local: 'Your data lives only on this device.',
    save_copy: 'Save a copy',
    save_copy_title: 'Download a file with all your tasks, to keep it or move it to another device',
    recover: 'Recover',
    recover_title: 'Restore tasks from a file you saved',
    import_none: 'There were no tasks to import.',
    import_done_one: '{n} task imported.',
    import_done_other: '{n} tasks imported.',
    import_error: 'Couldn’t import this file.',
    reward: 'One less. Breathe.',
    close: 'Close',
    close_focus_aria: 'Close focus mode',
    thinking: 'Thinking…',
    your_goal: 'Your only goal now',
    step_of: 'Step {i} of {n}',
    done_next: 'I did it →',
    done_check: 'Done ✓',
    feeling_q: 'How do you feel?',
    feeling_clar: 'I’m clear on it',
    feeling_mandra: 'I can’t be bothered',
    feeling_bloquejat: 'I’m stuck',
    feeling_ansietat: 'It gives me anxiety',
    time_q: 'How much time do you have now?',
    minutes_one: '{n} minute',
    minutes_other: '{n} minutes',
    no_limit: 'No limit',
    back: 'Back',
    checkin_q: 'Your time’s up. How did it go?',
    checkin_done: 'I did it ✓',
    checkin_more: 'Still on it',
    checkin_distracted: 'I got distracted',
    distracted_msg: 'No problem. Let’s go back to where we were.',
    cheer_started: 'You’ve started.',
    gate_private: 'This version is still private.',
    gate_password: 'Password',
    gate_wrong: 'That’s not it. Try again.',
    gate_enter: 'Enter',
    done_title: 'Done',
    done_subtitle: 'What you’ve already got off your mind. No rush.',
    done_empty: 'You haven’t completed anything yet. It’ll come.',
    undo: 'Undo',
    undo_title: 'Reopen it',
    close_aria: 'Close',
    day_today: 'Today',
    day_yesterday: 'Yesterday',
    install: 'Install OneThing',
    install_ios: 'To install it: tap Share and “Add to Home Screen”.',
    dismiss: 'Dismiss',
    edit: 'Edit',
    regen: 'Different steps',
    leave_for_now: 'Leave for now',
    leaving_progress: 'You’ve made progress. Come back whenever.',
    leaving_fresh: 'No problem. Come back whenever.',
    clear_all: 'Clear all',
    clear_all_confirm: 'Delete all? This can’t be undone.',
    confirm_yes: 'Yes, clear',
    cancel: 'Cancel',
    theme_toggle: 'Theme',
    theme_light: 'Light',
    theme_dark: 'Dark',
    decide: 'Decide for me',
    steps_done_q: 'You’ve done all the steps. How did it go?',
    finished: 'It’s done ✓',
    keep_going: 'One more step',
    ai_limit_reached: 'You’ve used today’s AI help. Here’s a basic first step — it’s back tomorrow.',
    ai_remaining_one: '{n} AI breakdown left today',
    ai_remaining_other: '{n} AI breakdowns left today',
    privacy: 'Privacy',
    feedback: 'Feedback',
    too_big: 'Too big',
    feel_now_q: 'How do you feel now?',
    feel_better: 'Better',
    feel_same: 'The same',
    feel_worse: 'Worse',
    feel_thanks: 'Thanks for pausing to notice.',
  },
  ca: {
    bucket_now: 'Ara',
    bucket_next: 'Després',
    bucket_someday: 'Algun dia',
    view_done: 'Veure les tasques fetes',
    done_today_one: '{n} feta avui',
    done_today_other: '{n} fetes avui',
    today_short: 'avui',
    lets_start: 'comencem',
    input_placeholder: 'Què tens al cap?…',
    add_aria: 'Afegir una cosa',
    add: 'Afegir',
    empty_title: 'Una cosa a la vegada.',
    empty_motto: 'No cal fer-ho tot. Només la següent cosa.',
    empty_hint: 'Escriu què tens al cap aquí dalt. La resta pot esperar.',
    nothing_here: 'Res aquí.',
    start: 'Comença',
    resume: 'Reemprèn',
    mark_done: 'Marcar com a feta',
    delete: 'Esborrar',
    move_to: 'Mou a {label}',
    data_local: 'Les teves dades viuen només en aquest dispositiu.',
    save_copy: 'Desa una còpia',
    save_copy_title: 'Baixa un fitxer amb totes les teves tasques, per guardar-lo o passar-lo a un altre dispositiu',
    recover: 'Recupera',
    recover_title: 'Recupera les tasques des d’un fitxer que havies desat',
    import_none: 'No hi havia tasques per importar.',
    import_done_one: '{n} tasca importada.',
    import_done_other: '{n} tasques importades.',
    import_error: 'No s’ha pogut importar aquest fitxer.',
    reward: 'Una menys. Respira.',
    close: 'Tanca',
    close_focus_aria: 'Tancar el mode focus',
    thinking: 'Pensant…',
    your_goal: 'El teu únic objectiu ara',
    step_of: 'Pas {i} de {n}',
    done_next: 'Ho he fet →',
    done_check: 'Fet ✓',
    feeling_q: 'Com et sents?',
    feeling_clar: 'Ho tinc clar',
    feeling_mandra: 'Em fa mandra',
    feeling_bloquejat: 'Estic bloquejat',
    feeling_ansietat: 'Em genera ansietat',
    time_q: 'Quant temps tens ara?',
    minutes_one: '{n} minut',
    minutes_other: '{n} minuts',
    no_limit: 'Sense límit',
    back: 'Enrere',
    checkin_q: 'S’ha acabat el temps que t’havies donat. Com ha anat?',
    checkin_done: 'Ho he fet ✓',
    checkin_more: 'Encara hi soc',
    checkin_distracted: 'M’he distret',
    distracted_msg: 'Cap problema. Tornem al punt on érem.',
    cheer_started: 'Ja has començat.',
    gate_private: 'Aquesta versió encara és privada.',
    gate_password: 'Contrasenya',
    gate_wrong: 'No és aquesta. Torna-ho a provar.',
    gate_enter: 'Entra',
    done_title: 'Fetes',
    done_subtitle: 'El que ja has tret del cap. Sense pressa.',
    done_empty: 'Encara no has completat res. Tot arriba.',
    undo: 'Desfer',
    undo_title: 'Tornar-la a obrir',
    close_aria: 'Tancar',
    day_today: 'Avui',
    day_yesterday: 'Ahir',
    install: 'Instal·la OneThing',
    install_ios: 'Per instal·lar-la: toca Compartir i «Afegeix a la pantalla d’inici».',
    dismiss: 'Descartar',
    edit: 'Edita',
    regen: 'Uns altres passos',
    leave_for_now: 'Ho deixo per ara',
    leaving_progress: 'Ja has avançat. Torna quan vulguis.',
    leaving_fresh: 'Cap problema. Torna quan vulguis.',
    clear_all: 'Esborra-ho tot',
    clear_all_confirm: 'Esborrar-ho tot? No es pot desfer.',
    confirm_yes: 'Sí, esborra',
    cancel: 'Cancel·la',
    theme_toggle: 'Tema',
    theme_light: 'Clar',
    theme_dark: 'Fosc',
    decide: 'Decideix per mi',
    steps_done_q: 'Has fet tots els passos. Com ha anat?',
    finished: 'Ja està fet ✓',
    keep_going: 'Un pas més',
    ai_limit_reached: 'Avui ja has fet servir l’ajuda de la IA. Aquí tens un primer pas bàsic; demà torna.',
    ai_remaining_one: 'Et queda {n} desglossament d’IA avui',
    ai_remaining_other: 'Et queden {n} desglossaments d’IA avui',
    privacy: 'Privacitat',
    feedback: 'Comentaris',
    too_big: 'Massa gran',
    feel_now_q: 'Com et sents ara?',
    feel_better: 'Millor',
    feel_same: 'Igual',
    feel_worse: 'Pitjor',
    feel_thanks: 'Gràcies per parar a notar-ho.',
  },
  es: {
    bucket_now: 'Ahora',
    bucket_next: 'Después',
    bucket_someday: 'Algún día',
    view_done: 'Ver las tareas hechas',
    done_today_one: '{n} hecha hoy',
    done_today_other: '{n} hechas hoy',
    today_short: 'hoy',
    lets_start: 'empecemos',
    input_placeholder: '¿Qué tienes en la cabeza?…',
    add_aria: 'Añadir una cosa',
    add: 'Añadir',
    empty_title: 'Una cosa a la vez.',
    empty_motto: 'No hace falta hacerlo todo. Solo la siguiente cosa.',
    empty_hint: 'Escribe qué tienes en la cabeza aquí arriba. El resto puede esperar.',
    nothing_here: 'Nada aquí.',
    start: 'Empieza',
    resume: 'Reanuda',
    mark_done: 'Marcar como hecha',
    delete: 'Borrar',
    move_to: 'Mover a {label}',
    data_local: 'Tus datos viven solo en este dispositivo.',
    save_copy: 'Guarda una copia',
    save_copy_title: 'Descarga un archivo con todas tus tareas, para guardarlo o pasarlo a otro dispositivo',
    recover: 'Recupera',
    recover_title: 'Recupera las tareas desde un archivo que habías guardado',
    import_none: 'No había tareas para importar.',
    import_done_one: '{n} tarea importada.',
    import_done_other: '{n} tareas importadas.',
    import_error: 'No se ha podido importar este archivo.',
    reward: 'Una menos. Respira.',
    close: 'Cierra',
    close_focus_aria: 'Cerrar el modo foco',
    thinking: 'Pensando…',
    your_goal: 'Tu único objetivo ahora',
    step_of: 'Paso {i} de {n}',
    done_next: 'Lo he hecho →',
    done_check: 'Hecho ✓',
    feeling_q: '¿Cómo te sientes?',
    feeling_clar: 'Lo tengo claro',
    feeling_mandra: 'Me da pereza',
    feeling_bloquejat: 'Estoy bloqueado',
    feeling_ansietat: 'Me genera ansiedad',
    time_q: '¿Cuánto tiempo tienes ahora?',
    minutes_one: '{n} minuto',
    minutes_other: '{n} minutos',
    no_limit: 'Sin límite',
    back: 'Atrás',
    checkin_q: 'Se acabó el tiempo que te habías dado. ¿Cómo ha ido?',
    checkin_done: 'Lo he hecho ✓',
    checkin_more: 'Sigo en ello',
    checkin_distracted: 'Me he distraído',
    distracted_msg: 'Sin problema. Volvamos al punto donde estábamos.',
    cheer_started: 'Ya has empezado.',
    gate_private: 'Esta versión todavía es privada.',
    gate_password: 'Contraseña',
    gate_wrong: 'No es esta. Inténtalo de nuevo.',
    gate_enter: 'Entra',
    done_title: 'Hechas',
    done_subtitle: 'Lo que ya te has quitado de la cabeza. Sin prisa.',
    done_empty: 'Todavía no has completado nada. Todo llega.',
    undo: 'Deshacer',
    undo_title: 'Volver a abrirla',
    close_aria: 'Cerrar',
    day_today: 'Hoy',
    day_yesterday: 'Ayer',
    install: 'Instala OneThing',
    install_ios: 'Para instalarla: toca Compartir y «Añadir a pantalla de inicio».',
    dismiss: 'Descartar',
    edit: 'Editar',
    regen: 'Otros pasos',
    leave_for_now: 'Lo dejo por ahora',
    leaving_progress: 'Ya has avanzado. Vuelve cuando quieras.',
    leaving_fresh: 'Sin problema. Vuelve cuando quieras.',
    clear_all: 'Borrar todo',
    clear_all_confirm: '¿Borrar todo? No se puede deshacer.',
    confirm_yes: 'Sí, borra',
    cancel: 'Cancelar',
    theme_toggle: 'Tema',
    theme_light: 'Claro',
    theme_dark: 'Oscuro',
    decide: 'Decide por mí',
    steps_done_q: 'Has hecho todos los pasos. ¿Cómo ha ido?',
    finished: 'Ya está hecho ✓',
    keep_going: 'Un paso más',
    ai_limit_reached: 'Hoy ya has usado la ayuda de la IA. Aquí tienes un primer paso básico; mañana vuelve.',
    ai_remaining_one: 'Te queda {n} desglose de IA hoy',
    ai_remaining_other: 'Te quedan {n} desgloses de IA hoy',
    privacy: 'Privacidad',
    feedback: 'Comentarios',
    too_big: 'Demasiado grande',
    feel_now_q: '¿Cómo te sientes ahora?',
    feel_better: 'Mejor',
    feel_same: 'Igual',
    feel_worse: 'Peor',
    feel_thanks: 'Gracias por parar a notarlo.',
  },
}

type Vars = Record<string, string | number>

function interpolate(s: string, vars?: Vars): string {
  if (!vars) return s
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`))
}

interface I18nValue {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string, vars?: Vars) => string
  tn: (base: string, n: number, vars?: Vars) => string
}

const Ctx = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detect)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  function setLang(l: Lang) {
    localStorage.setItem(STORAGE_KEY, l)
    setLangState(l)
  }

  function t(key: string, vars?: Vars): string {
    const s = DICT[lang][key] ?? DICT.en[key] ?? key
    return interpolate(s, vars)
  }

  function tn(base: string, n: number, vars?: Vars): string {
    return t(`${base}_${n === 1 ? 'one' : 'other'}`, { n, ...vars })
  }

  return <Ctx.Provider value={{ lang, setLang, t, tn }}>{children}</Ctx.Provider>
}

export function useI18n(): I18nValue {
  const c = useContext(Ctx)
  if (!c) throw new Error('useI18n ha d’anar dins de <I18nProvider>')
  return c
}
