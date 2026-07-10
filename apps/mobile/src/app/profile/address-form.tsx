import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useLocalSearchParams, router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { useQueryClient } from '@tanstack/react-query'
import { tokens } from '../../lib/tokens'
import { addressService, type JusoResult } from '../../services/address.service'
import PrimaryButton from '../../components/ui/PrimaryButton'

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <Text style={styles.fieldError}>
      {message}
    </Text>
  ) : null

export default function AddressFormScreen() {
  const { addressId, editData } = useLocalSearchParams<{
    addressId?: string
    editData?: string
  }>()
  const queryClient = useQueryClient()
  const scrollViewRef = useRef<ScrollView>(null)

  const [regionCode, setRegionCode] = useState<'UZB' | 'KOR'>('KOR')
  const [form, setForm] = useState({
    label: '',
    fullName: '',
    phone: '',
    postalCode: '',
    province: '',
    city: '',
    addressLine1: '',
    addressLine2: '',
    isDefault: false,
  })

  const [jusoResults, setJusoResults] = useState<JusoResult[]>([])
  const [jusoQuery, setJusoQuery] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const phonePrefix = regionCode === 'KOR' ? '+82' : '+998'

  useEffect(() => {
    setForm(p => {
      if (p.phone.startsWith(phonePrefix)) return p
      return { ...p, phone: phonePrefix }
    })
  }, [regionCode])

  useEffect(() => {
    if (editData) {
      const data = JSON.parse(editData)
      setRegionCode(data.regionCode)
      setForm({
        label: data.label || '',
        fullName: data.fullName,
        phone: data.phone,
        postalCode: data.postalCode,
        province: data.province || '',
        city: data.city || '',
        addressLine1: data.addressLine1,
        addressLine2: data.addressLine2 || '',
        isDefault: data.isDefault,
      })
    }
  }, [editData])

  // Debounced juso search
  useEffect(() => {
    if (regionCode !== 'KOR') return
    if (jusoQuery.length < 2) {
      setJusoResults([])
      return
    }
    const timer = setTimeout(async () => {
      try {
        const results = await addressService.searchJuso(jusoQuery)
        setJusoResults(results.slice(0, 5))
      } catch {
        setJusoResults([])
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [jusoQuery, regionCode])

  const handleJusoSelect = (item: JusoResult) => {
    setForm((prev) => ({
      ...prev,
      postalCode: item.zipNo,
      addressLine1: item.roadAddr,
    }))
    setJusoQuery('')
    setJusoResults([])
    
    // Clear errors for fields auto-filled
    setErrors(prev => ({ ...prev, postalCode: '', addressLine1: '' }))
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    const nameRegex = /^[\p{L}\s'-]+$/u
    const korPhoneRegex = /^\+82[0-9]{9,10}$/
    const uzbPhoneRegex = /^\+998[0-9]{9}$/

    // Recipient name
    if (!form.fullName.trim()) {
      newErrors.fullName = "Qabul qiluvchi ismini kiriting"
    } else if (!nameRegex.test(form.fullName.trim())) {
      newErrors.fullName = "Ism faqat harflardan iborat bo'lishi kerak"
    } else if (form.fullName.trim().length < 2) {
      newErrors.fullName = "Ism kamida 2 ta belgidan iborat bo'lishi kerak"
    }

    // Phone — region specific
    if (!form.phone.trim() || form.phone === '+82' || form.phone === '+998') {
      newErrors.phone = "Telefon raqamini kiriting"
    } else if (regionCode === 'KOR') {
      if (!korPhoneRegex.test(form.phone)) {
        newErrors.phone = "Koreya raqami to'liq bo'lishi kerak: +82XXXXXXXXX"
      }
    } else {
      if (!uzbPhoneRegex.test(form.phone)) {
        newErrors.phone = "O'zbekiston raqami to'liq bo'lishi kerak: +998XXXXXXXXX"
      }
    }

    // Address line 1
    if (!form.addressLine1.trim()) {
      newErrors.addressLine1 = "Ko'cha va uy raqamini kiriting"
    } else if (form.addressLine1.trim().length < 3) {
      newErrors.addressLine1 = "Aniqroq manzil kiriting (kamida 3 belgi)"
    }

    // City
    if (regionCode === 'UZB') {
      if (!form.city.trim()) {
        newErrors.city = "Shahar nomini kiriting"
      } else if (form.city.trim().length < 2) {
        newErrors.city = "To'liq shahar nomini kiriting"
      }

      // Province — UZB only
      if (!form.province.trim()) {
        newErrors.province = "Viloyat nomini kiriting"
      } else if (form.province.trim().length < 2) {
        newErrors.province = "To'liq viloyat nomini kiriting"
      }
    }

    // Postal code — region specific
    if (form.postalCode.trim()) {
      if (regionCode === 'KOR' && !/^[0-9]{5}$/.test(form.postalCode)) {
        newErrors.postalCode = "Koreya pochta kodi aniq 5 ta raqam bo'lishi kerak"
      }
      if (regionCode === 'UZB' && !/^[0-9]{6}$/.test(form.postalCode)) {
        newErrors.postalCode = "O'zbekiston pochta kodi aniq 6 ta raqam bo'lishi kerak"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateField = (field: string, value: string) => {
    const tempErrors: Record<string, string> = {}
    const nameRegex = /^[\p{L}\s'-]+$/u

    if (field === 'fullName') {
      if (!value.trim()) {
        tempErrors.fullName = "Qabul qiluvchi ismini kiriting"
      } else if (!nameRegex.test(value.trim())) {
        tempErrors.fullName = "Ism faqat harflardan iborat bo'lishi kerak"
      } else if (value.trim().length < 2) {
        tempErrors.fullName = "Ism kamida 2 ta belgidan iborat bo'lishi kerak"
      }
    }

    if (field === 'phone') {
      const korRe = /^\+82[0-9]{9,10}$/
      const uzbRe = /^\+998[0-9]{9}$/
      const isEmpty = !value.trim() || value === '+82' || value === '+998'
      if (isEmpty) {
        tempErrors.phone = "Telefon raqamini kiriting"
      } else if (regionCode === 'KOR' && !korRe.test(value)) {
        tempErrors.phone = "Koreya raqami: +82XXXXXXXXX"
      } else if (regionCode === 'UZB' && !uzbRe.test(value)) {
        tempErrors.phone = "O'zbekiston raqami: +998XXXXXXXXX"
      }
    }

    if (field === 'addressLine1') {
      if (!value.trim()) {
        tempErrors.addressLine1 = "Ko'cha va uy raqamini kiriting"
      } else if (value.trim().length < 3) {
        tempErrors.addressLine1 = "Aniqroq manzil kiriting (kamida 3 belgi)"
      }
    }

    if (field === 'city') {
      if (!value.trim()) {
        tempErrors.city = "Shahar nomini kiriting"
      } else if (value.trim().length < 2) {
        tempErrors.city = "To'liq shahar nomini kiriting"
      }
    }

    if (field === 'province') {
      if (!value.trim()) {
        tempErrors.province = "Viloyat nomini kiriting"
      } else if (value.trim().length < 2) {
        tempErrors.province = "To'liq viloyat nomini kiriting"
      }
    }

    if (field === 'postalCode') {
      if (value.trim()) {
        if (regionCode === 'KOR' && !/^[0-9]{5}$/.test(value)) {
          tempErrors.postalCode = "Koreya pochta kodi aniq 5 ta raqam bo'lishi kerak"
        }
        if (regionCode === 'UZB' && !/^[0-9]{6}$/.test(value)) {
          tempErrors.postalCode = "O'zbekiston pochta kodi aniq 6 ta raqam bo'lishi kerak"
        }
      }
    }

    setErrors(prev => ({
      ...prev,
      [field]: tempErrors[field] ?? ''
    }))
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true })
      return
    }
    setIsSubmitting(true)
    try {
      const payload: any = {
        regionCode,
        fullName: form.fullName,
        phone: form.phone,
        postalCode: form.postalCode || '00000',
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2 || undefined,
        province: form.province || undefined,
        city: form.city || undefined,
        label: form.label || undefined,
        isDefault: form.isDefault,
      }

      if (addressId) {
        await addressService.updateAddress(addressId, payload)
      } else {
        await addressService.createAddress(payload)
      }

      queryClient.invalidateQueries({ queryKey: ['addresses'] })
      router.back()
    } catch (err: any) {
      const apiError = err.response?.data?.error
      if (apiError?.fields) {
        setErrors(prev => ({
          ...prev,
          ...apiError.fields
        }))
      } else {
        Alert.alert('Xatolik', apiError?.message ?? "Xatolik yuz berdi")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

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
          <Text style={styles.headerTitle}>
            {addressId ? 'Manzilni tahrirlash' : "Manzil qo'shish"}
          </Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          ref={scrollViewRef}
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* REGION SELECTOR */}
          <View style={styles.regionSelector}>
            <TouchableOpacity
              onPress={() => setRegionCode('UZB')}
              style={[styles.regionPill, regionCode === 'UZB' && styles.regionPillActive]}
            >
              <Text style={[styles.regionText, regionCode === 'UZB' && styles.regionTextActive]}>
                O'zbekiston
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRegionCode('KOR')}
              style={[styles.regionPill, regionCode === 'KOR' && styles.regionPillActive]}
            >
              <Text style={[styles.regionText, regionCode === 'KOR' && styles.regionTextActive]}>
                Korea
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Sarlavha (ixtiyoriy)</Text>
            <TextInput
              style={[
                styles.input,
                errors.label ? styles.inputError : null
              ]}
              placeholder="Ixtiyoriy (Uy, Ish, ...)"
              value={form.label}
              onChangeText={(t) => {
                setForm((p) => ({ ...p, label: t }))
                validateField('label', t)
              }}
            />
            <FieldError message={errors.label} />

            <Text style={styles.inputLabel}>Ism familiya *</Text>
            <TextInput
              style={[
                styles.input,
                errors.fullName ? styles.inputError : null
              ]}
              placeholder="Qabul qiluvchi ismi"
              value={form.fullName}
              onChangeText={(t) => {
                setForm((p) => ({ ...p, fullName: t }))
                validateField('fullName', t)
              }}
            />
            <FieldError message={errors.fullName} />

            <Text style={styles.inputLabel}>Telefon *</Text>
            <TextInput
              style={[
                styles.input,
                errors.phone ? styles.inputError : null
              ]}
              placeholder={regionCode === 'KOR' ? "+82XXXXXXXXX" : "+998XXXXXXXXX"}
              maxLength={13}
              value={form.phone}
              onChangeText={(t) => {
                if (!t.startsWith(phonePrefix)) {
                  setForm(p => ({ ...p, phone: phonePrefix }))
                  return
                }
                setForm(p => ({ ...p, phone: t }))
                validateField('phone', t)
              }}
              keyboardType="phone-pad"
            />
            <FieldError message={errors.phone} />

            {regionCode === 'KOR' ? (
              <>
                <Text style={styles.inputLabel}>Manzil qidirish (Juso)</Text>
                <View style={styles.searchContainer}>
                  <TextInput
                    style={[styles.input, { paddingLeft: 40 }]}
                    placeholder="Manzilni kiriting..."
                    value={jusoQuery}
                    onChangeText={setJusoQuery}
                  />
                  <Feather
                    name="search"
                    size={18}
                    color={tokens.colors.textMuted}
                    style={styles.searchIcon}
                  />
                </View>

                {jusoResults.length > 0 && (
                  <View style={styles.jusoResults}>
                    {jusoResults.map((item, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={styles.jusoItem}
                        onPress={() => handleJusoSelect(item)}
                      >
                        <Text style={styles.jusoRoad}>{item.roadAddr}</Text>
                        <Text style={styles.jusoZip}>{item.zipNo}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                <Text style={styles.inputLabel}>Pochta indeksi</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.postalCode ? styles.inputError : null
                  ]}
                  placeholder="00000"
                  value={form.postalCode}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, postalCode: t }))
                    validateField('postalCode', t)
                  }}
                  editable={false}
                />
                <FieldError message={errors.postalCode} />

                <Text style={styles.inputLabel}>Asosiy manzil</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.addressLine1 ? styles.inputError : null
                  ]}
                  placeholder="Ko'cha, uy..."
                  value={form.addressLine1}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, addressLine1: t }))
                    validateField('addressLine1', t)
                  }}
                  editable={false}
                />
                <FieldError message={errors.addressLine1} />

                <Text style={styles.inputLabel}>Qo'shimcha manzil (xona/kvartira) *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.addressLine2 ? styles.inputError : null
                  ]}
                  placeholder="Xona raqami, bino..."
                  value={form.addressLine2}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, addressLine2: t }))
                    validateField('addressLine2', t)
                  }}
                />
                <FieldError message={errors.addressLine2} />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Viloyat *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.province ? styles.inputError : null
                  ]}
                  placeholder="Toshkent viloyati..."
                  value={form.province}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, province: t }))
                    validateField('province', t)
                  }}
                />
                <FieldError message={errors.province} />

                <Text style={styles.inputLabel}>Shahar/tuman *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.city ? styles.inputError : null
                  ]}
                  placeholder="Toshkent shahri..."
                  value={form.city}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, city: t }))
                    validateField('city', t)
                  }}
                />
                <FieldError message={errors.city} />

                <Text style={styles.inputLabel}>Ko'cha, uy raqami *</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.addressLine1 ? styles.inputError : null
                  ]}
                  placeholder="Navoiy ko'chasi, 1-uy..."
                  value={form.addressLine1}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, addressLine1: t }))
                    validateField('addressLine1', t)
                  }}
                />
                <FieldError message={errors.addressLine1} />

                <Text style={styles.inputLabel}>Pochta indeksi (ixtiyoriy)</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.postalCode ? styles.inputError : null
                  ]}
                  placeholder="100000"
                  value={form.postalCode}
                  onChangeText={(t) => {
                    setForm((p) => ({ ...p, postalCode: t }))
                    validateField('postalCode', t)
                  }}
                  keyboardType="number-pad"
                />
                <FieldError message={errors.postalCode} />
              </>
            )}

            <View style={styles.defaultRow}>
              <Switch
                value={form.isDefault}
                onValueChange={(v) => setForm((p) => ({ ...p, isDefault: v }))}
                trackColor={{ true: tokens.colors.primary }}
              />
              <Text style={styles.defaultText}>Asosiy manzil sifatida saqlash</Text>
            </View>

            <View style={{ marginTop: 12, marginBottom: 40 }}>
              <PrimaryButton
                label="Saqlash"
                onPress={handleSubmit}
                loading={isSubmitting}
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
  scroll: {
    flex: 1,
  },
  regionSelector: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  regionPill: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  regionPillActive: {
    backgroundColor: tokens.colors.primary,
    borderColor: tokens.colors.primary,
  },
  regionText: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
    fontFamily: 'Inter_400Regular',
  },
  regionTextActive: {
    color: tokens.colors.white,
  },
  formContainer: {
    paddingHorizontal: 24,
    marginTop: 20,
  },
  inputLabel: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
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
    marginBottom: 12,
  },
  inputError: {
    borderColor: tokens.colors.error,
    borderWidth: 1.5,
  },
  fieldError: {
    color: tokens.colors.error,
    fontSize: 12,
    marginTop: -8,
    marginBottom: 12,
    marginLeft: 2,
  },
  searchContainer: {
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 14,
    top: 17,
  },
  jusoResults: {
    backgroundColor: tokens.colors.background,
    borderRadius: 12,
    padding: 8,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
  },
  jusoItem: {
    padding: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  jusoRoad: {
    fontSize: 13,
    color: tokens.colors.text,
  },
  jusoZip: {
    fontSize: 11,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  defaultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  defaultText: {
    fontSize: 13,
    color: tokens.colors.text,
  },
})
