import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, ContentFeed, EventItem, NewsItem } from '../services/api';
import { newsSectors } from '../services/mocks/weeklyNews';
import { colors } from '../theme/colors';
import { PAGE_MAX_WIDTH } from '../theme/layout';

type Props = { initialSector?: string };
const format = (value: string) => new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(value));
export default function NewsScreen({ initialSector }: Props) {
  const [sector, setSector] = useState<string>(newsSectors.find(x => x === initialSector) ?? 'Otro sector');
  const [city, setCity] = useState('Málaga');
  const [news, setNews] = useState<ContentFeed<NewsItem> | null>(null);
  const [events, setEvents] = useState<ContentFeed<EventItem> | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    setNews(null); setError('');
    Promise.all((sector === 'Todos' ? newsSectors : [sector]).map(value => api.news(value))).then(feeds => { if (active) { const items = Array.from(new Map(feeds.flatMap(feed => feed.items).map(item => [item.url, item])).values()); setNews({ ...feeds[0], items, total: items.length }); } }).catch(() => { if (active) setError('No se ha podido conectar con la API.'); });
    return () => { active = false; };
  }, [sector]);
  useEffect(() => {
    let active = true;
    setEvents(null);
    api.events(city, sector === 'Todos' ? undefined : sector).then(value => { if (active) setEvents(value); }).catch(() => { if (active) setEvents({ source: city, is_sample: false, items: [], status: 'error', message: 'No se ha podido conectar con la API.', updated_at: null, total: 0 }); });
    return () => { active = false; };
  }, [city, sector]);
  return <ScrollView contentContainerStyle={styles.page}><View style={styles.content}>
    <Text style={styles.eyebrow}>ACTUALIDAD PARA TI</Text><Text style={styles.title}>Una mirada a tu sector.</Text>
    <Text style={styles.lead}>Noticias y oportunidades para seguir avanzando.</Text>
    <Text style={styles.section}>ELIGE TU SECTOR</Text><View style={styles.filters}>{['Todos', ...newsSectors].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: sector === value }} onPress={() => setSector(value)} style={[styles.filter, sector === value && styles.active]}><Text style={[styles.filterText, sector === value && styles.activeText]}>{value}</Text></Pressable>)}</View>
    <Text style={styles.section}>CIUDAD DE LOS EVENTOS</Text><View style={styles.filters}>{['Málaga', 'Madrid'].map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: city === value }} onPress={() => setCity(value)} style={[styles.filter, city === value && styles.active]}><Text style={[styles.filterText, city === value && styles.activeText]}>{value}</Text></Pressable>)}</View>
    <Text style={styles.section}>NOTICIAS Y EVENTOS</Text>
    {error ? <Text style={styles.message}>{error}</Text> : !news ? <ActivityIndicator /> : <>
      {!!news.message && <Text style={styles.message}>{news.message}</Text>}
      {news.status === 'ok' && !news.items.length && <Text style={styles.message}>No hay noticias disponibles para este sector.</Text>}
      {news.updated_at && <Text style={styles.meta}>Actualizado: {format(news.updated_at)}</Text>}
      {news.items.map(item => <View key={item.id} style={styles.card}><Text style={styles.pill}>NOTICIA</Text><Text style={styles.tag}>{item.sectors.join(' · ')}</Text><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.description}>{item.description || 'Descripción no disponible.'}</Text><Text style={styles.meta}>{item.publisher || 'Medio no indicado'}{item.author ? ` · ${item.author}` : ''}{item.published_at ? ` · ${format(item.published_at)}` : " · Selección editorial"} · {item.language.toUpperCase()}</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.url)}><Text style={styles.link}>Leer en la fuente original ↗</Text></Pressable></View>)}
    </>}
    {city === 'Málaga' && (sector === 'Todos' || sector === 'Tecnología') && <View style={styles.card}><Text style={styles.pill}>EVENTO</Text><Text style={styles.tag}>Málaga · Tecnología</Text><Text style={styles.cardTitle}>2ª Hackathona de Yes We Tech</Text><Text style={styles.description}>Dos días para crear proyectos con impacto en el ecosistema tecnológico de Málaga.</Text><Text style={styles.meta}>6 y 7 de noviembre de 2026 · GSEC (Google), Málaga</Text><Text style={styles.meta}>{new Date() >= new Date('2026-11-08T00:00:00+01:00') ? 'Evento celebrado' : 'Consulta el estado y el horario en la fuente oficial'}</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL('https://www.yeswetech.org/eventos/hackathon-2026/')}><Text style={styles.link}>Ver evento original ↗</Text></Pressable></View>}
    {!events ? <ActivityIndicator /> : <>
      {!!events.message && <Text style={styles.message}>{events.message}</Text>}
      {events.status === 'ok' && !events.items.length && <Text style={styles.message}>No hay eventos próximos para estos filtros.</Text>}
      {events.updated_at && <Text style={styles.meta}>Actualizado: {format(events.updated_at)}</Text>}
      {events.items.map(item => <View key={item.id} style={styles.card}><Text style={styles.pill}>EVENTO</Text><Text style={styles.tag}>{item.city} · {item.sectors.join(' · ')}</Text><Text style={styles.cardTitle}>{item.title}</Text><Text style={styles.description}>{item.description || 'Consulta los detalles en la fuente.'}</Text><Text style={styles.meta}>{format(item.starts_at)} · {item.location || item.city}{item.address ? ` · ${item.address}` : ''}</Text><Text style={styles.meta}>{item.organizer || item.source} · {item.source} · {item.license} (datos adaptados)</Text><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.url)}><Text style={styles.link}>Ver evento original ↗</Text></Pressable><Pressable accessibilityRole="link" onPress={() => void Linking.openURL(item.license_url)}><Text style={styles.link}>Licencia CC BY 4.0 ↗</Text></Pressable></View>)}
    </>}
  </View></ScrollView>;
}
const styles = StyleSheet.create({ page: { flexGrow: 1, backgroundColor: colors.ivory, padding: 24, alignItems: 'center' }, content: { width: '100%', maxWidth: PAGE_MAX_WIDTH }, eyebrow: { color: colors.plum, fontSize: 10, letterSpacing: 1.6, fontWeight: '700', marginBottom: 14 }, title: { color: colors.eggplant, fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' }), fontSize: 40 }, lead: { color: colors.mutedText, fontSize: 15, marginTop: 12 }, section: { color: colors.plum, fontSize: 11, fontWeight: '700', letterSpacing: 1.3, marginTop: 30, marginBottom: 14 }, filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }, filter: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: 24, backgroundColor: colors.white }, active: { backgroundColor: colors.plum }, filterText: { color: colors.eggplant }, activeText: { color: colors.white }, card: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 20, padding: 22, marginTop: 14 }, pill: { alignSelf: 'flex-start', overflow: 'hidden', color: colors.plum, backgroundColor: colors.lavenderSurface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, fontSize: 10, fontWeight: '700', marginBottom: 10 }, tag: { color: colors.plum, fontSize: 11, fontWeight: '700' }, cardTitle: { color: colors.eggplant, fontSize: 23, fontWeight: '600', marginTop: 10 }, description: { color: colors.mutedText, fontSize: 15, lineHeight: 22, marginTop: 10 }, meta: { color: colors.mutedText, fontSize: 12, marginTop: 12 }, link: { color: colors.plum, fontWeight: '700', marginTop: 16, minHeight: 30 }, message: { color: colors.mutedText, marginVertical: 12 } });
