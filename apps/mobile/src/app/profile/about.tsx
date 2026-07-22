import React from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'

const openURL = async (url: string) => {
  try {
    const supported = await Linking.canOpenURL(url)
    if (supported) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Xatolik', 'Havola ochilmadi. Brauzeringizni tekshiring.', [{ text: 'OK' }])
    }
  } catch (err) {
    Alert.alert('Xatolik', 'Havola ochilmadi.')
  }
}

export default function AboutScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={24} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ilova haqida</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Logo */}
        <View style={styles.logoSection}>
          <Text style={styles.appName}>Mira Market</Text>
          <Text style={styles.version}>Versiya 1.0.0</Text>
        </View>

        {/* Description */}
        <View style={styles.card}>
          <Text style={styles.description}>
            Mira Market — Koreya kosmetikasini O'zbekistonga yetkazib beruvchi ishonchli platforma.
          </Text>
          <Text style={styles.description}>
            Original mahsulotlar, tez yetkazish, qulay narxlar.
          </Text>
        </View>

        {/* Links */}
        <View style={styles.linksCard}>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openURL('https://miramarket.uz/privacy')}
          >
            <Text style={styles.linkText}>Maxfiylik siyosati</Text>
            <Feather name="chevron-right" size={16} color={tokens.colors.textMuted} />
          </TouchableOpacity>
          
          <View style={styles.divider} />
          
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openURL('https://miramarket.uz/terms')}
          >
            <Text style={styles.linkText}>Foydalanish shartlari</Text>
            <Feather name="chevron-right" size={16} color={tokens.colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => openURL('https://miramarket.uz/sale-terms')}
          >
            <Text style={styles.linkText}>Savdo shartlari</Text>
            <Feather name="chevron-right" size={16} color={tokens.colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Copyright */}
        <Text style={styles.copyright}>
          © 2026 Mira Market. Barcha huquqlar himoyalangan.
        </Text>
      </ScrollView>
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
    backgroundColor: tokens.colors.background,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  logoSection: {
    alignItems: 'center',
    marginTop: 32,
    marginBottom: 32,
  },
  appName: {
    fontSize: 24,
    fontFamily: 'Inter_600SemiBold',
    color: tokens.colors.text,
    marginBottom: 8,
  },
  version: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
  },
  card: {
    backgroundColor: tokens.colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
  },
  description: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  linksCard: {
    backgroundColor: tokens.colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: tokens.colors.border,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 32,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  linkText: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.text,
  },
  divider: {
    height: 0.5,
    backgroundColor: tokens.colors.border,
  },
  copyright: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textLight,
    textAlign: 'center',
  },
})
