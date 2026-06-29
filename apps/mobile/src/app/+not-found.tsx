import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import EmptyState from '../components/ui/EmptyState'
import { tokens } from '../lib/tokens'

export default function NotFoundScreen() {
  return (
    <SafeAreaView
      style={{
        flex: 1,
        backgroundColor: tokens.colors.background,
      }}
    >
      <View style={{ flex: 1, justifyContent: 'center' }}>
        <EmptyState
          icon="alert-circle"
          heading="Sahifa topilmadi"
          subtitle="Siz qidirgan sahifa mavjud emas yoki o'chirilgan"
          actionLabel="Bosh sahifaga qaytish"
          onAction={() => router.replace('/(tabs)/home')}
        />
      </View>
    </SafeAreaView>
  )
}
