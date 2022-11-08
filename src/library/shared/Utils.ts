import type {StyleProp} from "react-native";

export const flatten = (styleProp: StyleProp<any>, result?: any): any => {
  const resolvedResult = result || {};

  if (styleProp) {
    if (Array.isArray(styleProp)) {
      styleProp.map(styleProp => flatten(styleProp, resolvedResult));
    } else {
      Object.assign(resolvedResult, styleProp);
    }
  }

  delete resolvedResult.__name;
  delete resolvedResult.__dynamic;
  delete resolvedResult.__precedence;

  return resolvedResult;
};