import $ from 'gogocode'
import postcss from 'postcss'
import postcssModules from 'postcss-modules'
import selectorParser from 'postcss-selector-parser'

export function cssModulesOptimizePlugin() {
  let cssModulesConfig = {}
  return {
    name: 'css-modules-optimize',
    config(config) {
      cssModulesConfig = config.css?.modules || {}
    },
    async transform(code, id) {
      if (id.endsWith('.vue')) {
        const hasCssModule = /<style.*[\s,",']module[\s,>]/.test(code)
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

          function replaceTemplate(cssModuleVarName, idxArr) {
            ast
              .find(`<template></template>`)
              .find([
                `<$_$ :class="$_$1" $$$1>$$$2</$_$>`,
                `<$_$ :class="$_$1" $$$1/>`,
              ])
              .each((item) => {
                const newContentAst = $(item.match[1][0].value)
                newContentAst
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
                  .replace(`"$_$"`, `"$_$"`)

                if (newContentAst.generate().startsWith('[')) {
                  newContentAst.find(`[$_$]`).each((n) => {
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
                }
                const newContent = newContentAst.generate()

                if (newContent.startsWith('"')) {
                  item.node.content.attributes.find((i) => {
                    if (i.key.content === ':class') {
                      i.key.content = 'class'
                    }
                  })
                  item.match[1][0].node.content = newContent.replace(
                    /(^")|("$)/g,
                    ''
                  )
                } else {
                  item.match[1][0].node.content = newContent.replace(/"/g, "'")
                }
              })
          }

          const cssModuleVarDecles = script.find(`const $_$0 = useCssModule()`)
          if (cssModuleVarDecles.length > 0) {
            cssModuleVarDecles.each((i) => {
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
              i.replaceBy(
                `const ${cssModuleVarName} = ${JSON.stringify(styles)}`
              )

              replaceTemplate(cssModuleVarName, idxArr)
            })
          } else if (!script.find(`{setup(){ $$$1 },$$$2}`).match['$$$1']) {
            // optional api
            const cssModuleVarName = '$style'
            // todo: script
            replaceTemplate(
              cssModuleVarName,
              Object.keys(classNamesMap).filter(
                (i) => classNamesMap[i].moduleNames === undefined
              )
            )
          }

          ast.rootNode.node.styles.forEach((i, idx) => {
            if (!classNamesMap[idx]) {
              return
            }
            const usedClassNamesMap = Object.keys(
              classNamesMap[idx].map
            ).reduce((acc, i) => {
              const { used, value } = classNamesMap[idx].map[i]
              if (used) {
                acc[value] = true
              }
              return acc
            }, {})
            if (i.attrs.module) {
              // remove unused class
              const cssAst = postcss.parse(i.content)
              cssAst.walkRules((rule) => {
                let reserved = false
                selectorParser((selectors) => {
                  selectors.walk((selector) => {
                    const selectorStr = String(selector)
                    if (
                      selectorStr.startsWith('.') &&
                      usedClassNamesMap[selectorStr.substring(1)]
                    ) {
                      reserved = true
                    }
                  })
                }).processSync(rule.selector, { lossless: false })

                if (!reserved) {
                  rule.remove()
                }
              })

              delete i.attrs.module
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
