import $ from 'gogocode'
import postcss from 'postcss'
import base62 from 'base62'

const CSS_PREFIX = '_'

export default function UniCssModule() {
  return {
    name: 'css-module-optimize',
    generateScopedName(name) {
      if (name.startsWith(CSS_PREFIX)) {
        return name.replace(CSS_PREFIX, '')
      }
      return name
    },
    transform(code, id) {
      if (id.endsWith('.vue')) {
        // 直接用gogocode和正则谁更快？
        const styleModule = code.match(/\<style.*module.*\>([\s\S]*)<\/style\>/)
        const classNames = []

        if (styleModule) {
          const cssAst = postcss.parse(styleModule[1])
          cssAst.walkRules((rule) => {
            rule.selectors = rule.selectors.map((name) => {
              if (!name.startsWith('.')) {
                return name
              }
              const idx = classNames.findIndex((i) => {
                i.name === name
              })
              if (idx > -1) {
                return classNames[i].value
              }

              const item = {
                name,
                value: base62.encode(classNames.length + 10),
              }
              classNames.push(item)
              return `.${CSS_PREFIX}${item.value}`
            })
          })

          const ast = $(code, {
            parseOptions: {
              language: 'vue',
            },
          })
          let script = ast.find('<script></script>')
          if (script.length === 0) {
            script = ast.find('<script setup></script>')
          }

          script.find(`const $_$1 = useCssModule()`).each((i) => {
            i.match[1].forEach(({ value: cssModuleVarName }) => {
              i.parent()
                .find(`${cssModuleVarName}.$_$`)
                .each((i) => {
                  classNames.some((classname) => {
                    if (classname.name === `.${i.match[0][0].value}`) {
                      classname.used = true
                      i.replaceBy(
                        `${cssModuleVarName}.${CSS_PREFIX}${classname.value}`
                      )
                      return true
                    }
                  })
                })
              // todo: 优化，对于非setup的script，只处理setup()中return的style
              ast
                .find(`<template></template>`)
                .find(`<$_$ :class="$_$1" $$$1>$$$2</$_$>`)
                .each((node) => {
                  const newContent = $(node.match[1][0].value)
                    .find(`${cssModuleVarName}.$_$`)
                    .each((n) => {
                      const foundClassName = classNames.find((i) => {
                        if (i.name === `.${n.match[0][0].value}`) {
                          i.used = true
                          return true
                        }
                      })
                      if (foundClassName) {
                        n.replaceBy(`'${foundClassName.value}'`)
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
          })

          cssAst.walkRules((rule) => {
            const needDel = rule.selectors.every((selector) => {
              // todo: 没有解决 view > .foo{ color: red;}
              return (
                selector.startsWith('.') &&
                !classNames.find(
                  (classname) =>
                    classname.used &&
                    `.${CSS_PREFIX}${classname.value}` === selector
                )
              )
            })
            if (needDel) {
              rule.remove()
            }
          })

          ast.rootNode.node.styles[0].content = cssAst.toString()
          return ast.generate()
        }
        return code
      }
    },
  }
}
