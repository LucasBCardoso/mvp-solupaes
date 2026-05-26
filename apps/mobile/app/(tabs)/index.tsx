import { useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { apiFetch } from '../../src/lib/api';
import { listVisitsCache, upsertVisitCache } from '../../src/lib/db';
import type { Visit } from '@solupaes/shared';

const COLORS = { A: '#f59e0b', B: '#10b981', C: '#64748b' } as const;

export default function HomeScreen() {
  const [items, setItems] = useState<
    Array<{ id: string; fantasy_name: string; classification: 'A' | 'B' | 'C'; viability_score: number; visited_at: string }>
  >([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadFromCache = useCallback(() => {
    setItems(
      listVisitsCache().map((r) => ({
        id: r.id,
        fantasy_name: r.fantasy_name,
        classification: r.classification,
        viability_score: r.viability_score,
        visited_at: r.visited_at,
      })),
    );
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const visits = await apiFetch<Visit[]>('/visits?limit=50');
      visits.forEach((v) =>
        upsertVisitCache({
          id: v.id,
          client_uuid: v.clientUuid,
          fantasy_name: v.fantasyName,
          classification: v.classification,
          viability_score: v.viabilityScore,
          visited_at: v.visitedAt,
          status: v.status,
        }),
      );
      loadFromCache();
    } catch {
      loadFromCache();
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [loadFromCache]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  useEffect(() => {
    loadFromCache();
  }, [loadFromCache]);

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 bg-slate-900">
        <Text className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
          Suas visitas
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">Atividade recente</Text>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#f59e0b" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => i.id}
          contentContainerClassName="p-4 gap-2"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#f59e0b" />}
          ListEmptyComponent={
            <Text className="text-slate-400 text-center mt-12">Nenhuma visita ainda.</Text>
          }
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex-row items-center gap-3">
              <View
                style={{ backgroundColor: COLORS[item.classification] }}
                className="w-2 h-12 rounded-full"
              />
              <View className="flex-1">
                <Text className="font-bold text-slate-900">{item.fantasy_name}</Text>
                <Text className="text-xs text-slate-500 mt-0.5">
                  {new Date(item.visited_at).toLocaleString('pt-BR')}
                </Text>
              </View>
              <View className="items-end">
                <Text className="font-bold text-slate-900 text-lg">{item.viability_score}</Text>
                <Text
                  style={{ color: COLORS[item.classification] }}
                  className="text-xs font-bold mt-0.5"
                >
                  Classe {item.classification}
                </Text>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
