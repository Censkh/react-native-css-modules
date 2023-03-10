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
      vars : {},
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
          __source   : 0,
          borderWidth: 2,
          height     : 40,
        },
        {
          __name   : "sm",
          __source : 0,
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
      fontSize       : 12,
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

test("dynamic processing", (t) => {
  const {result} = processDynamicStyles([
    {
      "__name": "Button",
      "__source": 4,
      "__dynamic": {
        "vars": {
          "borderWidth": "borderWidthGeneral",
          "borderColor": "palette-primary",
          "borderRadius": "borderRadiusSizeRounded",
          "backgroundColor": "palette-primary",
          "color": "palette-primaryContrast",
          "fontFamily": "typography-fontFamilyHeadingBold"
        }
      },
      "borderStyle": "solid",
      "userSelect": "none",
      "overflow": "hidden",
      "position": "relative",
      "paddingTop": 8,
      "paddingRight": 16,
      "paddingBottom": 8,
      "paddingLeft": 16,
      "justifyContent": "center",
      "alignItems": "center",
      "fontStyle": "normal",
      "fontSize": 16,
      "textAlign": "center",
      "flexDirection": "row"
    },
    {
      "__name": "color__primary",
      "__source": 4,
      "__dynamic": {
        "vars": {
          "backgroundColor": "palette-primary",
          "borderColor": "palette-primary",
          "color": "palette-primaryContrast"
        },
        "when": [
          {
            "classes": [
              "Button"
            ],
            "style": {
              "__precedence": 1
            }
          }
        ]
      }
    },
    null,
    [
      {
        "__name": "variant__outline",
        "__source": 4,
        "__dynamic": {
          "vars": {
            "borderColor": "palette-textMain"
          },
          "when": [
            {
              "classes": [
                "Button"
              ],
              "style": {
                "backgroundColor": "transparent",
                "__precedence": 1
              }
            }
          ]
        }
      },
      {
        "__name": "variant__outline__primary",
        "__source": 4,
        "__dynamic": {
          "vars": {
            "borderColor": "palette-primary",
            "color": "palette-primary"
          },
          "when": [
            {
              "classes": [
                "Button"
              ],
              "style": {
                "__precedence": 1
              }
            }
          ]
        }
      }
    ],
    null,
    null,
    [
      {
        "__name": "btn",
        "__source": 1,
        "__dynamic": {
          "vars": {
            "borderBottom": "colorBorders"
          }
        },
        "boxSizing": "border-box",
        "backgroundColor": "#ffffff",
        "display": "flex",
        "flexDirection": "row",
        "justifyContent": "center",
        "alignItems": "center",
        "paddingTop": 24,
        "paddingRight": 32,
        "paddingBottom": 24,
        "paddingLeft": 32,
        "minWidth": 300,
        "height": 84,
        "textAlign": "center",
        "borderBottomWidth": 1,
        "borderRadius": 8,
        "borderTopWidth": 0,
        "borderLeftWidth": 0,
        "borderRightWidth": 0
      },
      null,
      {
        "__name": "not_last",
        "__source": 1,
        "__dynamic": {
          "when": [
            {
              "classes": [
                "btn"
              ],
              "style": {
                "marginBottom": 16,
                "__precedence": 1
              }
            }
          ]
        }
      },
      {
        "__name": "checkable",
        "__source": 1,
        "__dynamic": {
          "when": [
            {
              "classes": [
                "btn"
              ],
              "style": {
                "paddingTop": 16,
                "paddingRight": 16,
                "paddingBottom": 16,
                "paddingLeft": 16,
                "height": 120,
                "__precedence": 1
              }
            },
            {
              "classes": [
                "btnText"
              ],
              "style": {
                "textAlign": "left",
                "paddingLeft": 16,
                "paddingRight": 16,
                "__precedence": 1
              }
            }
          ]
        }
      },
      {},
      null
    ]
  ] as any, {
    vars: {},
  });

  t.deepEqual(flatten(result).backgroundColor, "#ffffff");
});
