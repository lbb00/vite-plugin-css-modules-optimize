# vite-plugin-css-module-optimize

!> Currently, this is not a universal solution.

A css module optimization plugin for uniapp.

- Use the shorter base62 as the class name.
- Deleted unused css code.

## Example

```vue
<template>
  <view :class="$style.red">red</view>
  <view :class="[$style.yellow, 'foo']">yellow</view>
  <view :class="blue">blue</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = useCssModule()

const blue = computed(() => {
  return [$style.blue, $style.fz14]
})
</script>

<style module lang="scss">
.red {
  color: red;
}
.yellow {
  color: yellow;
}
.blue {
  color: blue;
}
.fz14 {
  font-size: 14px;
}
.fz16 {
  // unused, will be deleted
  font-size: 16px;
}
</style>
```

will be converted to:

```vue
<template>
  <view class="a">red</view>
  <view class="b foo">yellow</view>
  <view :class="blue">blue</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = useCssModule()

const blue = computed(() => {
  return [$style._c, $style._d]
})
</script>

<style lang="scss" module>
.a {
  color: red;
}
.b {
  color: yellow;
}
.c {
  color: blue;
}
.d {
  font-size: 14px;
}
</style>
```

## Usage

```javascript
// vite.config.js
import getCssModuleOptimizePlugin from 'vite-plugin-css-module-optimize'

const cssModuleOptimize = getCssModuleOptimizePlugin()
export default defineConfig({
  css: {
    modules: {
      generateScopedName: cssModuleOptimize.generateScopedName,
    },
  },
  plugins: [cssModuleOptimize, uni()],
})
```
