import { useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { loadSession } from '../../src/lib/secureStore';
import { logout } from '../../src/lib/auth';
import { countOutbox } from '../../src/lib/db';
import type { User } from '@solupaes/shared';

export default function PerfilScreen() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState(0);

  useEffect(() => {
    loadSession().then((s) => setUser(s.user));
    setPending(countOutbox());
  }, []);

  const handleLogout = () => {
    Alert.alert('Sair', 'Tem certeza? Visitas pendentes não serão perdidas.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="p-6 bg-slate-900">
        <Text className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
          Conta
        </Text>
        <Text className="text-white text-2xl font-bold mt-1">{user?.name ?? 'Carregando…'}</Text>
        <Text className="text-slate-400 text-sm mt-1">{user?.email}</Text>
      </View>

      <View className="p-4 gap-3">
        <View className="bg-white rounded-2xl p-4 border border-slate-100">
          <Text className="text-xs text-slate-500 uppercase tracking-widest">Papel</Text>
          <Text className="text-slate-900 font-bold mt-1">
            {user?.role === 'REPRESENTANTE' ? 'Representante de campo' : user?.role}
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-4 border border-slate-100">
          <Text className="text-xs text-slate-500 uppercase tracking-widest">Visitas pendentes</Text>
          <Text className="text-slate-900 font-bold mt-1">
            {pending} {pending === 1 ? 'visita' : 'visitas'} aguardando sincronização
          </Text>
        </View>

        <View className="bg-amber-50 rounded-2xl p-4 border border-amber-200">
          <Text className="text-amber-900 font-bold mb-1">Funcionamento offline</Text>
          <Text className="text-amber-800 text-sm leading-5">
            Suas visitas são salvas localmente no aparelho mesmo sem internet. Assim que houver
            conexão, são enviadas automaticamente ao sistema do gestor.
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          className="bg-white rounded-2xl p-4 border border-red-100 mt-4"
        >
          <Text className="text-red-600 font-semibold text-center">Sair do app</Text>
        </TouchableOpacity>
      </View>

      <View className="absolute bottom-4 left-0 right-0 items-center">
        <Text className="text-[10px] text-slate-400">Solupães v0.1.0</Text>
      </View>
    </SafeAreaView>
  );
}
