import $ from 'gogocode'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
export function cssModulesOptimizePlugin() {
  let cssModulesConfig = {}
  return {
    name: 'css-modules-optimize',
    config(config, { command }) {
      cssModulesConfig = config.css?.modules || {}
    },
    async transform(code, id) {
      if (id.endsWith('.vue')) {
        // 直接用gogocode和正则谁更快？
        const hasCssModule = /\<style.*module/.test(code)
        const classNamesMap = {}

        if (hasCssModule) {
          const ast = $(code, {
            parseOptions: {
              language: 'vue',
            },
          })

          await Promise.all(
            ast.rootNode.node.styles.map((i, idx) => {
              if (!i.attrs.module) {
                return Promise.resolve()
              }
              return postcss([
                postcssModules({
                  ...cssModulesConfig,
                  getJSON: (_, json) => {
                    classNamesMap[idx] = {
                      moduleNames:
                        i.attrs.module === true ? undefined : i.attrs.module,
                      map: Object.keys(json).reduce((acc, key) => {
                        acc[key] = {
                          value: json[key],
                        }
                        return acc
                      }, {}),
                    }
                  },
                }),
              ])
                .process(i.content, {
                  from: `${id}?vue&type=style&index=${idx}&lang.module.${
                    i.attrs.lang || 'css'
                  }`,
                })
                .then(({ css }) => {
                  i.content = css
                })
            })
          )

          let script = ast.find('<script></script>')
          if (script.length === 0) {
            script = ast.find('<script setup></script>')
          }

          script.find(`const $_$0 = useCssModule()`).each((i) => {
            const cssModuleVarName = i.match[0][0].value
            const cssModuleName =
              i.find(`useCssModule($_$0)`).match[0]?.[0].value
            const idxArr = Object.keys(classNamesMap).filter(
              (i) => classNamesMap[i].moduleNames === cssModuleName
            )
            if (idxArr.length === 0) {
              return
            }

            // script
            const styles = {}
            i.parent()
              .find(`${cssModuleVarName}.$_$`)
              .each((i) => {
                const classname = i.match[0][0].value
                let values = []
                idxArr.forEach((idx) => {
                  const item = classNamesMap[idx].map[classname]
                  if (item) {
                    item.used = true
                    values.push(item.value)
                  }
                })
                styles[classname] = values.join(' ')
              })
            i.replaceBy(`const ${cssModuleVarName} = ${JSON.stringify(styles)}`)

            // template
            // todo: 优化性能，对于optional的vue script，只处理setup()中return的style
            ast
              .find(`<template></template>`)
              .find(`<$_$ :class="$_$1" $$$1>$$$2</$_$>`)
              .each((node) => {
                const newContent = $(node.match[1][0].value)
                  .find(`${cssModuleVarName}.$_$`)
                  .each((n) => {
                    const classname = n.match[0][0].value
                    const values = []
                    idxArr.forEach((idx) => {
                      const item = classNamesMap[idx].map[classname]
                      if (item) {
                        item.used = true
                        values.push(item.value)
                      }
                    })

                    if (values.length > 0) {
                      n.replaceBy(`'${values.join(' ')}'`)
                    }
                  })
                  .root()
                  // 字符串全部替换为双引号
                  .find(`"$_$"`)
                  .each((n) => {
                    n.replaceBy(`'${n.match[0][0].value}'`)
                  })
                  // 字符串数组格式化为字符串
                  .root()
                  .find(`[$_$]`)
                  .each((n) => {
                    if (
                      n.match[0].every((i) => {
                        return i.node.type === 'StringLiteral'
                      })
                    ) {
                      n.replaceBy(
                        `"${n.match[0].map((i) => i.value).join(' ')}"`
                      )
                    }
                  })
                  // todo: {["foo"]: true} 改为 {"foo": true}
                  .root()
                  .generate()
                if (newContent.startsWith('"')) {
                  node.replace(
                    `<$_$ :class="$_$1" $$$1>$$$2</$_$>`,
                    `<$_$ class=${newContent} $$$1>$$$2</$_$>`
                  )
                } else {
                  node.replace(
                    `<$_$ :class="$_$1" $$$1>$$$2</$_$>`,
                    `<$_$ :class='${newContent}' $$$1>$$$2</$_$>`
                  )
                }
              })
          })

          ast.rootNode.node.styles.forEach((i, idx) => {
            if (i.attrs.module) {
              // remove unused class
              const cssAst = postcss.parse(i.content)
              cssAst.walkRules((rule) => {
                const reserved = rule.selectors.some((selector) => {
                  const map = classNamesMap[idx].map
                  return (
                    !selector.startsWith('.') ||
                    Object.keys(map).find((i) =>
                      map[i].value.split(' ').includes(selector.slice(1))
                    )
                  )
                })
                if (!reserved) {
                  rule.remove()
                }
              })

              // remove module attrs
              i.attrs = Object.keys(i.attrs || {}).reduce((acc, key) => {
                if (key !== 'module') {
                  acc[key] = i.attrs[key]
                }
                return acc
              }, {})

              i.content = cssAst.toString()
            }
          })
          code = ast.generate()
        }
        return code
      }
    },
  }
}
