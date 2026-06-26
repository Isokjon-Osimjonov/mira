import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { tokens } from '../../lib/tokens'

interface SectionHeaderProps {
  title: string
  onSeeAll?: () => void
}

export const SectionHeader = ({ title, onSeeAll }: SectionHeaderProps) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.6}>
          <Text style={styles.seeAll}>Barchasi</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: tokens.spacing.md,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    color: tokens.colors.text,
  },
  seeAll: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    color: tokens.colors.textLight,
  },
})
