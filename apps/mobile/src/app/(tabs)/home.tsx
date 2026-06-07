import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '../../lib/tokens'

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mira Market</Text>
      <Text style={styles.sub}>Bosh sahifa — tez kunda</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.colors.text,
  },
  sub: {
    fontSize: 14,
    color: tokens.colors.textMuted,
  },
})
