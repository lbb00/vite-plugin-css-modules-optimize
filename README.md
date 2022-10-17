# vite-plugin-css-modules-optimize

!> Currently in testing stage, only the use of `<style module>` in VUE SFC files is supported. Be careful when using in production, api may be changed!!!

> A css modules optimization plugin for vue.

- Deleted unused css code.
- Convert the variables in SFC template to string.
- Compatible with the postcss-modules configuration in vite.config.js(css.modules).

_Unsupported `postcss-modules` configuration:_

- localsConvention
- globalModulePaths

## How it works?

This plugin need to work before the VUE plugin, it will syntax analysis and conversion of VUE SFC files that use CSS modules by GoGoCode and PostCSS.

## Usage

### install

```bash
npm install -D vite-plugin-css-modules-optimize
```

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssModulesOptimize from 'vite-plugin-css-modules-optimize'

export default defineConfig({
  plugins: [cssModulesOptimize(), vue()],
})
```

### generateScopedName helpers

#### `generateScopedNameBase62Global` (For VUE)

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import cssModulesOptimize, {
  generateScopedNameBase62Global,
} from 'vite-plugin-css-modules-optimize'

export default defineConfig({
  css: {
    modules: {
      generateScopedName: generateScopedNameBase62Global,
    },
  },
  plugins: [cssModulesOptimize(), vue()],
})
```

#### generateScopedNameBase62Uniapp (For Uniapp mp-weixin)

由于微信小程序默认样式规则只有当前页面样式会影响到当前页面引用的组件，组件间、父子组件默认是隔离的。

所以采用页面级组件样式增加一个前缀`_`，其余组件都从 base62 `a` 开始生成样式名，以达到体积最小化。

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

import cssModulesOptimize, {
  generateScopedNameBase62Uniapp,
} from 'vite-plugin-css-modules-optimize'

export default defineConfig({
  css: {
    modules: {
      generateScopedName: generateScopedNameBase62Uniapp,
    },
  },
  plugins: [cssModulesOptimize(), uni()],
})
```

## Example

[Click here to online demo](https://codesandbox.io/s/vite-css-modules-optimize-xguhbu?file=/src/App.vue)

Source code:

```vue
<template>
  <view :class="$style.red">color red, background black</view>
  <view :class="[$style1.yellow, 'foo']">color yellow, background black</view>
  <view :class="blue">color blue, fz14</view>
  <view :class="[$styleB.bar]">nothing</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = useCssModule()
const $style1 = useCssModule()
const $styleA = useCssModule('a')
const $styleB = useCssModule('b')
const blue = computed(() => {
  return [$styleA.blue, $style.fz14]
})
</script>

<style>
.foo {
  background: #000;
}
</style>

<style module>
.red {
  color: red;
}

.blue {
  color: blue;
}
.fz14 {
  font-size: 14px;
}
.fz16 {
  /* unused, will be deleted */
  font-size: 16px;
}
</style>

<style module>
.bg-black {
  background: #000;
}
.red {
  composes: bg-black;
}
.yellow {
  color: yellow;
}
</style>

<style module="a">
.blue {
  color: blue;
}
</style>

</style>

<style module>
.bg-black {
  background: #000;
}
.red {
  composes: bg-black;
}
.yellow {
  color: yellow;
}
</style>

<style module="a">
.blue {
  color: blue;
}
</style>

```

Will be converted to:

```vue
<template>
  <view class="_a _f _e">color red, background black</view>
  <view class="_g foo">color yellow, background black</view>
  <view :class="blue">color blue, fz14</view>
  <view :class="[$styleB.bar]">nothing</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = { fz14: '_c' }
const $style1 = {}
const $styleA = { blue: '_h' }
const $styleB = useCssModule('b')
const blue = computed(() => {
  return [$styleA.blue, $style.fz14]
})
</script>

<style>
.foo {
  background: #000;
}
</style>

<style>
._a {
  color: red;
}

._b {
  color: blue;
}
._c {
  font-size: 14px;
}
._d {
  font-size: 16px;
}
</style>

<style>
._e {
  background: #000;
}
._f {
}
._g {
  color: yellow;
}
</style>

<style>
._h {
  color: blue;
}
</style>
```
