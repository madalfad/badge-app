import * as ImagePicker from "expo-image-picker";
import { Alert } from "react-native";

export type CardImagePickerSource = "camera" | "library";

type PermissionMessages = {
  camera: string;
  library: string;
};

async function requestPermission(source: CardImagePickerSource) {
  if (source === "camera") {
    const result = await ImagePicker.requestCameraPermissionsAsync();
    return result.granted;
  }

  const result = await ImagePicker.requestMediaLibraryPermissionsAsync();
  return result.granted;
}

export async function launchCardImagePicker(
  source: CardImagePickerSource,
  permissionMessages: PermissionMessages,
) {
  const hasPermission = await requestPermission(source);
  if (!hasPermission) {
    Alert.alert(
      "Permission required",
      source === "camera" ? permissionMessages.camera : permissionMessages.library,
    );
    return null;
  }

  const result =
    source === "camera"
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: false,
          quality: 1,
        });

  if (result.canceled || !result.assets[0]) {
    return null;
  }

  return result.assets[0];
}
