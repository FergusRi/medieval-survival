// ============================================================
// registry.js — All 22 building definitions
// ============================================================
export const BUILDINGS = {
  capital:          { name:'Capital/HQ',      w:4, h:4, buildTime:0,   tier:'special', hp:500, staffSlots:0 },
  settlement:       { name:'Settlement',       w:3, h:3, buildTime:60,  tier:1, hp:200, staffSlots:0 },
  house:            { name:'House',            w:2, h:2, buildTime:30,  tier:1, hp:100, staffSlots:0 },
  farm_plot:        { name:'Farm Plot',        w:3, h:3, buildTime:20,  tier:1, hp:80,  staffSlots:1 },
  sprinkler:        { name:'Sprinkler',        w:1, h:1, buildTime:15,  tier:2, hp:50,  staffSlots:0 },
  lumber_mill:      { name:'Lumber Mill',      w:2, h:2, buildTime:40,  tier:1, hp:120, staffSlots:1 },
  quarry:           { name:'Quarry',           w:2, h:3, buildTime:50,  tier:1, hp:150, staffSlots:1 },
  forge:            { name:'Forge',            w:2, h:2, buildTime:60,  tier:2, hp:150, staffSlots:1 },
  mint:             { name:'Mint',             w:2, h:2, buildTime:80,  tier:3, hp:150, staffSlots:1 },
  granary:          { name:'Granary',          w:2, h:2, buildTime:40,  tier:1, hp:100, staffSlots:0 },
  storehouse:       { name:'Storehouse',       w:3, h:2, buildTime:50,  tier:1, hp:120, staffSlots:0 },
  market:           { name:'Market',           w:2, h:2, buildTime:60,  tier:2, hp:100, staffSlots:1 },
  blacksmith:       { name:'Blacksmith',       w:2, h:2, buildTime:60,  tier:2, hp:120, staffSlots:1 },
  armory:           { name:'Armory',           w:2, h:3, buildTime:70,  tier:2, hp:130, staffSlots:0 },
  wall:             { name:'Wall/Palisade',    w:1, h:1, buildTime:10,  tier:1, hp:80,  staffSlots:0 },
  gate:             { name:'Gate',             w:1, h:1, buildTime:15,  tier:1, hp:80,  staffSlots:0 },
  watchtower:       { name:'Watchtower',       w:1, h:1, buildTime:20,  tier:1, hp:60,  staffSlots:1 },
  arrow_tower:      { name:'Arrow Tower',      w:2, h:2, buildTime:45,  tier:1, hp:150, staffSlots:0 },
  ballista_tower:   { name:'Ballista',         w:2, h:2, buildTime:90,  tier:2, hp:200, staffSlots:0 },
  catapult_tower:   { name:'Catapult',         w:3, h:3, buildTime:120, tier:3, hp:250, staffSlots:0 },
  healers_hut:      { name:"Healer's Hut",     w:2, h:2, buildTime:50,  tier:1, hp:100, staffSlots:1 },
  guardhouse:       { name:'Guardhouse',       w:2, h:2, buildTime:40,  tier:1, hp:120, staffSlots:2 },
};
