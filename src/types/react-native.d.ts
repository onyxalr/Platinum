/**
 * React Native Web does not ship official TypeScript declarations yet.
 * We keep a thin, permissive declaration so the renderer can use the
 * web-specific properties that RNW supports (className, boxShadow, fixed
 * positioning, CSS gradients, etc.) without fighting the mobile-only
 * @types/react-native surface.
 */
declare module 'react-native-web' {
  export const View: any;
  export const Text: any;
  export const Pressable: any;
  export const ScrollView: any;
  export const Image: any;
  export const TextInput: any;
  export const StyleSheet: any;
  export function useWindowDimensions(): { width: number; height: number; scale: number; fontScale: number };
}

declare module 'react-native' {
  export type StyleProp<T = any> = any;
  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;
  export type FlexStyle = Record<string, any>;
  export type LayoutChangeEvent = {
    nativeEvent: { layout: { x: number; y: number; width: number; height: number } };
  };
  export type PressableStateCallbackType = {
    pressed: boolean;
    hovered?: boolean;
    focused?: boolean;
  };

  type AnyComponent = any;

  export const View: AnyComponent;
  export const Text: AnyComponent;
  export const Pressable: AnyComponent;
  export const ScrollView: AnyComponent;
  export const Image: AnyComponent;
  export const ImageBackground: AnyComponent;
  export const TextInput: AnyComponent;
  export const FlatList: AnyComponent;
  export const ActivityIndicator: AnyComponent;
  export const KeyboardAvoidingView: AnyComponent;
  export const SafeAreaView: AnyComponent;
  export const Modal: AnyComponent;
  export const Switch: AnyComponent;
  export const RefreshControl: AnyComponent;
  export const Animated: AnyComponent;
  export const Easing: AnyComponent;
  export const Platform: AnyComponent;
  export const Dimensions: AnyComponent;
  export const Keyboard: AnyComponent;
  export const Linking: AnyComponent;
  export const PixelRatio: AnyComponent;

  export type View = any;
  export type Text = any;
  export type Pressable = any;
  export type ScrollView = any;
  export type Image = any;
  export type TextInput = any;
  export type FlatList = any;

  export const StyleSheet: {
    create<T extends Record<string, any>>(styles: T): T;
    compose(a: any, b: any): any;
    flatten(style: any): any;
    absoluteFill: any;
    absoluteFillObject: any;
    hairlineWidth: number;
  };

  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };

  export function useColorScheme(): 'light' | 'dark' | null;
}
