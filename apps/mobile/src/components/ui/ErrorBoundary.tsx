import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'
import EmptyState from './EmptyState'

interface State {
  hasError: boolean
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: any) {
    console.error('App crash:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <EmptyState
            icon="alert-triangle"
            heading="Xatolik yuz berdi"
            subtitle="Ilovada kutilmagan xatolik. Qayta urinib ko'ring."
            actionLabel="Qayta urinish"
            onAction={() => this.setState({ hasError: false })}
          />
        </View>
      )
    }
    return this.props.children
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tokens.colors.background,
    paddingHorizontal: 32,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.text,
    textAlign: 'center',
    marginTop: 8,
  },
  sub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: tokens.colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    backgroundColor: tokens.colors.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
    marginTop: 8,
  },
  btnText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    color: tokens.colors.white,
  },
})
