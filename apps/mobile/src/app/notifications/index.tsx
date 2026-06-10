import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'

export default function NotificationsScreen() {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.content}>
        <Feather name="bell" size={48} color={tokens.colors.textLight} />
        <Text style={styles.title}>Bildirishnomalar</Text>
        <Text style={styles.subtitle}>Tez kunda</Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.white,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  title: {
    fontSize: 20,
    fontWeight: '500',
    color: tokens.colors.text,
    marginTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: tokens.colors.textMuted,
    marginTop: 8,
  },
})
