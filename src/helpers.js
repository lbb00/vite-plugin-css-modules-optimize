import fs from 'node:fs'
import base62 from 'base62'
import { cwd } from 'node:process'

const currentPath = cwd()

function base62Encode(num) {
  // Get the shorter class name to avoid adding the prefix "_" when the num is less than 3276 and it starts with 0-9
  // Skip 0 -9, 10-9Z
  const b62Num = base62.encode(num + (num < 52 ? 10 : 568))
  return /^[0-9]/.test(b62Num) ? `_${b62Num}` : b62Num
}

export const generateScopedNameBase62Global = (() => {
  let count = 0
  const caches = {}

  function toClass62(num) {
    return base62Encode(num)
  }

  return (name, filename) => {
    const filePath = filename.split('?')[0]
    const fileIdx =
      filename
        .split('&')
        .find((i) => i.startsWith('index='))
        ?.split('=')[1] || ''
    let fileCache = caches[filePath]
    if (!fileCache) {
      fileCache = []
      caches[filePath] = fileCache
    }

    let idxArr = fileCache[fileIdx]
    if (!idxArr) {
      idxArr = []
      fileCache[fileIdx] = idxArr
    }
    let item = idxArr.find((item) => item.name === name)
    if (!item) {
      item = {
        name,
        idx: count,
      }
      idxArr.push(item)
      count = count + 1
    }
    return toClass62(item.idx)
  }
})()

export const generateScopedNameBase62Uniapp = (() => {
  const caches = {}

  function toClass62(num, isPage) {
    return (isPage ? '-' : '') + base62Encode(num)
  }

  function isPage(path) {
    // todo: watch file change
    let pagesJson = {
      pages: [],
      subPackages: [],
    }
    if (fs.existsSync('./src/pages.json')) {
      pagesJson = JSON.parse(fs.readFileSync('./src/pages.json'))
    }
    const pages = [
      ...pagesJson.pages.map((i) => i.path),
      ...(pagesJson.subPackages
        ?.map((i) => i.pages.map((j) => `${i.root}/${j.path}`))
        .flat() || []),
    ]

    return pages.find((i) =>
      path.startsWith(currentPath + '/src/' + i + '.vue')
    )
  }
  return (name, filename) => {
    const filePath = filename.split('?')[0]
    const fileIdx =
      filename
        .split('&')
        .find((i) => i.startsWith('index='))
        ?.split('=')[1] || ''
    let fileCache = caches[filePath]
    if (!fileCache) {
      fileCache = {
        count: 0,
        idxMap: {},
      }
      caches[filePath] = fileCache
    }

    let idxArr = fileCache.idxMap[fileIdx]
    if (!idxArr) {
      idxArr = []
      fileCache.idxMap[fileIdx] = idxArr
    }
    let item = idxArr.find((item) => item.name === name)
    if (!item) {
      item = {
        name,
        idx: fileCache.count,
      }
      idxArr.push(item)
      fileCache.count = fileCache.count + 1
    }
    return toClass62(item.idx, isPage(filename))
  }
})()
