import React, { useState } from 'react'
import { ScrollView, View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { router } from 'expo-router'
import { tokens } from '../../lib/tokens'

const FAQS = [
  {
    q: 'Buyurtma berishning oxirgi muddati qancha?',
    a: "To'lovni buyurtma berilgandan so'ng 30 daqiqa ichida amalga oshiring. Aks holda buyurtma bekor qilinadi.",
  },
  {
    q: "Qaysi to'lov usullari qabul qilinadi?",
    a: "Korea bank o'tkazmasi (Toss, Kakao Pay), O'zbekiston bank kartasi (Humo, Uzcard) va E9Pay orqali to'lash mumkin.",
  },
  {
    q: 'Yetkazib berish qancha vaqt oladi?',
    a: "Korea ichida 1-3 kun. O'zbekistonga kargo orqali 7-14 ish kuni.",
  },
  {
    q: 'Kargo narxi qanday hisoblanadi?',
    a: "O'zbekistonga yetkazishda mahsulot og'irligi va tanlangan quti asosida hisoblanadi.",
  },
  {
    q: 'Buyurtmani qanday bekor qilaman?',
    a: "To'lov kutilayotgan holda Buyurtmalarim → Buyurtma → 'Buyurtmani bekor qilish' tugmasini bosing.",
  },
  {
    q: 'Tovar qaytarish mumkinmi?',
    a: "Tovar yetkazib berilgandan so'ng 7 kun ichida qaytarish so'rovi yuborishingiz mumkin. Telegram bot orqali biz bilan bog'laning.",
  },
]

export default function HelpScreen() {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  const toggleFaq = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx)
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={tokens.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yordam</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* CONTACT SECTION */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('https://t.me/mira_cosmetics_bot')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#E8F4FB' }]}>
              <Feather name="send" size={20} color="#229ED9" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Telegram bot</Text>
              <Text style={styles.contactSub}>@mira_cosmetics_bot</Text>
            </View>
            <Feather name="chevron-right" size={20} color={tokens.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('tel:+821066844721')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#F0FDF4' }]}>
              <Feather name="phone" size={20} color="#16A34A" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Telefon</Text>
              <Text style={styles.contactSub}>+82 10-6684-4721</Text>
            </View>
            <Feather name="chevron-right" size={20} color={tokens.colors.textLight} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.contactCard}
            onPress={() => Linking.openURL('https://instagram.com/mira_cosmetics')}
          >
            <View style={[styles.iconBox, { backgroundColor: '#FCE4EC' }]}>
              <Feather name="instagram" size={20} color="#E1306C" />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Instagram</Text>
              <Text style={styles.contactSub}>@mira_cosmetics</Text>
            </View>
            <Feather name="chevron-right" size={20} color={tokens.colors.textLight} />
          </TouchableOpacity>
        </View>

        {/* FAQ SECTION */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ko'p so'raladigan savollar</Text>
          {FAQS.map((item, idx) => (
            <View key={idx} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggleFaq(idx)}
                activeOpacity={0.7}
              >
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Feather
                  name={openIdx === idx ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={tokens.colors.textMuted}
                />
              </TouchableOpacity>
              {openIdx === idx && (
                <View style={styles.faqAnswerBox}>
                  <Text style={styles.faqAnswer}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.versionText}>Mira Market v1.0.0</Text>
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
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: tokens.colors.text,
    marginBottom: 16,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
    marginLeft: 12,
  },
  contactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: tokens.colors.text,
  },
  contactSub: {
    fontSize: 12,
    color: tokens.colors.textMuted,
    marginTop: 2,
  },
  faqItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: tokens.colors.border,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  faqQuestion: {
    fontSize: 14,
    color: tokens.colors.text,
    flex: 1,
    paddingRight: 8,
  },
  faqAnswerBox: {
    paddingBottom: 14,
    paddingHorizontal: 4,
    backgroundColor: tokens.colors.background,
    borderRadius: 8,
    marginBottom: 8,
    padding: 12,
  },
  faqAnswer: {
    fontSize: 13,
    color: tokens.colors.textSecondary,
    lineHeight: 20,
  },
  versionText: {
    fontSize: 12,
    color: tokens.colors.textLight,
    textAlign: 'center',
    marginTop: 40,
  },
})
