import AsyncStorage from '@react-native-async-storage/async-storage';

/** Las mismas preguntas para todas las usuarias. */
export const INITIAL_QUESTIONS = [
  'Para empezar, cuéntame un poco de ti y de lo que te gustaría compartir sobre tu trayectoria.',
  '¿Qué experiencia o logro te hace sentir orgullosa? ¿Qué hiciste para conseguirlo?',
  'Cuando aparece un reto o algo no sale como esperabas, ¿cómo sueles afrontarlo?',
  '¿Cómo te gusta colaborar con otras personas y qué crees que aportas a un equipo?',
  '¿Qué te gustaría mejorar o sentir con más confianza en tu próximo paso profesional?',
] as const;

export type TargetRole = { role: string; company: string; offerUrl: string; description: string };
export type GettingStarted = { initialAnswers: string[] | null; targetRole: TargetRole | null };
export const emptyGettingStarted: GettingStarted = { initialAnswers: null, targetRole: null };
const STORAGE_KEY = '@sheready/getting-started-v1';

export async function loadGettingStarted(): Promise<GettingStarted> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyGettingStarted;
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Datos inválidos');
  const data = value as Partial<GettingStarted>;
  if (data.initialAnswers != null && (!Array.isArray(data.initialAnswers) || data.initialAnswers.length !== INITIAL_QUESTIONS.length || !data.initialAnswers.every(answer => typeof answer === 'string' && answer.trim()))) throw new Error('Respuestas inválidas');
  const role = data.targetRole;
  if (role != null && (typeof role !== 'object' || !['role', 'company', 'offerUrl', 'description'].every(key => typeof role[key as keyof TargetRole] === 'string'))) throw new Error('Puesto inválido');
  return { initialAnswers: data.initialAnswers ?? null, targetRole: role ?? null };
}
export async function saveGettingStarted(data: GettingStarted): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
