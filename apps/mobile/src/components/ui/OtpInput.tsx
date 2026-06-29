import React, { useRef } from 'react'
import { View, Text, TextInput, StyleSheet, Pressable } from 'react-native'
import { tokens } from '../../lib/tokens'

interface OtpInputProps {
  value: string
  onChange: (v: string) => void
  length?: number
  error?: boolean
  disabled?: boolean
}

const OtpInput: React.FC<OtpInputProps> = ({ value, onChange, length = 6, error, disabled }) => {
  const inputRef = useRef<TextInput>(null)

  const renderBoxes = () => {
    const boxes = []
    for (let i = 0; i < length; i++) {
      const char = value[i] || ''
      const isFocused = value.length === i
      const isFilled = value.length > i

      boxes.push(
        <View
          key={i}
          style={[
            styles.box,
            isFocused && styles.boxActive,
            isFilled && styles.boxFilled,
            error && styles.boxError,
          ]}
        >
          <Text style={styles.boxText}>{char}</Text>
        </View>
      )
    }
    return boxes
  }

  return (
    <View style={styles.container}>
      <View style={styles.boxesContainer}>{renderBoxes()}</View>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => {
          const cleanText = text.replace(/\D/g, '')
          if (cleanText.length <= length) {
            onChange(cleanText)
          }
        }}
        keyboardType="number-pad"
        maxLength={length}
        autoFocus
        editable={!disabled}
      />
      <Pressable style={StyleSheet.absoluteFill} onPress={() => inputRef.current?.focus()} />
    </View>
  )
}

export default OtpInput

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center',
  },
  boxesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  box: {
    width: 48,
    height: 56,
    borderRadius: 12,
    borderWidth: 0.6,
    borderColor: tokens.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: tokens.colors.white,
  },
  boxActive: {
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  boxFilled: {
    borderWidth: 0.6,
    borderColor: tokens.colors.primaryLight,
    backgroundColor: tokens.colors.white,
  },
  boxError: {
    borderWidth: 1,
    borderColor: tokens.colors.primaryDark,
  },
  boxText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 20,
    color: tokens.colors.text,
  },
  hiddenInput: {
    opacity: 0,
    position: 'absolute',
    width: 1,
    height: 1,
  },
})
