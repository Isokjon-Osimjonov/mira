import { View, Text } from 'react-native'

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-brand text-2xl font-bold">Mira Cosmetics</Text>
      <Text className="text-gray-500 mt-2">Setup successful ✅</Text>
    </View>
  )
}
