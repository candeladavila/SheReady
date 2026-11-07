import { getAccessToken } from './access';
import type { ProfileDocument } from './profileDocument';
/** Cliente compartido para la API de SheReady. No incluyas claves de proveedor aquí. */
export type PlannedActivity = { type: 'guided_reflection' | 'written_practice'; title: string; description: string; objective: string; improvement_area: string; skill: string; duration_minutes: number; instructions: string[]; prompts: string[]; color: string };
export type RolePlan = { id: string; status: 'generating' | 'ready' | 'failed'; role: { title: string; sector: string; company: string; offer_url: string; offer_description: string }; plan: { activities: PlannedActivity[] } | null };
export type InterviewReport = { version: 'interview-report-v1'; headline: string; summary: string; worked: string; improvement: string; focus: string; skills: Array<{ label: string; level: 'fuerte' | 'en_desarrollo' | 'a_reforzar'; evidence: string }>; strengths: Array<{ title: string; evidence: string }>; focus_title: string; focus_explanation: string; focus_advice: string; checklist: string[]; improvements: Array<{ turn_id: string; title: string; observation: string; original_excerpt: string; framework: string; parts: Array<{label: string; text: string}>; why: string[] }> };
export type Skill = 'technical' | 'communication' | 'teamwork' | 'problem_solving' | 'self_presentation';
export type Category = 'technical' | 'professional_situation' | 'soft_skills';
export type Duration = 1 | 3 | 5 | 10 | 15;

type ProfileFields = {
  age: number;
  sector: string;
  target_role: string;
  experience_years: number;
  daily_minutes: number;
  strengths: string[];
  improvement_areas: string[];
};

export type ProfileInput = ProfileFields & (
  | { interview_date: string; interview_in_days?: never }
  | { interview_date?: never; interview_in_days: number }
);
export type Profile = Omit<ProfileFields, 'age' | 'sector' | 'target_role' | 'experience_years' | 'daily_minutes'> & {
  age: number | null; sector: string | null; target_role: string | null; experience_years: number | null; daily_minutes: number | null;
  onboarding_document?: ProfileDocument;
  goals?: string[]; age_range?: string | null; daily_time_choice?: string | null;
  id: string;
  interview_date: string | null;
  days_until_interview: number | null;
  created_at: string;
  updated_at: string;
};
export type Question = { text: string; skill: Skill; category: Category };
export type Feedback = {
  summary: string;
  strengths: string[];
  improvements: { turn_id: string; suggestion: string; reformulation: string }[];
  recommended_activities: { skill: Skill; activity: string }[];
};
export type Activity = Question & {
  id: string; date: string; title: string; instructions: string;
  answer: string | null; feedback: Feedback | null; completed_at: string | null; source: 'ai';
};
export type Turn = { id: string; position: number; question: Question; answer: string | null; answered_at: string | null };
export type Interview = {
  id: string; status: 'active' | 'completed'; duration_minutes: Duration; max_questions: number;
  answered_questions: number; ready_to_finish: boolean; current_turn: Turn | null;
  turns: Turn[]; feedback: Feedback | InterviewReport | null; created_at: string; finished_at: string | null;
  profile_snapshot: Omit<ProfileFields, 'age'> & { interview_date: string }; disclaimer: string;
};
export type InterviewSummary = Pick<Interview, 'id' | 'status' | 'duration_minutes' | 'created_at' | 'finished_at'> & { summary: string | null; company?: string; role?: string };
export type Page<T> = { items: T[]; total: number };
export type Progress = {
  completed_wellbeing?: number; completed_activities: number; completed_interviews: number; answered_interview_questions: number;
  completed_breathing: number; completed_confidence: number; completed_personalized: number; streak_days: number;
  week: { date: string; completed: boolean }[]; recent_events: { date: string; label: string }[]; improvement_areas: string[];
  skills: { id: Skill; label: string; practices: number }[];
  milestones: { id: string; label: string; current: number; target: number; achieved: boolean }[];
  recommendations: Feedback[]; measurement: string;
};
export type ProfileOptions = {
  skills: { id: Skill; label: string }[];
  interview_timeframes: { label: string; days: number }[];
  daily_minutes: number[];
  strengths_and_improvement_areas_allow_custom_text: boolean;
};
export type SampleContent<T> = { source: 'sample'; is_sample: true; items: T[] };
export type NewsItem = { id: string; title: string; description: string; url: string; publisher: string; author: string; published_at: string | null; language: string; sectors: string[]; imported_at: string | null; image_url: string | null };
export type EventItem = { id: string; title: string; description: string; url: string; starts_at: string; city: string; location: string; address: string; organizer: string; sectors: string[]; source: string; license: string; license_url: string };
export type ContentFeed<T> = { source: string; is_sample: false; items: T[]; status: 'ok' | 'disabled' | 'error' | 'stale' | 'curated'; message?: string; updated_at: string | null; total: number };
export type WellbeingItem = { id: string; title: string; duration_minutes: number; steps: string[] };
export type AuthSession = { access_token: string; token_type: string; expires_at: string; expires_in: number; user: { id: string; email: string; display_name: string | null; created_at: string } };
export type NativeAudio = { uri: string; name: string; type: string };
// Leave room for multipart headers below Vercel's function request limit.
const MAX_AUDIO_BYTES = 4_000_000;

