'use strict'

const postcss = require('postcss')
const { createPropListMatcher } = require('./src/prop-list-matcher')
const { getUnitRegexp } = require('./src/pixel-unit-regexp')

const defaults = {
  unitToConvert: 'px',
  viewportWidth: 320,
  viewportHeight: 568,
  unitPrecision: 5,
  viewportUnit: 'vw',
  fontViewportUnit: 'vw',
  selectorBlackList: [],
  propList: ['*'],
  minPixelValue: 1,
  mediaQuery: false,
  replace: true,
  landscape: false,
  landscapeUnit: 'vw',
  landscapeWidth: 568
}

const ignoreNextComment = 'px-to-viewport-ignore-next'
const ignorePrevComment = 'px-to-viewport-ignore'

module.exports = (options = {}) => {
  const opts = Object.assign({}, defaults, options)

  checkRegExpOrArray(opts, 'exclude')
  checkRegExpOrArray(opts, 'include')

  const pxRegex = getUnitRegexp(opts.unitToConvert)
  const satisfyPropList = createPropListMatcher(opts.propList)
  const landscapeRules = []

  return {
    postcssPlugin: 'postcss-px-to-viewport',
    Once(css, { result }) {
      css.walkRules(function (rule) {
        const file = rule.source && rule.source.input.file

        if (opts.include && file) {
          if (
            Object.prototype.toString.call(opts.include) === '[object RegExp]'
          ) {
            if (!opts.include.test(file)) return
          } else if (
            Object.prototype.toString.call(opts.include) === '[object Array]'
          ) {
            let flag = false
            for (let i = 0; i < opts.include.length; i++) {
              if (opts.include[i].test(file)) {
                flag = true
                break
              }
            }
            if (!flag) return
          }
        }

        if (opts.exclude && file) {
          if (
            Object.prototype.toString.call(opts.exclude) === '[object RegExp]'
          ) {
            if (opts.exclude.test(file)) return
          } else if (
            Object.prototype.toString.call(opts.exclude) === '[object Array]'
          ) {
            for (let i = 0; i < opts.exclude.length; i++) {
              if (opts.exclude[i].test(file)) return
            }
          } else {
            throw new Error('options.exclude should be RegExp or Array.')
          }
        }

        if (blacklistedSelector(opts.selectorBlackList, rule.selector)) return

        if (opts.landscape && !rule.parent.params) {
          const landscapeRule = rule.clone().removeAll()

          rule.walkDecls(function (decl) {
            if (decl.value.indexOf(opts.unitToConvert) === -1) return
            if (!satisfyPropList(decl.prop)) return

            landscapeRule.append(
              decl.clone({
                value: decl.value.replace(
                  pxRegex,
                  createPxReplace(opts, opts.landscapeUnit, opts.landscapeWidth)
                )
              })
            )
          })

          if (landscapeRule.nodes.length > 0) {
            landscapeRules.push(landscapeRule)
          }
        }

        if (!validateParams(rule.parent.params, opts.mediaQuery)) return

        rule.walkDecls(function (decl, i) {
          if (decl.value.indexOf(opts.unitToConvert) === -1) return
          if (!satisfyPropList(decl.prop)) return

          const prev = decl.prev()

          if (
            prev &&
            prev.type === 'comment' &&
            prev.text === ignoreNextComment
          ) {
            prev.remove()
            return
          }

          const next = decl.next()

          if (
            next &&
            next.type === 'comment' &&
            next.text === ignorePrevComment
          ) {
            if (/\n/.test(next.raws.before)) {
              result.warn(
                'Unexpected comment /* ' +
                  ignorePrevComment +
                  ' */ must be after declaration at same line.',
                { node: next }
              )
            } else {
              next.remove()
              return
            }
          }

          let unit
          let size
          const params = rule.parent.params

          if (opts.landscape && params && params.indexOf('landscape') !== -1) {
            unit = opts.landscapeUnit
            size = opts.landscapeWidth
          } else {
            unit = getUnit(decl.prop, opts)
            size = opts.viewportWidth
          }

          const value = decl.value.replace(
            pxRegex,
            createPxReplace(opts, unit, size)
          )

          if (declarationExists(decl.parent, decl.prop, value)) return

          if (opts.replace) {
            decl.value = value
          } else {
            decl.parent.insertAfter(i, decl.clone({ value: value }))
          }
        })
      })

      if (landscapeRules.length > 0) {
        const landscapeRoot = postcss.atRule({
          params: '(orientation: landscape)',
          name: 'media'
        })

        landscapeRules.forEach(function (rule) {
          landscapeRoot.append(rule)
        })
        css.append(landscapeRoot)
      }
    }
  }
}

module.exports.postcss = true

function getUnit(prop, opts) {
  return prop.indexOf('font') === -1 ? opts.viewportUnit : opts.fontViewportUnit
}

function createPxReplace(opts, viewportUnit, viewportSize) {
  return function (m, $1) {
    if (!$1) return m
    const pixels = parseFloat($1)
    if (pixels <= opts.minPixelValue) return m
    const parsedVal = toFixed((pixels / viewportSize) * 100, opts.unitPrecision)
    return parsedVal === 0 ? '0' : parsedVal + viewportUnit
  }
}

function checkRegExpOrArray(options, optionName) {
  const option = options[optionName]
  if (!option) return
  if (Object.prototype.toString.call(option) === '[object RegExp]') return
  if (Object.prototype.toString.call(option) === '[object Array]') {
    let bad = false
    for (let i = 0; i < option.length; i++) {
      if (Object.prototype.toString.call(option[i]) !== '[object RegExp]') {
        bad = true
        break
      }
    }
    if (!bad) return
  }
  throw new Error(
    'options.' + optionName + ' should be RegExp or Array of RegExp.'
  )
}

function toFixed(number, precision) {
  const multiplier = Math.pow(10, precision + 1)
  const wholeNumber = Math.floor(number * multiplier)
  return (Math.round(wholeNumber / 10) * 10) / multiplier
}

function blacklistedSelector(blacklist, selector) {
  if (typeof selector !== 'string') return
  return blacklist.some(function (regex) {
    if (typeof regex === 'string') return selector.indexOf(regex) !== -1
    return selector.match(regex)
  })
}

function declarationExists(decls, prop, value) {
  return decls.some(function (decl) {
    return decl.prop === prop && decl.value === value
  })
}

function validateParams(params, mediaQuery) {
  return !params || (params && mediaQuery)
}
