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
