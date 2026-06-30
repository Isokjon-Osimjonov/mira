import React, { useState } from 'react'
import {
  View,
  Text,
  Image,
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import * as ExpoStorage from 'expo-secure-store'
import { tokens } from '../lib/tokens'

const { width: screenWidth } = Dimensions.get('window')

type Slide = {
  bg: string
  statusBar: string
  titleColor: string
  subtitleColor: string
  counterColor: string
  imageUrl: any
  title: string
  subtitle: string
}

const slides: Slide[] = [
  {
    bg: '#FCE7F3',
    statusBar: 'dark-content',
    titleColor: '#500724',
    subtitleColor: '#9D174D',
    counterColor: '#9D174D',
    imageUrl: require('../../assets/onb1.png'),
    title: 'MIRA\nMARKET',
    subtitle: 'KOREYA MAHSULOTLARI\nENG YAXSHI NARXDA',
  },
  {
    bg: '#FFF5F9',
    statusBar: 'dark-content',
    titleColor: '#500724',
    subtitleColor: '#9D174D',
    counterColor: '#9D174D',
    imageUrl: require('../../assets/onb2.png'),
    title: 'TEZ\nYETKAZIB',
    subtitle: "O'ZBEKISTONGA ISHONCHLI\nVA TEZ YETKAZIB BERISH",
  },
  {
    bg: '#FCE7F3',
    statusBar: 'dark-content',
    titleColor: '#500724',
    subtitleColor: '#9D174D',
    counterColor: '#9D174D',
    imageUrl: require('../../assets/onb4.png'),
    title: 'BOSHLASH',
    subtitle: "RO'YXATDAN O'TING VA\nBIRINCHI BUYURTMA BERING",
  },
]

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const slide = slides[currentIndex]

  const handleNext = async () => {
    if (currentIndex < slides.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      await ExpoStorage.setItemAsync('onboarding_complete', 'true')
      router.replace('/auth/login')
    }
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: slide.bg }]}>
      <StatusBar barStyle={slide.statusBar as any} backgroundColor={slide.bg} />

      {/* TOP SECTION */}
      <View style={styles.topSection}>
        <Text style={[styles.title, { color: slide.titleColor }]}>{slide.title}</Text>
        <Text style={[styles.subtitle, { color: slide.subtitleColor }]}>{slide.subtitle}</Text>
      </View>

      {/* IMAGE SECTION */}
      <View style={styles.imageSection}>
        <Image source={slide.imageUrl as any} style={styles.heroImage} resizeMode="contain" />
      </View>

      {/* BOTTOM BAR */}
      <View style={[styles.bottomBar, { backgroundColor: slide.bg }]}>
        <View>
          <Text style={[styles.counter, { color: slide.counterColor }]}>
            0{currentIndex + 1} — 0{slides.length}
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.circleButton,
            { backgroundColor: currentIndex === 2 ? '#FFFFFF' : '#1a1a1a' },
          ]}
          onPress={handleNext}
          activeOpacity={0.8}
        >
          <Feather
            name="arrow-right"
            size={24}
            color={currentIndex === 2 ? '#E11D74' : '#FFFFFF'}
          />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topSection: {
    paddingHorizontal: 28,
    paddingTop: 24,
  },
  title: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '500',
    fontSize: 42,
    lineHeight: 46,
    textAlign: 'left',
    letterSpacing: -1,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '300',
    fontSize: 11,
    letterSpacing: 2,
    textAlign: 'left',
    textTransform: 'uppercase',
  },
  imageSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    width: screenWidth * 0.85,
    height: screenWidth * 0.85,
  },
  bottomBar: {
    paddingHorizontal: 28,
    paddingBottom: 40,
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counter: {
    fontFamily: 'Inter_400Regular',
    fontWeight: '400',
    fontSize: 13,
    letterSpacing: 2,
  },
  circleButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
})
