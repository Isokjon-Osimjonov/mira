import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Image } from 'expo-image'
import * as ImagePicker from 'expo-image-picker'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuthStore } from '../../lib/auth-store'
import { uploadService } from '../../services/upload.service'
import api from '../../lib/api'
import { tokens } from '../../lib/tokens'
import PrimaryButton from '../../components/ui/PrimaryButton'

export default function EditProfileScreen() {
  const customer = useAuthStore((s) => s.customer)
  const setCustomer = useAuthStore((s) => s.setCustomer)

  const [firstName, setFirstName] = useState(customer?.firstName ?? '')
  const [lastName, setLastName] = useState(customer?.lastName ?? '')
  const [avatarUri, setAvatarUri] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const pickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri)
    }
  }

  const handleSave = async () => {
    if (!firstName.trim()) {
      Alert.alert('Xatolik', 'Ismni kiriting')
      return
    }
    setIsSubmitting(true)
    try {
      let profileImageUrl = customer?.profileImageUrl ?? null

      if (avatarUri) {
        profileImageUrl = await uploadService.uploadAvatar(avatarUri)
      }

      const res = await api.patch('/auth/profile', {
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
        profileImageUrl,
      })

      if (res.data?.data) {
        setCustomer(res.data.data)
      }
      router.back()
    } catch (err: any) {
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? "Saqlab bo'lmadi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const getInitials = (name: string) => {
    return name?.charAt(0).toUpperCase() || 'M'
  }

  const avatarSource = avatarUri || customer?.profileImageUrl

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={22} color={tokens.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profilni tahrirlash</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              {avatarSource ? (
                <Image source={avatarSource} style={styles.avatar} contentFit="cover" />
              ) : (
                <View style={styles.initialsContainer}>
                  <Text style={styles.initialsText}>{getInitials(customer?.firstName || '')}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.pickBtn} onPress={pickAvatar} activeOpacity={0.8}>
                <View style={styles.pickBtnInner}>
                  <Feather name="camera" size={14} color={tokens.colors.white} />
                </View>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Ism *</Text>
            <TextInput
              style={styles.input}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Ismingizni kiriting"
            />

            <Text style={styles.label}>Familiya</Text>
            <TextInput
              style={styles.input}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Familiyangizni kiriting"
            />

            <View style={styles.phoneBox}>
              <Text style={styles.phoneLabel}>Telefon raqam</Text>
              <Text style={styles.phoneValue}>{customer?.phone}</Text>
              <Text style={styles.phoneHint}>Telefon raqamni o'zgartirib bo'lmaydi</Text>
            </View>

            <View style={{ marginTop: 32 }}>
              <PrimaryButton
                label="Saqlash"
                onPress={handleSave}
                loading={isSubmitting}
                disabled={!firstName.trim() || isSubmitting}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    position: 'relative',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  initialsContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
    backgroundColor: tokens.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialsText: {
    fontSize: 28,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.primary,
  },
  pickBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
  pickBtnInner: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: tokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: tokens.colors.white,
  },
  form: {
    marginTop: 8,
  },
  label: {
    fontSize: 13,
    color: tokens.colors.textMuted,
    marginBottom: 6,
    fontFamily: 'Inter_400Regular',
  },
  input: {
    height: 52,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    paddingHorizontal: 14,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
    marginBottom: 16,
  },
  phoneBox: {
    marginTop: 16,

    borderRadius: 12,
    backgroundColor: tokens.colors.background,
  },
  phoneLabel: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginBottom: 4,
    fontFamily: 'Inter_400Regular',
  },
  phoneValue: {
    fontSize: 15,
    color: tokens.colors.text,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
  },
  phoneHint: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    marginTop: 8,
    fontStyle: 'italic',
  },
})
