import React, { useEffect, useRef } from 'react'
import { Animated, Text, View, StyleSheet, Dimensions } from 'react-native'
import { Feather } from '@expo/vector-icons'
import { tokens } from '../../lib/tokens'

interface ToastProps {
  message: string
  type?: 'success' | 'error' | 'info'
  visible: boolean
  onHide: () => void
  duration?: number
}

export function Toast({ message, type = 'success', visible, onHide, duration = 2500 }: ToastProps) {
  const opacity = useRef(new Animated.Value(0)).current
  const translateY = useRef(new Animated.Value(20)).current

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start()

      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(translateY, {
            toValue: 20,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => onHide())
      }, duration)

      return () => clearTimeout(timer)
    }
  }, [visible])

  const bgColor = {
    success: '#16A34A',
    error: '#DC2626',
    info: tokens.colors.primary,
  }[type]

  const icon = {
    success: 'check-circle',
    error: 'x-circle',
    info: 'info',
  }[type] as any

  if (!visible) return null

  return (
    <Animated.View
      style={[styles.container, { opacity, transform: [{ translateY }], backgroundColor: bgColor }]}
    >
      <Feather name={icon} size={16} color="white" />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  )
}

// Global toast state hook
import { useState, useCallback } from 'react'

export function useToast() {
  const [toast, setToast] = useState<{
    message: string
    type: 'success' | 'error' | 'info'
    visible: boolean
  }>({ message: '', type: 'success', visible: false })

  const showToast = useCallback(
    (message: string, type: 'success' | 'error' | 'info' = 'success') => {
      setToast({ message, type, visible: true })
    },
    []
  )

  const hideToast = useCallback(() => {
    setToast((prev) => ({ ...prev, visible: false }))
  }, [])

  return { toast, showToast, hideToast }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 10,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  text: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    flex: 1,
  },
})
