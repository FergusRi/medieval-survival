// ============================================================
// citizen_sprites.js — State-based tunic colours + weapon overlays
// Phase 29: Visual identity driven by citizen state and weapon.
// ============================================================

/**
 * Return the tunic (shirt) colour for a citizen based on their current state.
 * @param {string} state  Citizen state string ('IDLE', 'BUILDING', etc.)
 * @param {string} baseColour  The citizen's assigned shirtColour
 * @returns {string} CSS colour
 */
export function getTunicColour(state, baseColour) {
  switch (state) {
    case 'FARMING':   return '#5a8a3a'; // green tunic
    case 'GATHERING': return '#8b5e20'; // brown tunic
    case 'BUILDING':  return '#7a7a7a'; // grey tunic
    case 'COMBAT':    return '#c0392b'; // red tunic
    case 'FLEEING':   return '#d4ac0d'; // yellow tunic
    default:          return baseColour; // IDLE / SAFE / EXPOSED: use assigned colour
  }
}

/**
 * Draw a weapon overlay to the right of the citizen's body.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx  citizen centre x
 * @param {number} cy  citizen centre y (body centre)
 * @param {number} facing  1 = right, -1 = left
 * @param {object|null} weapon  citizen.weapon (WEAPONS def) or null
 * @param {string} state  citizen state string
 */
export function drawWeaponOverlay(ctx, cx, cy, facing, weapon, state) {
  // Hoe for farmers
  if (state === 'FARMING') {
    ctx.save();
    ctx.strokeStyle = '#8b5e20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 7 * facing, cy - 6);
    ctx.lineTo(cx + 5 * facing, cy + 4);
    ctx.stroke();
    // Hoe blade
    ctx.strokeStyle = '#aaa';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 4 * facing, cy - 6);
    ctx.lineTo(cx + 9 * facing, cy - 6);
    ctx.stroke();
    ctx.restore();
    return;
  }

  // Pickaxe/axe for gatherers
  if (state === 'GATHERING') {
    ctx.save();
    ctx.strokeStyle = '#8b5e20';
    ctx.lineWidth = 1.5;
    // Handle
    ctx.beginPath();
    ctx.moveTo(cx + 6 * facing, cy - 5);
    ctx.lineTo(cx + 4 * facing, cy + 5);
    ctx.stroke();
    // Axe head
    ctx.fillStyle = '#aaa';
    ctx.beginPath();
    ctx.moveTo(cx + 4 * facing, cy - 5);
    ctx.lineTo(cx + 9 * facing, cy - 7);
    ctx.lineTo(cx + 9 * facing, cy - 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    return;
  }

  // No weapon equipped
  if (!weapon) return;

  ctx.save();
  const wType = weapon.type ?? weapon.name?.toLowerCase() ?? '';

  if (wType.includes('sword')) {
    // Diagonal silver rectangle (sword blade)
    ctx.strokeStyle = '#c0c8d0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + 5 * facing, cy - 7);
    ctx.lineTo(cx + 9 * facing, cy + 2);
    ctx.stroke();
    // Crossguard
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 6 * facing, cy - 3);
    ctx.lineTo(cx + 9 * facing, cy - 5);
    ctx.stroke();

  } else if (wType.includes('spear')) {
    // Long thin vertical line with point
    ctx.strokeStyle = '#8b5e20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + 7 * facing, cy + 6);
    ctx.lineTo(cx + 7 * facing, cy - 9);
    ctx.stroke();
    // Spear tip
    ctx.fillStyle = '#c0c8d0';
    ctx.beginPath();
    ctx.moveTo(cx + 7 * facing, cy - 9);
    ctx.lineTo(cx + 5 * facing, cy - 6);
    ctx.lineTo(cx + 9 * facing, cy - 6);
    ctx.closePath();
    ctx.fill();

  } else if (wType.includes('bow')) {
    // Curved arc
    ctx.strokeStyle = '#8b5e20';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(cx + 6 * facing, cy, 5, -Math.PI * 0.6, Math.PI * 0.6, facing < 0);
    ctx.stroke();
    // Bowstring
    ctx.strokeStyle = '#e8d8b0';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(cx + 6 * facing, cy - 5);
    ctx.lineTo(cx + 6 * facing, cy + 5);
    ctx.stroke();

  } else if (wType.includes('crossbow')) {
    // Horizontal T-shape
    ctx.strokeStyle = '#8b5e20';
    ctx.lineWidth = 1.5;
    // Stock
    ctx.beginPath();
    ctx.moveTo(cx + 4 * facing, cy);
    ctx.lineTo(cx + 9 * facing, cy);
    ctx.stroke();
    // Prod (crossbar)
    ctx.beginPath();
    ctx.moveTo(cx + 7 * facing, cy - 3);
    ctx.lineTo(cx + 7 * facing, cy + 3);
    ctx.stroke();
  }

  ctx.restore();
}
