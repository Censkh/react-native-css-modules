import {Platform, StyleSheet}                              from "react-native";
import * as React                                          from "react";
import {useCallback, useContext}                           from "react";
import {DynamicStyleProcessor, processDynamicStyles, Vars} from "./DynamicStyleProcessor";

export const VarsContext = React.createContext<Vars>({});

export const setupDynamicWarning = () => {
  let hasWarned = false;
  StyleSheet.setStyleAttributePreprocessor("__dynamic", () => {
    if (!hasWarned) {
      hasWarned = true;
      console.warn("[react-native-css-modules] Unprocessed style added to element");
    }
    return undefined;
  });
};

export const useDynamicStyles = <T = any>(): DynamicStyleProcessor<T> => {
  if (Platform.OS === "web") {
    return useCallback((style) => style, []);
  }

  const vars = useContext(VarsContext);

  return useCallback((style) => {
    if (!style) {
      return style;
    }

    return processDynamicStyles(style, {
      vars,
    }).result;
  }, []);
};