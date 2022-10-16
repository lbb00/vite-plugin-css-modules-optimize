# vite-plugin-css-module-optimize

!> Currently in testing stage, do not use in production.

A css module optimization plugin for vue.

- Deleted unused css code.
- Use the shorter base62 as the class name by default(Support custom).

## Usage

### install

```bash
npm install -D vite-plugin-css-module-optimize
```

### For Vue

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import getCssModuleOptimizePlugin from 'vite-plugin-css-module-optimize'

// getCssModuleOptimizePlugin params : { preScopedNamePrefix, preGenarateScopedName }
// - preScopedNamePrefix   Optional, default is '_'
// - preGenarateScopedName Optional, custom scoped name

const cssModuleOptimize = getCssModuleOptimizePlugin()
export default defineConfig({
  css: {
    modules: {
      generateScopedName: cssModuleOptimize.generateScopedName,
    },
  },
  plugins: [cssModuleOptimize, vue()],
})
```

### For Uniapp mp-weixin

由于微信小程序默认样式规则只有当前页面样式会影响到当前页面引用的组件，组件间、父子组件默认是隔离的。

所以可以采用页面级组件样式增加一个前缀（示例里加的是`_`，可以自定义），其余组件都从 base62 `a` 开始生成样式名，达到最优的优化。

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'
import base62 from 'base62'
import fs from 'fs'

import getCssModuleOptimizePlugin from 'vite-plugin-css-module-optimize'

const cssModuleOptimize = getCssModuleOptimizePlugin({
  preGenarateScopedName: (() => {
    const fMap = {}
    const pagesJson = JSON.parse(fs.readFileSync('./src/pages.json'))
    const pages = [
      ...pagesJson.pages.map((i) => i.path),
      ...(pagesJson.subPackages
        ?.map((i) => i.pages.map((j) => `${i.root}/${j.path}`))
        ?.flat() || []),
    ]

    function isPage(path) {
      return pages.find((i) =>
        path.startsWith(__dirname + '/src/' + i + '.vue')
      )
    }

    return (name, filename) => {
      if (!fMap[filename]) {
        fMap[filename] = 10
      }
      return `${isPage(filename) ? '_' : ''}${base62.encode(fMap[filename]++)}`
    }
  })(),
})

export default defineConfig({
  css: {
    modules: {
      generateScopedName: cssModuleOptimize.generateScopedName,
    },
  },
  plugins: [cssModuleOptimize, uni()],
})
```

## Example

Source code :

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

Will be converted to:

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
// '_' is `preScopedNamePrefix` default config
._a {
  color: red;
}
._b {
  color: yellow;
}
._c {
  color: blue;
}
._d {
  font-size: 14px;
}
</style>
```

The end, `generateScopedName` function will remove the `preScopedNamePrefix`, like:

```vue
<template>
  <view class="a">red</view>
  <view class="b foo">yellow</view>
  <view :class="blue">blue</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = {
  _c: 'c',
  _d: 'd',
}

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
