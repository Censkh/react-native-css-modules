import test                        from "ava";
import {generateReactNativeStyles} from "../library/shared/ReactNativeStylesGenerator";
import {processDynamicStyles}      from "../client/DynamicStyleProcessor";
import {flatten}                   from "../library/shared/Utils";

test("vars", (t) => {

  const styles = generateReactNativeStyles({
    src: `
    $height: var(--height);

    .button {
    height: $height;
    border-width: $height;
    font-family: var(--fontFamily);

    &.small, &.sm {
      height: var(--height-sm);
    }
  }
  `,
  }).styles;


  {
    const output = processDynamicStyles([
      styles.button,
      styles.sm,
    ], {
      vars: {
        "height"   : 30,
        "height-sm": 20,
      },
    });

    t.deepEqual(flatten(output.result), {
      borderWidth: 30,
      height     : 20,
      fontFamily : undefined,
    });
  }
});
