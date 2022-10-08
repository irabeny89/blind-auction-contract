// Solidity time in seconds
const sBiddingTime = 2
const sRevealTime = 2

module.exports = async (deployer, _, accounts) => {
  await deployer.deploy(
    artifacts.require("BlindAuction"), sBiddingTime, sRevealTime, accounts[0]
  )
}
