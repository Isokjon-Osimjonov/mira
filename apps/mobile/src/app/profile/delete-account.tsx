import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../lib/auth-store'
import { useCartStore } from '../../lib/cart-store'
import { useWishlistStore } from '../../lib/wishlist-store'
import { Toast, useToast } from '../../components/ui/Toast'
import { tokens } from '../../lib/tokens'

export default function DeleteAccountScreen() {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const logout = useAuthStore((s) => s.logout)
  const clearCart = useCartStore((s) => s.clearCart)
  const { toast, showToast, hideToast } = useToast()

  const isMatched = confirmText === "O'CHIRISH"

  const handleDelete = async () => {
    if (!isMatched) return

    setLoading(true)
    try {
      await authService.deleteAccount()

      // Clear local stores
      await logout()
      await clearCart()

      useCartStore.getState().setCart({
        id: null,
        regionCode: 'KOR',
        items: [],
        summary: { itemCount: 0, subtotal: 0, currency: 'KRW' },
        autoApplyCoupons: [],
      })

      useWishlistStore.setState({ items: [], productIds: new Set() })

      showToast("Hisobingiz o'chirildi", 'success')

      router.replace('/auth/login')
    } catch (e: any) {
      showToast(e.response?.data?.error?.message || 'Xatolik yuz berdi', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hisobni o'chirish</Text>
        <View style={styles.placeholder} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <View style={styles.warningBox}>
              <Feather name="alert-triangle" size={32} color="#DC2626" style={styles.warningIcon} />
              <Text style={styles.warningTitle}>Bu amalni qaytarib bo'lmaydi</Text>

              <View style={styles.bulletList}>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.bulletText}>Profil ma'lumotlari butunlay o'chiriladi</Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.bulletText}>Sevimlilar va kutish ro'yxati o'chiriladi</Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.bulletText}>Saqlangan manzillar o'chiriladi</Text>
                </View>
                <View style={styles.bulletItem}>
                  <View style={styles.bulletPoint} />
                  <Text style={styles.bulletText}>
                    Faol buyurtmalar bo'lsa, avval ularni yakunlash kerak
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Tasdiqlash uchun "O'CHIRISH" so'zini kiriting</Text>
              <TextInput
                style={styles.input}
                value={confirmText}
                onChangeText={setConfirmText}
                placeholder="O'CHIRISH"
                autoCapitalize="characters"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.deleteBtn, (!isMatched || loading) && styles.deleteBtnDisabled]}
              disabled={!isMatched || loading}
              onPress={handleDelete}
            >
              {loading ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.deleteBtnText}>Hisobni o'chirish</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onHide={hideToast} />
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: tokens.colors.white,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: tokens.colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  warningBox: {
    alignItems: 'center',
    marginBottom: 32,
  },
  warningIcon: {
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#DC2626',
    marginBottom: 24,
  },
  bulletList: {
    width: '100%',
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#DC2626',
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    color: '#991B1B',
    lineHeight: 20,
  },
  inputContainer: {
    marginTop: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: tokens.colors.border,
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    backgroundColor: tokens.colors.white,
    color: tokens.colors.text,
  },
  footer: {
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 0 : 24,
  },
  deleteBtn: {
    backgroundColor: '#DC2626',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtnDisabled: {
    opacity: 0.5,
  },
  deleteBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
})
