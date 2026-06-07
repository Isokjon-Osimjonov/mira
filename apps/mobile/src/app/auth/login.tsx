import { View, Text, StyleSheet } from 'react-native'
import { tokens } from '../../lib/tokens'

export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Kirish</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: tokens.colors.text,
  },
})
