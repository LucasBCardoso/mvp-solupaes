import { Tabs } from 'expo-router';
import { Home, MapPin, RefreshCw, User } from 'lucide-react-native';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#f59e0b',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: { paddingTop: 6, paddingBottom: 6, height: 64 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="nova-visita"
        options={{
          title: 'Nova visita',
          tabBarIcon: ({ color }) => <MapPin color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="fila-sync"
        options={{
          title: 'Fila',
          tabBarIcon: ({ color }) => <RefreshCw color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
