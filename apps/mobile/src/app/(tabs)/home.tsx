import { View, Text, TouchableOpacity, StyleSheet,
  Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'
import { useAuthStore } from '../../lib/auth-store'
import { authService } from '../../services/auth.service'

export default function HomeScreen() {
  const customer = useAuthStore(s => s.customer)
  const logout = useAuthStore(s => s.logout)

  const handleLogout = async () => {
    Alert.alert(
      'Chiqish',
      'Hisobdan chiqmoqchimisiz?',
      [
        { text: 'Bekor qilish', style: 'cancel' },
        {
          text: 'Chiqish',
          style: 'destructive',
          onPress: async () => {
            await authService.logout()
            await logout()
            router.replace('/auth/login')
          },
        },
      ]
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>
          Xush kelibsiz, {customer?.firstName ?? 'Foydalanuvchi'}!
        </Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>Chiqish</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.body}>
        <Text style={styles.sub}>
          Bosh sahifa — tez kunda
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 0.6,
    borderBottomColor: tokens.colors.primaryLight,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  logoutBtn: {
    padding: 8,
  },
  logoutText: {
    fontSize: 14,
    color: tokens.colors.primary,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sub: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
})
