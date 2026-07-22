import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRouter } from 'expo-router'
import { tokens } from '../lib/tokens'

export default function NotFoundScreen() {
  const router = useRouter()
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.emoji}>🔍</Text>
        <Text style={styles.title}>Sahifa topilmadi</Text>
        <Text style={styles.subtitle}>Siz qidirayotgan sahifa mavjud emas</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => router.replace('/(tabs)/home')}
        >
          <Text style={styles.btnText}>Bosh sahifaga qaytish</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },
  btn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.white,
  },
})
