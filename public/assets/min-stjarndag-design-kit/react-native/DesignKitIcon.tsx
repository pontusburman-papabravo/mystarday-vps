import React from "react";
import { Image, ImageStyle, StyleProp } from "react-native";

export type DesignKitIconName = string;
export type DesignKitTheme = "light" | "dark";

type Props = {
  name: DesignKitIconName;
  size?: 24 | 32 | 48 | 64 | 128;
  theme?: DesignKitTheme;
  style?: StyleProp<ImageStyle>;
};

/**
 * PNG-based fallback for Expo/React Native.
 * For fully themeable SVGs, use react-native-svg with the source files in icons/svg.
 */
export function DesignKitIcon({ name, size = 64, theme = "light", style }: Props) {
  const source = { uri: `./icons/png/${theme}/${size}/${name}.png` };
  return <Image source={source} style={[{ width: size, height: size }, style]} resizeMode="contain" />;
}
