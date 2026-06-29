import { useRef, useEffect } from 'react'
import { StyleSheet, Animated } from 'react-native'
import { tokens } from '../../lib/tokens'

interface Props {
  width: number | string
  height: number
  borderRadius?: number
  style?: object
}

export default function SkeletonLoader({ width, height, borderRadius, style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    )
    animation.start()
    return () => animation.stop()
  }, [])

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? tokens.radius.md,
          backgroundColor: tokens.colors.skeleton,
          opacity,
        },
        style,
      ]}
    />
  )
}
