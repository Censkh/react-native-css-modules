import test                        from "ava";
import {generateReactNativeStyles} from "../library/shared/ReactNativeStylesGenerator";
import {processDynamicStyles}      from "../client/DynamicStyleProcessor";
import {flatten}                   from "../library/shared/Utils";

test("class selector", (t) => {

  const styles = generateReactNativeStyles({
    src: `.button {
    height: 40px;
    border-width: 2px;

    &.small, &.sm {
      height: 20px;
    }

    &.disabled {
    height: 16px;

      &.small, &.sm {
        height: 14px;
      }
    }
  }

  .box {
    &.small {
      background: #333;
    }
  }

  .sm, .small {
    font-size: 12px;
  }
  `,
  }).styles;

  {
    const output = processDynamicStyles([
      styles.button,
      styles.sm,
    ], {
      vars: {},
    });

    t.deepEqual(output, {
      classes               : [
        "button",
        "sm",
      ],
      requiresPostProcessing: [
        1,
      ],
      result                : [
        {
          __name     : "button",
          borderWidth: 2,
          height     : 40,
        },
        {
          __name   : "sm",
          __dynamic: {
            when: [
              {
                classes: [
                  "button",
                ],
                style  : {
                  __precedence: 1,
                  height      : 20,
                },
              },
              {
                classes: [
                  "button",
                  "disabled",
                ],
                style  : {
                  __precedence: 2,
                  height      : 14,
                },
              },
            ],
          },
          fontSize : 12,
        },
        {
          __precedence: 1,
          height      : 20,
        },
      ],
    });

    t.deepEqual(flatten(output.result), {
      fontSize   : 12,
      borderWidth: 2,
      height     : 20,
    });
  }

  {
    const output = processDynamicStyles([
      styles.button,
      styles.small,
      styles.disabled,
    ], {
      vars: {},
    });

    t.deepEqual(flatten(output.result), {
      fontSize   : 12,
      borderWidth: 2,
      height     : 14,
    });
  }

  {
    const output = processDynamicStyles([
      styles.button,
      styles.disabled,
    ], {
      vars: {},
    });

    t.deepEqual(flatten(output.result), {
      borderWidth: 2,
      height     : 16,
    });
  }

  {
    const output = processDynamicStyles([
      styles.disabled,
      styles.small,
      styles.button,
    ], {
      vars: {},
    });

    t.deepEqual(flatten(output.result), {
      fontSize   : 12,
      borderWidth: 2,
      height     : 14,
    });
  }

  {
    const output = processDynamicStyles([
      styles.box,
      styles.small,
    ], {
      vars: {},
    });

    t.deepEqual(flatten(output.result), {
      backgroundColor: "#333",
      fontSize: 12,
    });
  }

  {
    const start = process.hrtime.bigint();

    for (let i = 0; i < 10000; i++) {
      processDynamicStyles([
        styles.disabled,
        styles.small,
        styles.button,
      ], {
        vars    : {},
        optimise: true,
      });
    }

    console.log("took", Number(process.hrtime.bigint() - start) / 1_000_000, "ms");

  }
});