export class ApiError extends Error {
  constructor(public readonly status: number | null, message: string, public readonly detail?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

type Options = { baseUrl: string; getToken?: () => string | null | Promise<string | null>; timeoutMs?: number; requireAuth?: boolean };
type RequestOptions = { method?: 'GET' | 'POST' | 'PUT' | 'DELETE'; json?: unknown; form?: FormData; response?: 'json' | 'blob' | 'empty'; signal?: AbortSignal };

/** Se puede pasar un proveedor de token en el futuro sin cambiar las pantallas. */
export function createApiClient({ baseUrl, getToken, timeoutMs = 210_000, requireAuth = false }: Options) {
  const root = baseUrl.trim().replace(/\/+$/, '');

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    if (!/^https?:\/\//i.test(root)) {
      throw new ApiError(null, 'Configura EXPO_PUBLIC_API_URL con la dirección completa de la API.');
    }
    const controller = new AbortController();
    let timedOut = false;
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) controller.abort();
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, timeoutMs);
    try {
      const token = await getToken?.();
      if (requireAuth && !token && !['/auth/login', '/auth/register', '/news', '/events'].includes(path.split('?')[0])) throw new ApiError(401, 'Inicia sesión para guardar tu progreso y practicar entrevistas.');
      const headers: Record<string, string> = { Accept: options.response === 'blob' ? 'audio/wav' : 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;
      if (options.json !== undefined) headers['Content-Type'] = 'application/json';
      const result = await fetch(`${root}${path}`, {
        method: options.method ?? 'GET', headers, signal: controller.signal,
        body: options.form ?? (options.json === undefined ? undefined : JSON.stringify(options.json)),
      });
      if (!result.ok) {
        let detail: unknown;
        try { detail = (await result.json()).detail; } catch { detail = undefined; }
        throw new ApiError(result.status, typeof detail === 'string' ? detail : `Error de la API (${result.status}).`, detail);
      }
      if (options.response === 'empty' || result.status === 204) return undefined as T;
      if (options.response === 'blob') return await result.blob() as T;
      try { return await result.json() as T; }
      catch { throw new ApiError(result.status, 'La API devolvió una respuesta que no es JSON.'); }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError(null, 'La petición ha tardado demasiado. Inténtalo de nuevo.');
      if (options.signal?.aborted) throw new ApiError(null, 'La petición se ha cancelado.');
      throw new ApiError(null, 'No se ha podido conectar con la API. Comprueba la dirección y la conexión.');
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  async function transcribeNative(path: string, audio: NativeAudio) {
    if (!/^https?:\/\//i.test(root)) throw new ApiError(null, 'Configura EXPO_PUBLIC_API_URL.');
    const fs = await import('expo-file-system/legacy');
    const info = await fs.getInfoAsync(audio.uri);
    if (!info.exists || info.isDirectory || info.size === 0) {
      throw new ApiError(null, 'La grabación está vacía o no está disponible. Graba de nuevo.');
    }
    if (info.size > MAX_AUDIO_BYTES) throw new ApiError(413, 'La grabación supera los 4 MB. Reduce su duración.');
    const token = await getToken?.();
    if (requireAuth && !token) throw new ApiError(401, 'Inicia sesión para enviar tu respuesta.');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const task = fs.createUploadTask(`${root}${path}`, audio.uri, {
      httpMethod: 'POST', uploadType: fs.FileSystemUploadType.MULTIPART,
      fieldName: 'file', mimeType: audio.type, headers,
    });
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; void task.cancelAsync().catch(() => {}); }, timeoutMs);
    try {
      const response = await task.uploadAsync();
      if (timedOut) throw new ApiError(null, 'La subida de la grabación ha tardado demasiado. Puedes reintentar.');
      if (!response) throw new ApiError(null, 'La subida de la grabación se ha cancelado. Puedes reintentar.');
      let data: { detail?: unknown; transcript?: string; saved?: boolean; source?: string; next_step?: string };
      try { data = JSON.parse(response.body); }
      catch { throw new ApiError(response.status, 'El servidor no devolvió una transcripción válida.'); }
      if (response.status < 200 || response.status >= 300) {
        throw new ApiError(response.status, typeof data.detail === 'string' ? data.detail : `No se pudo transcribir (${response.status}).`, data.detail);
      }
      if (typeof data.transcript !== 'string' || !data.transcript.trim() || data.saved !== false) {
        throw new ApiError(response.status, 'El servidor devolvió una transcripción incompleta.');
      }
      return data as { transcript: string; saved: false; source: 'ai'; next_step: string };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (timedOut) throw new ApiError(null, 'La subida de la grabación ha tardado demasiado. Puedes reintentar.');
      throw new ApiError(null, 'No se pudo subir la grabación desde el móvil. Se conserva para que puedas reintentar.');
    } finally { clearTimeout(timer); }
  }


  const id = encodeURIComponent;
  const page = (limit = 20, offset = 0) => `?limit=${limit}&offset=${offset}`;
  return {
    auth: {
      login: (email: string, password: string) => request<AuthSession>('/auth/login', { method: 'POST', json: { email, password } }),
      register: (email: string, password: string, display_name: string) => request<AuthSession>('/auth/register', { method: 'POST', json: { email, password, display_name } }),
      me: () => request<AuthSession['user']>('/auth/me'),
      deleteAccount: (password: string) => request<void>('/auth/delete-account', { method: 'POST', json: { password }, response: 'empty' }),
      logout: (signal?: AbortSignal) => request<void>('/auth/logout', { method: 'POST', response: 'empty', signal }),
    },
    capabilities: () => request<{ ai_provider: 'gemini' | 'ollama' | 'groq'; ai_configured: boolean; speech_transport?: 'device' | 'server' }>('/capabilities'),
    profile: {
      initialInterview: () => request<{ completed: boolean; answers: string[] | null; context: { strengths: string[]; improvement_areas: string[]; preferences: string[] } | null }>('/profile/initial-interview'),
      saveInitialInterview: (answers: string[]) => request<{ completed: boolean; answers: string[] }>('/profile/initial-interview', { method: 'PUT', json: { answers } }),
      saveOnboarding: (document: ProfileDocument) => request<Profile>('/profile/onboarding', { method: 'PUT', json: document }),
      options: () => request<ProfileOptions>('/profile/options'),
      get: () => request<Profile>('/profile'),
      save: (profile: ProfileInput) => request<Profile>('/profile', { method: 'PUT', json: profile }),
    },
    rolePlans: {
      list: () => request<{ items: RolePlan[] }>('/role-plans'),
      generate: (role: { title: string; sector: string; company: string; offer_url: string; offer_description: string }) => request<{ id: string; status: string }>('/role-plans', { method: 'POST', json: role }),
    },
    activities: {
      daily: () => request<Activity>('/activities/daily', { method: 'POST' }),
      list: (limit?: number, offset?: number) => request<Page<Activity>>(`/activities${page(limit, offset)}`),
      get: (activityId: string) => request<Activity>(`/activities/${id(activityId)}`),
      answer: (activityId: string, answer: string) => request<Activity>(`/activities/${id(activityId)}/answer`, { method: 'POST', json: { answer } }),
    },
    interviews: {
      start: (duration: Duration, planId?: string) => request<Interview>('/interviews', { method: 'POST', json: { duration_minutes: duration, ...(planId ? { plan_id: planId } : {}) } }),
      list: (limit?: number, offset?: number) => request<Page<InterviewSummary>>(`/interviews${page(limit, offset)}`),
      get: (interviewId: string) => request<Interview>(`/interviews/${id(interviewId)}`),
      answer: (interviewId: string, turnId: string, answer: string) => request<Interview>(`/interviews/${id(interviewId)}/answers`, { method: 'POST', json: { turn_id: turnId, answer } }),
      finish: (interviewId: string) => request<Interview>(`/interviews/${id(interviewId)}/finish`, { method: 'POST' }),
      delete: (interviewId: string) => request<void>(`/interviews/${id(interviewId)}`, { method: 'DELETE', response: 'empty' }),
      speech: (interviewId: string, turnId: string) => request<Blob>(`/interviews/${id(interviewId)}/turns/${id(turnId)}/speech`, { response: 'blob' }),
      transcribe: (interviewId: string, audio: Blob | NativeAudio, filename = 'respuesta.webm') => {
        if ('uri' in audio) return transcribeNative(`/interviews/${encodeURIComponent(interviewId)}/transcriptions`, audio);
        if (audio.size > MAX_AUDIO_BYTES) return Promise.reject(new ApiError(413, 'La grabación supera los 4 MB. Reduce su duración.'));
        const form = new FormData();
        if (typeof Blob !== 'undefined' && audio instanceof Blob) form.append('file', audio, filename);
        else form.append('file', audio as unknown as Blob); // React Native admite {uri, name, type} en FormData.
        return request<{ transcript: string; saved: false; source: 'ai'; next_step: string }>(`/interviews/${id(interviewId)}/transcriptions`, { method: 'POST', form });
      },
    },
    dictate: (audio: Blob | NativeAudio) => {
      if ('uri' in audio) return transcribeNative('/dictation/transcriptions', audio);
      if (audio.size > MAX_AUDIO_BYTES) return Promise.reject(new ApiError(413, 'La grabación supera los 4 MB.'));
      const form = new FormData();
      form.append('file', audio, 'dictado.webm');
      return request<{ transcript: string; saved: false; source: 'ai'; next_step: string }>('/dictation/transcriptions', { method: 'POST', form });
    },
    wellbeingComplete: (body: { id: string; kind: 'breathing' | 'confidence' | 'personalized'; duration_seconds: number }) => request<{ id: string }>('/wellbeing/completions', { method: 'POST', json: body }),
    progress: () => request<Progress>('/progress'),
    news: (sector = 'Otro sector') => request<ContentFeed<NewsItem>>(`/news?sector=${encodeURIComponent(sector)}`),
    events: (city = 'Málaga', sector?: string) => request<ContentFeed<EventItem>>(`/events?city=${encodeURIComponent(city)}${sector ? `&sector=${encodeURIComponent(sector)}` : ''}`),
    wellbeing: () => request<SampleContent<WellbeingItem> & { description: string }>('/wellbeing/activities'),
  };
}

// Expo sustituye esta referencia estática durante el build; nunca contiene secretos.
export const api = createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL ?? '', getToken: getAccessToken, requireAuth: true });
