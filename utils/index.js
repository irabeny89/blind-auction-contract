/**
 * Reduce long strings greater than 10 characters and replace the excess in-between with ellipsis.
 * @param stringValue to be reduced with ellipsis.
 * @returns reduced string with ellipsis inbetween.
 */
function reduceString(stringValue) {
  if (typeof stringValue === "string" && stringValue.length > 10)
    return `${stringValue.substring(0, 5)}...${stringValue.slice(-3)}`
  else throw new Error("Not string type and/or string less than 11")
}

/**
 * Delays for a specified period of time in seconds.
 * @param sTime delay period in seconds.
 */
const timeout = sTime => new Promise(res => setTimeout(res, sTime * 1e3))

module.exports = { reduceString, timeout }