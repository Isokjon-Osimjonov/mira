import React, { useState, useEffect } from 'react'
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

export default function AddressFormScreen() {
  const { addressId, editData } = useLocalSearchParams<{
    addressId?: string
    editData?: string
  }>()
  const queryClient = useQueryClient()

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
  }

  const handleSubmit = async () => {
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
      Alert.alert('Xatolik', err?.response?.data?.error?.message ?? "Saqlab bo'lmadi")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isFormValid = () => {
    if (!form.fullName || !form.phone || !form.addressLine1) return false
    if (regionCode === 'KOR' && !form.addressLine2) return false
    if (regionCode === 'UZB' && (!form.province || !form.city)) return false
    return true
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
                🇺🇿 O'zbekiston
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setRegionCode('KOR')}
              style={[styles.regionPill, regionCode === 'KOR' && styles.regionPillActive]}
            >
              <Text style={[styles.regionText, regionCode === 'KOR' && styles.regionTextActive]}>
                🇰🇷 Korea
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.formContainer}>
            <Text style={styles.inputLabel}>Sarlavha (ixtiyoriy)</Text>
            <TextInput
              style={styles.input}
              placeholder="Uy, Ish va h.k."
              value={form.label}
              onChangeText={(t) => setForm((p) => ({ ...p, label: t }))}
            />

            <Text style={styles.inputLabel}>Ism familiya *</Text>
            <TextInput
              style={styles.input}
              placeholder="Qabul qiluvchi ismi"
              value={form.fullName}
              onChangeText={(t) => setForm((p) => ({ ...p, fullName: t }))}
            />

            <Text style={styles.inputLabel}>Telefon *</Text>
            <TextInput
              style={styles.input}
              placeholder="Telefon raqami"
              value={form.phone}
              onChangeText={(t) => setForm((p) => ({ ...p, phone: t }))}
              keyboardType="phone-pad"
            />

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
                  style={styles.input}
                  placeholder="00000"
                  value={form.postalCode}
                  onChangeText={(t) => setForm((p) => ({ ...p, postalCode: t }))}
                  editable={false}
                />

                <Text style={styles.inputLabel}>Asosiy manzil</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ko'cha, uy..."
                  value={form.addressLine1}
                  onChangeText={(t) => setForm((p) => ({ ...p, addressLine1: t }))}
                  editable={false}
                />

                <Text style={styles.inputLabel}>Qo'shimcha manzil (xona/kvartira) *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Xona raqami, bino..."
                  value={form.addressLine2}
                  onChangeText={(t) => setForm((p) => ({ ...p, addressLine2: t }))}
                />
              </>
            ) : (
              <>
                <Text style={styles.inputLabel}>Viloyat *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Toshkent viloyati..."
                  value={form.province}
                  onChangeText={(t) => setForm((p) => ({ ...p, province: t }))}
                />

                <Text style={styles.inputLabel}>Shahar/tuman *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Toshkent shahri..."
                  value={form.city}
                  onChangeText={(t) => setForm((p) => ({ ...p, city: t }))}
                />

                <Text style={styles.inputLabel}>Ko'cha, uy raqami *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Navoiy ko'chasi, 1-uy..."
                  value={form.addressLine1}
                  onChangeText={(t) => setForm((p) => ({ ...p, addressLine1: t }))}
                />

                <Text style={styles.inputLabel}>Pochta indeksi (ixtiyoriy)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="100000"
                  value={form.postalCode}
                  onChangeText={(t) => setForm((p) => ({ ...p, postalCode: t }))}
                  keyboardType="number-pad"
                />
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
                disabled={!isFormValid()}
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
