import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../../src/lib/auth';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      router.replace('/(tabs)/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-slate-900"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <View className="px-6 py-10">
          <View className="items-center mb-10">
            <View className="w-20 h-20 rounded-3xl bg-amber-500 items-center justify-center mb-4 shadow-lg">
              <Text className="text-4xl">🌾</Text>
            </View>
            <Text className="text-3xl font-bold text-white tracking-tight">solupães</Text>
            <Text className="text-slate-400 mt-1 text-sm">Representante de Campo</Text>
          </View>

          <View className="bg-white rounded-3xl p-6 shadow-xl">
            <Text className="text-lg font-bold text-slate-900 mb-4">Acessar conta</Text>

            <Text className="text-sm font-semibold text-slate-700 mb-1">E-mail</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              className="border border-slate-200 rounded-xl px-4 py-3 mb-4 text-base"
              placeholder="seu@email.com"
              placeholderTextColor="#94a3b8"
            />

            <Text className="text-sm font-semibold text-slate-700 mb-1">Senha</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              className="border border-slate-200 rounded-xl px-4 py-3 mb-2 text-base"
              placeholderTextColor="#94a3b8"
            />

            {error && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                <Text className="text-red-700 text-xs">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={submit}
              disabled={loading}
              className="bg-amber-500 rounded-xl py-4 mt-4 items-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-slate-900 font-bold text-base">Entrar</Text>
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-center text-xs text-slate-500 mt-6">
            © {new Date().getFullYear()} Solupães
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
