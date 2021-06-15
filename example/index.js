'use strict'

const fs = require('fs')
const postcss = require('postcss')
const pxToViewport = require('..')
const css = fs.readFileSync('main.css', 'utf8')

const processedCss = postcss(pxToViewport()).process(css).css

fs.writeFile('main-viewport.css', processedCss, function (err) {
  if (err) {
    throw err
  }
  console.log('File with viewport units written.')
})
