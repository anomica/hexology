export const botMove = (origin, originIndex, target, targetIndex) => (
  {
    type: 'BOT-MOVE',
    payload: {
      origin: origin,
      originIndex: originIndex,
      target: target,
      targetIndex: targetIndex
    }
  }
)

export const botPurchase = (botResources) => (
  {
    type: 'BOT-PURCHASE',
    payload: botResources
  }
)
