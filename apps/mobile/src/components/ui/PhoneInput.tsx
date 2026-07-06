import React from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native'
import { tokens } from '../../lib/tokens'

interface PhoneInputProps {
  phone: string
  onPhoneChange: (v: string) => void
  region: 'UZB' | 'KOR'
  onRegionChange: (r: 'UZB' | 'KOR') => void
  error?: string
  focused?: boolean
  onFocus?: () => void
  onBlur?: () => void
}

export const validatePhone = (phone: string, region: 'UZB' | 'KOR') => {
  if (region === 'UZB') return /^\d{9}$/.test(phone)
  if (region === 'KOR') return /^\d{9,10}$/.test(phone)
  return false
}

export const getFullPhone = (phone: string, region: 'UZB' | 'KOR'): string => {
  const prefix = region === 'UZB' ? '+998' : '+82'
  return `${prefix}${phone}`
}

const PhoneInput: React.FC<PhoneInputProps> = ({
  phone,
  onPhoneChange,
  region,
  onRegionChange,
  error,
  focused,
  onFocus,
  onBlur,
}) => {
  const toggleRegion = () => {
    onRegionChange(region === 'UZB' ? 'KOR' : 'UZB')
  }

  const containerStyle = [styles.container, focused && styles.focused, !!error && styles.error]

  return (
    <View>
      <View style={containerStyle}>
        <TouchableOpacity activeOpacity={0.7} onPress={toggleRegion} style={styles.regionSelector}>
          <Text style={styles.regionText}>{region === 'UZB' ? '+998' : '+82'}</Text>
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(v) => onPhoneChange(v.replace(/\D/g, ''))}
            keyboardType="phone-pad"
            maxLength={region === 'UZB' ? 9 : 10}
            placeholder={region === 'UZB' ? 'xx xxx xx xx' : '10 xxxx xxxx'}
            placeholderTextColor={tokens.colors.primaryLight}
            onFocus={onFocus}
            onBlur={onBlur}
          />
        </View>
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  )
}

export default PhoneInput

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 56,
    borderRadius: 12,
    borderWidth: 0.6,
    borderColor: tokens.colors.primaryLight,
    backgroundColor: tokens.colors.white,
    overflow: 'hidden',
  },
  focused: {
    borderWidth: 1,
    borderColor: tokens.colors.primary,
  },
  error: {
    borderWidth: 1,
    borderColor: tokens.colors.primaryDark,
  },
  regionSelector: {
    width: 100,
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 0.6,
    borderRightColor: tokens.colors.primaryLight,
  },
  regionText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 15,
    color: tokens.colors.text,
  },
  inputContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  input: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 15,
    color: tokens.colors.text,
    height: '100%',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 12,
    color: tokens.colors.primaryDark,
    marginTop: 4,
  },
})
