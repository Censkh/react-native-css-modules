import {DynamicStyleProcessor} from "./DynamicStyleProcessor";

const selectorCache = new Set<string>();

type ExtendedCSSStyleRule = CSSStyleRule & {
  __originalSelectorText?: string,
  __newSelectorCache?: Record<string, boolean>
}

export const processWebStylePrecedence: DynamicStyleProcessor<any> = (style, options) => {
  if (typeof document === "undefined") {
    return style;
  }

  // @ts-ignore
  const flatStyle: T[] = Array.isArray(style) ? style.flat(Infinity) : [ style ];
  const classNames = (flatStyle.map((style: any) => style?.$$css && Object.keys(style).filter(key => !key.startsWith("$"))[0]));

  const specifiedClassNames: string[] = [];

  for (const className of classNames) {
    if (className) {
      specifiedClassNames.push(className);

      if (specifiedClassNames.length > 1) {
        const specifiedClassName = specifiedClassNames.join(".");
        if (selectorCache.has(specifiedClassName)) {
          continue;
        }

        // @ts-ignore
        for (const styleSheet of document.styleSheets) {
          for (const cssRule of (styleSheet.cssRules as any) as ExtendedCSSStyleRule[]) {
            if (cssRule instanceof CSSStyleRule) {
              const selectorText = cssRule.__originalSelectorText || cssRule.selectorText;
              if (!cssRule.__originalSelectorText) {
                cssRule.__originalSelectorText = selectorText;
              }

              for (let baseSelector of selectorText.split(",")) {
                baseSelector = baseSelector.trim().substring(1);
                const baseSelectorParts = baseSelector.split(".");
                if (baseSelectorParts.includes(className) && baseSelectorParts.every(selector => !selector || specifiedClassNames.includes(selector))) {
                  const newSelector = `.${specifiedClassName}`;
                  const newSelectorCache = ((cssRule).__newSelectorCache || ((cssRule).__newSelectorCache = {}));
                  if (!newSelectorCache[newSelector]) {
                    newSelectorCache[newSelector] = true;
                    cssRule.selectorText += ", " + newSelector;
                  }
                }
              }
            }
          }
        }
        selectorCache.add(specifiedClassName);
      }

    }
  }
  return flatStyle;
};
