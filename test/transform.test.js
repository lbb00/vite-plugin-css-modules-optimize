import { test, expect } from 'vitest'
import cssModulesOptimizePlugin, {
  generateScopedNameBase62Uniapp,
} from '../src/main.js'

const cmo = cssModulesOptimizePlugin()
const transform = cmo.transform
cmo.config({
  css: {
    modules: {
      generateScopedName: generateScopedNameBase62Uniapp,
    },
  },
})

test('transform vue sfc with setup', async () => {
  const code = `
<template>
<div :class="$style.hello">hello</div>
<div :class="$s1.hello">hello</div>
<div :class="[$style.hello,$s1.hello]">hello</div>
<div :class="['color-yellow',$style.hello,{
    [$s1.hello]:true
}]">hello</div>
<div :class="$undefinedStyle.hello">hello</div>
<div :class="$empty.hello">hello</div>
<div :class="helloClassNames">hello</div>
</template>

<script setup>
const $style = useCssModule()
const $s1 = useCssModule('s1')

const helloClassNames = [$style.hello, $s1.hello].join(' ')
</script>

<style module>
.hello {
    color: red;
}
.unused {
    color: blue;
}
</style>

<style>
.color-yellow{
    color: yellow;
}
</style>

<style module="s1" lang="scss">
.helloAfter{
    color: blue;
}
.helloAfter::after{
    content: 'hello';
}


.hello {
    color: red;
    composes: helloAfter;
}

</style>
`

  console.log(await transform(code, 'test.vue'))

  const result = `
<template>
  <div class="a">hello</div>
</template>

<style>
.a {
    color: red;
}
</style>
`
  await expect(transform(code, 'test.vue')).resolves.toBe(result)
})

test('transform vue sfc with optional', async () => {
  const code = `
  <template>
  <div :class="$style.hello">hello</div>
  <div :class="$s1.hello">hello</div>
  <div :class="[$style.hello,$s1.hello]">hello</div>
  <div :class="['color-yellow',$style.hello,{
      [$s1.hello]:true
  }]">hello</div>
  <div :class="$undefinedStyle.hello">hello</div>
  <div :class="helloClassNames">hello</div>
  </template>

  <script>
  export default{
    computed(){
        return this.$style.hellow
    }
  }

  </script>

  <style module>
  .hello {
      color: red;
  }
  .unused {
      color: blue;
  }
  </style>

  <style>
  .color-yellow{
      color: yellow;
  }
  </style>

  <style module="s1" lang="scss">
  .helloAfter{
      color: blue;
  }
  .helloAfter::after{
      content: 'hello';
  }


  .hello {
      color: red;
      composes: helloAfter;
  }

  </style>`

  console.log(await transform(code, 'test.vue'))

  const result = `
  <template>
    <div class="a">hello</div>
  </template>

  <style>
  .a {
      color: red;
  }
  </style>
  `
  await expect(transform(code, 'test.vue')).resolves.toBe(result)
})
