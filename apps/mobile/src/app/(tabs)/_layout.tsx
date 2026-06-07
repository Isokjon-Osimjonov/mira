import { Tabs } from 'expo-router'
import { tokens } from '../../lib/tokens'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tokens.colors.primary,
        tabBarInactiveTintColor: tokens.colors.textMuted,
        tabBarStyle: {
          backgroundColor: tokens.colors.background,
        },
      }}
    >
      <Tabs.Screen name="home" options={{ title: 'Bosh sahifa' }} />
    </Tabs>
  )
}
