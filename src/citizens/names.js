// ============================================================
// names.js — Medieval name generator
// ============================================================
const FIRST = [
  'Aldric','Beatrix','Cedric','Dorothea','Edmund','Freya','Godfrey','Helena',
  'Ingram','Juliana','Kelwin','Lavinia','Maddoc','Nessa','Osric','Petra',
  'Quentin','Rowena','Sigurd','Thalia','Ulric','Vivienne','Wulfric','Xena',
  'Ysabel','Zacharias','Aelric','Brigid','Corwin','Delia','Eadric','Fiona',
  'Gareth','Hilda','Ivor','Joanna','Kenelm','Leofric','Moira','Nigel',
  'Oswin','Pernell','Raedwald','Sybil','Thorvald','Ursula','Valiant','Wenna',
  'Aldwin','Bertilda','Caedmon','Deorwynn','Egbert','Flavia','Grimbert','Hawise',
  'Imogen','Jerome','Kenrick','Linette','Morwenna','Norbert','Orla','Priscilla',
  'Randolf','Seraphina','Tancred','Ubbard','Verity','Walburga','Ximena','Yolande',
  'Zephyr','Aedric','Blythe','Cressida','Dunstan','Elfric','Gwyneth','Hadwin',
];
const LAST = [
  'Ashford','Blackwood','Coldwell','Dunmore','Eastwick','Fairfield','Greystone','Highgate',
  'Ironwood','Jesterton','Knotwall','Longmoor','Mossbridge','Nettlefield','Oakhaven','Pinecrest',
  'Quarrystone','Ravenspire','Silverbrook','Thornwall','Underhill','Valewood','Winterborne','Yarrow',
  'Aldermoor','Bramblewood','Coppergate','Darkwater','Elmridge','Frostmere','Gloomhaven','Hollowwood',
  'Ironsong','Kettlewell','Larchwood','Mudwall','Northmere','Oldthorn','Pebblemoor',
];

export function assign() {
  const f = FIRST[Math.floor(Math.random() * FIRST.length)];
  const l = LAST [Math.floor(Math.random() * LAST.length)];
  return `${f} ${l}`;
}
