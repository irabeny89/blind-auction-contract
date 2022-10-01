module.exports = {
  reduceString: stringValue => {
    if (typeof stringValue === "string" && stringValue.length > 10)
      return `${stringValue.substring(0, 5)}...${stringValue.slice(-3)}`
    else throw new Error("Not string type and/or string less than 11")
  }
}