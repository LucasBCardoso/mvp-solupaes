import { useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { v4 as uuidv4 } from 'uuid';
import { useRouter } from 'expo-router';
import { getCurrentPosition } from '../../src/lib/geo';
import { compressImage } from '../../src/lib/camera';
import { initDb, insertOutbox } from '../../src/lib/db';
import { processOutbox } from '../../src/lib/sync';
import type { CreateVisitRequest } from '@solupaes/shared';

export default function NovaVisitaScreen() {
  const router = useRouter();
  const [fantasyName, setFantasyName] = useState('');
  const [phone, setPhone] = useState('');
  const [addressLine, setAddressLine] = useState('');
  const [worksWithFrozen, setWorksWithFrozen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState('');
  const [dailyVolume, setDailyVolume] = useState('');
  const [currentPrice, setCurrentPrice] = useState('');
  const [equipmentLent, setEquipmentLent] = useState('');
  const [observations, setObservations] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const capturePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permissão negada', 'É necessário permitir o uso da câmera.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    } as never);
    if (!result.canceled && result.assets?.[0]) {
      const compressed = await compressImage(result.assets[0].uri);
      setPhotoUri(compressed);
    }
  };

  const captureGps = async () => {
    const pos = await getCurrentPosition();
    if (pos) setCoords(pos);
    else Alert.alert('GPS', 'Não foi possível obter localização.');
  };

  const submit = async () => {
    if (!fantasyName.trim() || !addressLine.trim()) {
      Alert.alert('Campos obrigatórios', 'Preencha nome e endereço.');
      return;
    }
    setSubmitting(true);
    try {
      initDb();
      const clientUuid = uuidv4();
      const payload: CreateVisitRequest = {
        clientUuid,
        fantasyName: fantasyName.trim(),
        phone: phone.trim() || undefined,
        addressLine: addressLine.trim(),
        lat: coords?.lat,
        lng: coords?.lng,
        worksWithFrozen,
        currentSupplier: currentSupplier.trim() || undefined,
        dailyVolume: dailyVolume ? Number(dailyVolume) : undefined,
        currentPrice: currentPrice ? Number(currentPrice) : undefined,
        equipmentLent: equipmentLent
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        observations: observations.trim() || undefined,
        visitedAt: new Date().toISOString(),
      };

      insertOutbox({
        client_uuid: clientUuid,
        payload_json: JSON.stringify(payload),
        photo_uri: photoUri,
      });

      processOutbox().catch(() => undefined);

      Alert.alert(
        'Visita salva',
        'Salva localmente. Será enviada automaticamente quando houver internet.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/fila-sync'),
          },
        ],
      );

      // reset
      setFantasyName('');
      setPhone('');
      setAddressLine('');
      setWorksWithFrozen(false);
      setCurrentSupplier('');
      setDailyVolume('');
      setCurrentPrice('');
      setEquipmentLent('');
      setObservations('');
      setPhotoUri(null);
      setCoords(null);
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Falha ao salvar');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="p-4">
          <View className="bg-slate-900 rounded-2xl p-5 mb-4">
            <Text className="text-amber-400 text-xs font-semibold uppercase tracking-widest">
              Relatório de Visita
            </Text>
            <Text className="text-white text-xl font-bold mt-1">Coleta padronizada</Text>
            <Text className="text-slate-400 text-xs mt-1">
              Funciona offline · sincroniza automaticamente
            </Text>
          </View>

          <Section title="1. Identificação">
            <Field label="Nome fantasia *">
              <TextInput
                value={fantasyName}
                onChangeText={setFantasyName}
                placeholder="Ex: Padaria Central"
                className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
              />
            </Field>
            <Field label="Telefone / WhatsApp">
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="(00) 00000-0000"
                keyboardType="phone-pad"
                className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
              />
            </Field>
            <Field label="Endereço completo *">
              <TextInput
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Rua, número, bairro"
                multiline
                className="border border-slate-200 rounded-xl px-4 py-3 bg-white min-h-[60px]"
              />
            </Field>
          </Section>

          <Section title="2. Localização e fachada">
            <View className="flex-row gap-2">
              <TouchableOpacity
                onPress={captureGps}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-3 items-center"
              >
                <Text className="font-semibold text-slate-700">
                  {coords ? '📍 GPS capturado' : '📍 Capturar GPS'}
                </Text>
                {coords && (
                  <Text className="text-[10px] text-slate-500 mt-1">
                    {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={capturePhoto}
                className="flex-1 bg-white border border-slate-200 rounded-xl py-3 items-center"
              >
                <Text className="font-semibold text-slate-700">
                  {photoUri ? '📷 Foto OK' : '📷 Foto da fachada'}
                </Text>
              </TouchableOpacity>
            </View>
            {photoUri && (
              <Image
                source={{ uri: photoUri }}
                className="w-full h-40 rounded-xl mt-3"
                resizeMode="cover"
              />
            )}
          </Section>

          <Section title="3. Qualificação comercial">
            <View className="flex-row items-center justify-between bg-white rounded-xl p-4 border border-slate-200">
              <Text className="font-semibold text-slate-700 flex-1">
                Trabalha com pães e salgados congelados?
              </Text>
              <Switch
                value={worksWithFrozen}
                onValueChange={setWorksWithFrozen}
                trackColor={{ true: '#f59e0b', false: '#cbd5e1' }}
              />
            </View>

            {worksWithFrozen ? (
              <>
                <Field label="Fornecedor atual">
                  <TextInput
                    value={currentSupplier}
                    onChangeText={setCurrentSupplier}
                    className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
                  />
                </Field>
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <Field label="Volume diário (un)">
                      <TextInput
                        value={dailyVolume}
                        onChangeText={setDailyVolume}
                        keyboardType="numeric"
                        className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
                      />
                    </Field>
                  </View>
                  <View className="flex-1">
                    <Field label="Preço (R$)">
                      <TextInput
                        value={currentPrice}
                        onChangeText={setCurrentPrice}
                        keyboardType="decimal-pad"
                        className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
                      />
                    </Field>
                  </View>
                </View>
                <Field label="Equipamentos em comodato (separe por vírgula)">
                  <TextInput
                    value={equipmentLent}
                    onChangeText={setEquipmentLent}
                    placeholder="Forno, Freezer, Armário..."
                    className="border border-slate-200 rounded-xl px-4 py-3 bg-white"
                  />
                </Field>
              </>
            ) : (
              <View className="bg-amber-50 rounded-xl p-4 border border-amber-200 mt-2">
                <Text className="font-bold text-amber-900 mb-1">Estratégia de introdução</Text>
                <Text className="text-amber-800 text-sm">
                  Cliente não trabalha com congelados. Apresente o vídeo institucional Ouro Pães e
                  o catálogo via WhatsApp.
                </Text>
              </View>
            )}
          </Section>

          <Section title="4. Observações">
            <TextInput
              value={observations}
              onChangeText={setObservations}
              placeholder="Próximos passos, objeções, oportunidades..."
              multiline
              numberOfLines={4}
              className="border border-slate-200 rounded-xl px-4 py-3 bg-white min-h-[100px]"
            />
          </Section>

          <TouchableOpacity
            onPress={submit}
            disabled={submitting}
            className="bg-amber-500 rounded-xl py-4 items-center my-4"
          >
            <Text className="text-slate-900 font-bold text-base">
              {submitting ? 'Salvando…' : 'Salvar e sincronizar'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">
        {title}
      </Text>
      <View className="gap-3">{children}</View>
    </View>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View>
      <Text className="text-sm font-semibold text-slate-700 mb-1">{label}</Text>
      {children}
    </View>
  );
}
