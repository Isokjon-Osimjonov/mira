import React, { useState } from 'react'
import { View, Text, TextInput, Image, TouchableOpacity, StyleSheet, Pressable } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router, useLocalSearchParams } from 'expo-router'
import * as ImagePicker from 'expo-image-picker'
import { tokens } from '../../lib/tokens'
import PrimaryButton from '../../components/ui/PrimaryButton'
import { Feather } from '@expo/vector-icons'
import { customerService } from '../../services/customer.service'
import { uploadService } from '../../services/upload.service'
import { useAuthStore } from '../../lib/auth-store'
import { Alert } from 'react-native'

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <Text style={{
      color: tokens.colors.error,
      fontSize: 12,
      marginTop: 4,
      marginLeft: 2
    }}>
      {message}
    </Text>
  ) : null

export default function ProfileSetupScreen() {
  const { returnTo } = useLocalSearchParams()
  const [name, setName] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [focused, setFocused] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })

    if (!result.canceled) {
      setPhoto(result.assets[0].uri)
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    const nameRegex = /^[\p{L}\s'-]+$/u
    if (name.trim().length < 2) {
      newErrors.name = "Ism kamida 2 ta belgidan iborat bo'lishi kerak"
    } else if (!nameRegex.test(name.trim())) {
      newErrors.name = "Ism faqat harflardan iborat bo'lishi kerak"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) return
    setLoading(true)
    try {
      const nameParts = name.trim().split(' ')
      const firstName = nameParts[0]
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : null

      // Upload photo to Cloudinary if selected
      let profileImageUrl: string | null = null
      if (photo) {
        try {
          profileImageUrl = await uploadService.uploadAvatar(photo)
        } catch (err) {
          console.error('Avatar upload failed:', err)
          // Photo upload failed — continue without it
          // Don't block profile save for failed photo
        }
      }

      const updated = await customerService.updateProfile({
        firstName,
        lastName,
        profileImageUrl,
      })
      useAuthStore.getState().setCustomer(updated)
      router.replace({ pathname: '/auth/notification-permission', params: { returnTo: returnTo as string } })
    } catch (err: any) {
      const msg = err?.response?.data?.error?.message
      Alert.alert('Xatolik', msg ?? 'Profil saqlanmadi.')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = () => {
    if (!name.trim()) return 'M'
    return name.trim().charAt(0).toUpperCase()
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.top}>
        <Text style={styles.title}>Profilingizni to'ldiring</Text>
        <Text style={styles.subtitle}>Bu ma'lumotlar bir marta so'raladi</Text>
      </View>

      <View style={styles.avatarContainer}>
        <Pressable onPress={pickImage} style={styles.avatarPicker}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitials}>{getInitials()}</Text>
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Feather name="camera" size={16} color={tokens.colors.white} />
          </View>
        </Pressable>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Ism va familiya</Text>
        <TextInput
          style={[
            styles.input, 
            focused && styles.inputFocused,
            errors.name && { borderColor: tokens.colors.error, borderWidth: 1.5 }
          ]}
          placeholder="Ism Familiya"
          placeholderTextColor={tokens.colors.primaryLight}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        <FieldError message={errors.name} />
      </View>

      <View style={styles.bottom}>
        <PrimaryButton
          label="Davom etish"
          onPress={handleSubmit}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  top: {
    paddingTop: 40,
    paddingHorizontal: 24,
  },
  title: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    fontSize: 28,
    color: tokens.colors.text,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 14,
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
  avatarContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  avatarPicker: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: tokens.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    fontSize: 36,
    color: tokens.colors.primary,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: tokens.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: tokens.colors.white,
  },
  form: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 14,
    color: tokens.colors.textMuted,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderRadius: 12,
    borderWidth: 0.6,
    borderColor: tokens.colors.primaryLight,
    paddingHorizontal: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 16,
    color: tokens.colors.text,
    backgroundColor: tokens.colors.white,
  },
  inputFocused: {
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  bottom: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
})
