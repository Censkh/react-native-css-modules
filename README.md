# [react-native-css-modules](https://github.com/Censkh/react-native-css-modules/) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/Censkh/react-native-css-modules/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/react-native-css-modules.svg?style=flat)](https://www.npmjs.com/package/react-native-css-modules)

Use CSS modules in React Native & React Native Web

``` npm i react-native-css-modules ```

**Note:** this package is in early development, use with caution

Must be used with Metro web

## Features

- Minimal selector support (`.button.small`)
- CSS Vars

## Setup

### For app developers

#### Metro config for React Native

#### SWC plugin for Next.js

### For library developers

#### Babel plugin

## Usage

```scss

.Button {
  background-color: white;
  padding: 10px;
  border-radius: 5px;

  &.disabled {
    background-color: grey;
  }

  &.small {
    padding: 5px;
  }
}

```

```jsx

import {View} from "react-native";

import styles from "./Button.module.scss";

import {useDynamicStyles} from "react-native-css-modules";

const Button = ({children, disabled, small}) => {
  const dynamicStyles = useDynamicStyles();

  return <View style={dynamicStyles([
    styles.Button,
    disabled && styles.disabled,
    small && styles.small
  ])}>
    {children}
  </View>;
};

export default Button;

```

```scss
<Button></Button>
```

All style props must be wrapped in a `dynamicStyles()` call from the `useDynamicStyles` hook to support selectors & CSS vars. If you want to automatically create wrapped versions of the primitive components from RN, use `dynamicallyStyled()`:

```scss



```
