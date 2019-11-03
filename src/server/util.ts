function memoize(passedFunc) {
  let cache = {}
  return function(x) {
    if (x in cache) {
      return cache[x]
    }
    return (cache[x] = passedFunc(x))
  }
}

export { memoize }
