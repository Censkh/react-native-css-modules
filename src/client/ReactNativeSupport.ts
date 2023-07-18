import {Dimensions, Platform, StyleSheet}                                   from "react-native";
import * as React                                                           from "react";
import {useCallback, useContext, useEffect, useRef}                         from "react";
import {DynamicStyleProcessor, processDynamicStyles, StyleDimensions, Vars} from "./DynamicStyleProcessor";
import {processWebStylePrecedence}                                          from "./WebStylePrecedanceProcessor";

export const DynamicStyleOptionsContext = React.createContext<{ vars: Vars, baseFontSize?: number }>({vars: {}});

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

const REACT_NATIVE_DIMENSIONS: StyleDimensions = {
  getWidth : () => Dimensions.get("window").width,
  getHeight: () => Dimensions.get("window").height,
  listen   : (callback) => {
    return Dimensions.addEventListener("change", callback).remove;
  },
};

export const useDynamicWebStyles: typeof useDynamicStyles = <T>() => {
  return useCallback((style) => {
    return processWebStylePrecedence(style);
  }, []);
};

export const useDynamicStyles = <T = any>(): DynamicStyleProcessor<T> => {
  if (Platform.OS === "web") {
    return useDynamicWebStyles();
  }

  const [, setForceUpdateKey] = React.useState(0);
  const {vars, baseFontSize}                = useContext(DynamicStyleOptionsContext);

  // every render we reset this, and then if we have any styles that require it during a render we enable it
  const willRespondToDimensionsChange   = useRef(false);
  willRespondToDimensionsChange.current = false;

  const dimensionsChangeListener = useRef<(() => void) | undefined>(undefined);

  // if we have a listener but on last render we didn't need it, then we can remove it
  if (!willRespondToDimensionsChange.current && dimensionsChangeListener.current) {
    dimensionsChangeListener.current?.();
    dimensionsChangeListener.current = undefined;
  }

  useEffect(() => {
    return () => {
      dimensionsChangeListener.current?.();
    };
  }, []);

  return useCallback((style) => {
    if (!style) {
      return style;
    }

    const {result, respondsToDimensionsChange} = processDynamicStyles(style, {
      vars        : vars,
      baseFontSize: baseFontSize,
      dimensions  : REACT_NATIVE_DIMENSIONS,
    });

    if (respondsToDimensionsChange) {
      if (!dimensionsChangeListener.current) {
        dimensionsChangeListener.current = REACT_NATIVE_DIMENSIONS.listen(() => {
          setForceUpdateKey((key) => key + 1);
        });
      }
      willRespondToDimensionsChange.current = true;
    }

    return result;
  }, []);
};
