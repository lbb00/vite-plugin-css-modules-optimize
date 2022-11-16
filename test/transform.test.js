const { cssModulesOptimizePlugin } = require('../dist/main.js')

const cmo = cssModulesOptimizePlugin()
const transform = cmo.transform

const input = `<template>
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
</style>`

const output = `
<template>
  <view class="_red_gjrx2_2 _red_svl8m_5 _bg-black_svl8m_2 _red_svl8m_5 _bg-black_svl8m_2">color red, background black</view>
  <view class='_yellow_svl8m_8 _yellow_svl8m_8 foo'>color yellow, background black</view>
  <view :class='blue'>color blue, fz14</view>
  <view :class='[$styleB.bar]'>nothing</view>
</template>

<script setup>
import { useCssModule, computed } from 'vue'
const $style = {"fz14":"_fz14_gjrx2_9"}
const $style1 = {}
const $styleA = {"blue":"_blue_vycji_2 _blue_vycji_2"}
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
._red_gjrx2_2 {
color: red;
}

._blue_gjrx2_6 {
color: blue;
}
._fz14_gjrx2_9 {
font-size: 14px;
}
._fz16_gjrx2_12 {
/* unused, will be deleted */
font-size: 16px;
}
</style>

<style>
._bg-black_svl8m_2 {
background: #000;
}
._red_svl8m_5 {
}
._yellow_svl8m_8 {
color: yellow;
}
</style>

<style>
._blue_vycji_2 {
color: blue;
}
</style>

<style>
._bg-black_svl8m_2 {
background: #000;
}
._red_svl8m_5 {
}
._yellow_svl8m_8 {
color: yellow;
}
</style>

<style>
._blue_vycji_2 {
color: blue;
}
</style>
`

describe('transform vue SFC file', () => {
  test('transform', async () => {
    expect(await transform(input, 'test.vue')).toBe(output)
  })
})
