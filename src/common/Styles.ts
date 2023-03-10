import type {StyleProp} from "react-native";

export type PossiblyCompiledStyle<T> = NamedStyle<T> | DynamicStyle<T> | T;
export type PossiblyCompiledStyleProp<T> = StyleProp<PossiblyCompiledStyle<T>>;

export type NamedStyle<T> = T & {
  __name: string,
  __source: number
};

export type PrecedentStyle<T> = T & {
  __precedence: number,
}

export type DynamicStyle<T> = NamedStyle<T> & {
  __dynamic: {
    when?: Array<{ classes: string[], style: PrecedentStyle<T> }>,
    mediaQueries?: any,
    vars?: any
  },
}

export const isDynamicStyle = <T>(style: any): style is DynamicStyle<T> => {
  return style?.__dynamic;
};

export const isNamedStyle = <T>(style: any): style is NamedStyle<T> => {
  return style?.__name;
};
