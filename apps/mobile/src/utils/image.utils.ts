import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

export const pickAndProcessImage = async (options?: {
  allowsEditing?: boolean
  source?: 'library' | 'camera'
}) => {
  // Request permissions
  if (options?.source === 'camera') {
    const { status } = await ImagePicker.requestCameraPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('Kamera ruxsati berilmadi')
    }
  } else {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== 'granted') {
      throw new Error('Galereya ruxsati berilmadi')
    }
  }

  // Pick image
  const pickerResult = options?.source === 'camera'
    ? await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? false,
        quality: 1, // pick full quality
        exif: false,
        base64: false,
      })
    : await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: options?.allowsEditing ?? false,
        quality: 1,
        exif: false,
        base64: false,
      })

  if (pickerResult.canceled) return null
  
  const asset = pickerResult.assets[0]
  
  console.log('📷 Original image:', asset.uri, 'size:', asset.fileSize, 'type:', asset.mimeType)

  // Process: compress + convert to JPEG
  const processed = await ImageManipulator.manipulateAsync(
    asset.uri,
    [{ resize: { width: 1920 } }],
    {
      compress: 0.85,
      format: ImageManipulator.SaveFormat.JPEG,
    }
  )
  
  console.log('✅ Processed image:', processed.uri, 'size:', processed.width, '×', processed.height)
  
  return {
    uri: processed.uri,
    type: 'image/jpeg',
    name: `upload_${Date.now()}.jpg`,
  }
}

export const uploadImageToApi = async (
  image: { uri: string; type: string; name: string },
  endpoint: string,
  fieldName = 'file'
) => {
  const formData = new FormData()
  
  formData.append(fieldName, {
    uri: image.uri,
    type: image.type,
    name: image.name,
  } as any)

  console.log('📤 Uploading to:', endpoint)
  
  // Import api to avoid circular deps
  const { default: api } = await import('../lib/api')
  
  const response = await api.post(
    endpoint,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 60000, // 60 seconds
      transformRequest: (data) => data,
    }
  )
  
  return response.data
}
