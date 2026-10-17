import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Icon, type IconName } from '../../components/ui';
import { colors } from '../../theme';

const tab = (title: string, icon: IconName) => ({
  title,
  tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} color={color} size={24} />,
});

/** Navegación principal: pestañas abajo, como en las apps de entrenamiento. */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '800' },
        headerShadowVisible: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
      }}>
      <Tabs.Screen name="index" options={{ ...tab('Hoy', 'today'), headerShown: false }} />
      <Tabs.Screen name="plan" options={tab('Plan', 'plan')} />
      <Tabs.Screen name="routines" options={tab('Rutinas', 'routines')} />
      <Tabs.Screen name="exercises" options={tab('Ejercicios', 'exercises')} />
      <Tabs.Screen name="more" options={tab('Más', 'more')} />
    </Tabs>
  );
}
