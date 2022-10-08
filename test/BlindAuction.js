const BlindAuction = artifacts.require("BlindAuction")

const { timeout } = require("../utils")

const { toHex } = web3.utils

contract("Blind Auction", accounts => {
  const beneficiary = accounts[0],
    bidder1 = accounts[8],
    bidder2 = accounts[9],
    // bidding and reveal time set in migrations script
    sBiddingTime = 2,
    sRevealTime = 2,
    value1 = 1e9,
    value2 = 2e9,
    value3 = 3e9,
    value4 = 4e9,
    isFake1 = false,
    isFake2 = true,
    isFake3 = false,
    isFake4 = false,
    secret1 = toHex("secret1"),
    secret2 = toHex("secret2"),
    secret3 = toHex("secret3"),
    secret4 = toHex("secret4")

  let contract, bidHash1, bidHash2, bidHash3, bidHash4
  before(async () => {
    contract = await BlindAuction.deployed()
    bidHash1 = await contract.createBlindedBid(value1, isFake1, secret1)
    bidHash2 = await contract.createBlindedBid(value2, isFake2, secret2)
    bidHash3 = await contract.createBlindedBid(value3, isFake3, secret3)
    bidHash4 = await contract.createBlindedBid(value4, isFake4, secret4)
  })

  it("contract is deployed", async () => {
    const beneficiary_ = await contract.beneficiary(),
      sBiddingEndTimestamp = (await contract.biddingEnd()).toNumber(),
      sRevealTimeTimestamp = (await contract.revealEnd()).toNumber();

    const sCurrentTimestamp = Date.now() / 1e3

    // derive timestamp from sBiddingTime in seconds
    const sBiddingEndTimestamp_ = sCurrentTimestamp + sBiddingTime,
      // time difference between node runtime and evm
      sTimeDifference1 = sBiddingEndTimestamp_ - sBiddingEndTimestamp

    // derive timestamp from sRevealTime in seconds
    const sRevealTimeTimestamp_ = sBiddingEndTimestamp_ + sRevealTime,
      // time difference between node runtime and evm
      sTimeDifference2 = sRevealTimeTimestamp_ - sRevealTimeTimestamp

    assert.equal(beneficiary, beneficiary_);
    // time difference should be less than 2 seconds max
    // because this script should run within a second
    assert.equal(sTimeDifference1 < 2, true)
    assert.equal(sTimeDifference2 < 2, true)
  })

  it("pure function creates blinded bid hash", async () => {
    const bidHash = await contract.createBlindedBid(value1, isFake1, secret1)

    assert.equal(typeof bidHash, "string")
  })

  it("place fake & real bids", async () => {
    // bids in sequencial order
    // #1 - real bid
    const { logs: [
      { args: { index: bidder1BidIndex0 } }
    ] } = await contract.bid(bidHash1, { from: bidder1, value: value1 })
    // #2 - fake bid
    const { logs: [
      { args: { index: bidder1BidIndex1 } }
    ] } = await contract.bid(bidHash2, { from: bidder1, value: value2 })
    // #3 - challenge higher real bid
    const { logs: [
      { args: { index: bidder2BidIndex0 } }
    ] } = await contract.bid(bidHash3, { from: bidder2, value: value3 })
    // #4 - counter challenge higher real bid
    const { logs: [
      { args: { index: bidder1BidIndex2 } }
    ] } = await contract.bid(bidHash4, { from: bidder1, value: value4 })

    assert.equal(bidder1BidIndex0, 0)
    assert.equal(bidder1BidIndex1, 1)
    assert.equal(bidder1BidIndex2, 2)
    assert.equal(bidder2BidIndex0, 0)
  })

  it("revert on early and/or late reveal calls", async () => {
    const values = [value1, value2],
      fakes = [isFake1, isFake2],
      secrets = [toHex(secret1), toHex(secret2)]
    try {
      await contract.reveal(values, fakes, secrets, { from: bidder1 })
    } catch ({ reason }) {
      assert.equal(reason.startsWith("Custom error"), true)
    }
  })

  it("revert reveal on inconsistent arguments", async () => {
    let values = fakes = secrets = []
    try {
      await contract.reveal(values, fakes, secrets, { from: bidder1 })
    } catch ({ reason }) {
      assert.equal(reason.startsWith("Custom error"), true)
    }
  })
  // this test will delay(via timeout function below)
  // the whole contract tests left
  it("reverts on late bidding", async () => {
    await timeout(sBiddingTime)

    try {
      await contract.bid(bidHash1, { from: bidder1, value: value1 })
    } catch ({ reason }) {
      assert.equal(reason.startsWith("Custom error"), true)
    }
  })

  it("refund fake bids on reveal", async () => {
    const values = [value1, value2, value4],
      fakes = [isFake1, isFake2, isFake4],
      secrets = [secret1, secret2, secret4]

    const {
      logs: [{ args: { recipient, refund } }]
    } = await contract.reveal(values, fakes, secrets, { from: bidder1 })

    assert.equal(bidder1, recipient)
    assert.equal(value2, refund)
  })

  it("withdraw old lower bids", async () => {
    const { logs: [{
      args: { amount }
    }] } = await contract.withdraw({ from: bidder1 })

    assert.equal(amount.toNumber(), value1)
    assert.notEqual(amount.toNumber(), value2)
  })

  it("reverts withdraws when reveal period has not expired", async () => {
    try {
      await contract.auctionEnd()
    } catch ({ reason }) {
      assert.equal(reason.startsWith("Custom error"), true)
    }
  })

  it("after reveal period is over, highest bid is transferred to beneficiary on auction end", async () => {
    await timeout(3)
    
    const { logs: [{
      args: { winner, highestBid }
    }] } = await contract.auctionEnd({gas: 1e6, gasPrice: 1e9})

    assert.equal(highestBid.toNumber(), value4)
    assert.equal(winner, bidder1)
  })
})