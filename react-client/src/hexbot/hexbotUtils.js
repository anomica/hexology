export const evaluateCombat = (botHex, playerHex) => {
  let bSwordsmen = botHex.swordsmen, bArchers = botHex.archers, bKnights = botHex.knights;
  let pSwordsmen = playerHex.swordsmen, pArchers = playerHex.archers, pKnights = playerHex.knights;
  let bArmySize = bSwordsmen + bArchers + bKnights, pArmySize = pSwordsmen + pArchers + pKnights;

  bKnights && pArchers ? bKnights -= pArchers : null; // first, archers pick off knights from afar
  pKnights && bArchers ? pKnights -= bArchers : null;

  bSwordsmen && pKnights ? bSwordsmen -= (pKnights * 3) : null; // then, knights crash against swordsmen
  pSwordsmen && bKnights ? pSwordsmen -= (bKnights * 3) : null;

  bArchers && pSwordsmen ? bArchers -= (pSwordsmen * 2) : null; // finally, swordsmen take out archers
  pArchers && bSwordsmen ? pArchers -= (bSwordsmen * 2) : null;

  bKnights < 0 ? bKnights = 0 : null;
  pKnights < 0 ? pKnights = 0 : null;

  bArchers < 0 ? bArchers = 0 : null;
  pArchers < 0 ? pArchers = 0 : null;

  bSwordsmen < 0 ? bSwordsmen = 0 : null;
  pSwordsmen < 0 ? pSwordsmen = 0 : null;

  bArmySize = bSwordsmen + bArchers + bKnights, pArmySize = pSwordsmen + pArchers + pKnights;

  if (bArmySize > pArmySize) {
    while (pArmySize > 0) {
      if (bSwordsmen) {
        bSwordsmen--;
      } else if (bArchers) {
        bArchers--;
      } else if (bKnights) {
        bKnights--;
      }
      if (pSwordsmen) {
        pSwordsmen--;
      } else if (pArchers) {
        pArchers--;
      } else if (pKnights) {
        pKnights--;
      }

      bArmySize--;
      pArmySize--;
    }
  } else if (pArmySize > bArmySize) {
    while (bArmySize > 0) {
      if (pSwordsmen) {
        pSwordsmen--;
      } else if (pArchers) {
        pArchers--;
      } else if (pKnights) {
        pKnights--;
      }
      if (bSwordsmen) {
        bSwordsmen--;
      } else if (bArchers) {
        bArchers--;
      } else if (bKnights) {
        bKnights--;
      }

      pArmySize--;
      bArmySize--;
    }
  }

  if (bArmySize === pArmySize) {
    return {
      tie: true,
      swordDiff: bSwordsmen - pSwordsmen,
      archerDiff: bArchers - pArchers,
      knightDiff: bKnights - pKnights
    };
  } else {
    return {
      armyDiff: bArmySize - pArmySize,
      swordDiff: bSwordsmen - pSwordsmen,
      archerDiff: bArchers - pArchers,
      knightDiff: bKnights - pKnights
    }
  }
}
