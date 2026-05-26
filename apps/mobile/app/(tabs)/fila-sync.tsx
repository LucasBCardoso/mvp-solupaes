import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, Text, TouchableOpacity, View, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { initDb, listOutbox, removeFromOutbox, type OutboxRow } from '../../src/lib/db';
import { processOutbox } from '../../src/lib/sync';

export default function FilaSyncScreen() {
  const [items, setItems] = useState<OutboxRow[]>([]);
  const [processing, setProcessing] = useState(false);

  const reload = useCallback(() => {
    initDb();
    setItems(listOutbox());
  }, []);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useEffect(() => {
    reload();
  }, [reload]);

  const sync = async () => {
    setProcessing(true);
    const result = await processOutbox();
    reload();
    Alert.alert('Sincronização', `Enviadas: ${result.processed} · Falhas: ${result.failed}`);
    setProcessing(false);
  };

  const discard = (clientUuid: string) => {
    Alert.alert('Descartar?', 'A visita será perdida permanentemente.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: () => {
          removeFromOutbox(clientUuid);
          reload();
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 bg-slate-900">
        <Text className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
          Sincronização
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">
          {items.length} {items.length === 1 ? 'visita pendente' : 'visitas pendentes'}
        </Text>
      </View>

      <View className="px-4 py-3">
        <TouchableOpacity
          onPress={sync}
          disabled={processing || items.length === 0}
          className={`rounded-xl py-3 items-center ${items.length === 0 ? 'bg-slate-300' : 'bg-amber-500'}`}
        >
          <Text className="text-slate-900 font-bold">
            {processing ? 'Enviando…' : 'Tentar enviar agora'}
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(i) => i.client_uuid}
        contentContainerClassName="p-4 gap-2"
        refreshControl={
          <RefreshControl refreshing={processing} onRefresh={sync} tintColor="#f59e0b" />
        }
        ListEmptyComponent={
          <Text className="text-slate-400 text-center mt-12">
            Nenhuma visita pendente. Tudo sincronizado!
          </Text>
        }
        renderItem={({ item }) => {
          const payload = JSON.parse(item.payload_json) as { fantasyName: string };
          return (
            <View className="bg-white rounded-2xl p-4 border border-slate-100">
              <Text className="font-bold text-slate-900">{payload.fantasyName}</Text>
              <Text className="text-xs text-slate-500 mt-1">
                Criado em {new Date(item.created_at).toLocaleString('pt-BR')}
              </Text>
              <Text className="text-xs text-amber-600 mt-1">
                Tentativas: {item.attempts}
                {item.last_error ? ` · ${item.last_error}` : ''}
              </Text>
              <TouchableOpacity
                onPress={() => discard(item.client_uuid)}
                className="self-end mt-2 px-3 py-1 rounded-lg bg-red-50"
              >
                <Text className="text-red-600 text-xs font-semibold">Descartar</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
