export const newsSectors = ['Tecnología', 'Marketing', 'Finanzas', 'Educación y salud', 'Comercio y servicios', 'Otro sector'] as const;
export type NewsSector = typeof newsSectors[number];
export type NewsArticle = { id: string; sector: NewsSector; title: string; summary: string; body: string; publishedAt: string; source: string };

/** Semana de calendario local, de lunes a domingo; el fin es exclusivo. */
export function calendarWeek(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  const end = new Date(start); end.setDate(start.getDate() + 7);
  return { start, end };
}

/** Datos ficticios: se regenera la fecha de ejemplo al cambiar de semana. */
export function getMockWeeklyNews(now: Date): NewsArticle[] {
  const { start } = calendarWeek(now);
  return [{ id: 'mock-tech-weekly', sector: 'Tecnología', title: 'Nuevos espacios de aprendizaje impulsan el talento tecnológico', summary: 'Una iniciativa ficticia propone acompañamiento y formación para apoyar el desarrollo profesional en tecnología.', body: 'Esta noticia es un ejemplo inventado para mostrar cómo aparecerán las noticias relevantes de tu sector. Cuando conectemos el backend, aquí podrás consultar información de fuentes reales publicada durante la semana seleccionada.', publishedAt: start.toISOString(), source: 'Noticia ficticia · SheReady' }];
}
