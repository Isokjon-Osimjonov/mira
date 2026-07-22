import { useRouter } from 'expo-router'
import { tokens } from '../../lib/tokens'
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Pressable
} from 'react-native'
import { Feather } from '@expo/vector-icons'

interface AuthBottomSheetProps {
  visible: boolean
  onClose: () => void
  message?: string
}

export function AuthBottomSheet({
  visible,
  onClose,
  message = "Bu funksiyadan foydalanish uchun kiring"
}: AuthBottomSheetProps) {
  const router = useRouter()

  const handleLogin = () => {
    onClose()
    router.push('/auth/login')
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}>
      <Pressable
        style={styles.overlay}
        onPress={onClose}>
        <Pressable
          style={styles.sheet}
          onPress={e => e.stopPropagation()}>
          
          <View style={styles.handle} />
          
          <View style={styles.iconWrap}>
            <Feather
              name="shopping-cart"
              size={32}
              color={tokens.colors.primary}
            />
          </View>

          <Text style={styles.title}>
            Kirish talab etiladi
          </Text>
          
          <Text style={styles.message}>
            {message}
          </Text>

          <TouchableOpacity
            style={styles.loginBtn}
            onPress={handleLogin}>
            <Text style={styles.loginText}>
              Kirish
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestBtn}
            onPress={onClose}>
            <Text style={styles.guestText}>
              Hozir emas
            </Text>
          </TouchableOpacity>

        </Pressable>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginBottom: 24,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: tokens.colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  loginBtn: {
    backgroundColor: tokens.colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  loginText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  guestBtn: {
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
  },
  guestText: {
    color: tokens.colors.textMuted,
    fontSize: 14,
  },
})
