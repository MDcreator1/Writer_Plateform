export interface Character {
  id: string;
  name: string;
  role: 'Protagonist' | 'Antagonist' | 'Companion' | 'Deuteragonist';
  faction: string;
  description: string;
  affinity: string;
  avatar: string;
  cardImage: string;
  stats: {
    power: number;
    intellect: number;
    resonance: number;
  };
}

export interface Faction {
  id: string;
  name: string;
  description: string;
  region: string;
  sigil: string;
}

export interface StoryLore {
  subtitle: string;
  authorBio: string;
  authorAvatar: string;
  authorWorksCount: number;
  authorFollowers: number;
  views: string;
  likes: string;
  status: string;
  readingTime: string;
  synopsis: string;
  timeline: string;
  worldInfo: {
    cosmos: string;
    magicSystem: string;
    loreText: string;
  };
  mainThemes: string[];
  storyHighlights: string[];
  characters: Character[];
  factions: Faction[];
}

const staticLoreMap: Record<string, StoryLore> = {
  "neon-oracle": {
    subtitle: "In the neon-drenched spires of Aethelgard, time is a currency, and the core is bleeding.",
    authorBio: "Dev Arlen is an award-winning speculative fiction writer who blends cosmic fantasy, high-technology lore, and deep psychological character arcs. Winner of the Codex Nebula Prize.",
    authorAvatar: "DA",
    authorWorksCount: 7,
    authorFollowers: 14205,
    views: "2.4M",
    likes: "384K",
    status: "Ongoing",
    readingTime: "12 hours",
    synopsis: "Ten thousand meters above the poisoned clouds of the surface, Aethelgard floats as a testament to humanity's absolute defiance. Built around the perpetual light-wells, the city runs entirely on Lumina, a fluid energy refined from the celestial ether. But behind the shimmering crystal facades lies a grim economic truth: Lumina is refined by condensing the biological lifespans of the lower-tier labor force. When Kaelen Vex, a Core technician of the subterranean Sector 9, is tasked with fixing a sudden pressure drop in the central conduit, he discovers something that shouldn't exist. Not a leaking valve, but an absolute localized tear in space-time—a pulsing, sentient obsidian heart known only as the Shadow Core. Drawn into its gravity, Kaelen is branded with its void-resonance. Now hunted by the pristine Archons of the Upper Spires, Kaelen must navigate a labyrinth of syndicate wars, celestial politics, and the unraveling lines of his own mind, before the core claims its final tribute.",
    timeline: "Year 842 of the Floating Epoch (Post-Cataclysm Era)",
    worldInfo: {
      cosmos: "The world consists of three tiers of floating plateaus: The Upper Elysium (home of the high-wealth Archons), The Mid-Spires (commercial and research hubs), and The Under-Sectors (smog-covered industrial roots). Below lies the Void-Ocean, a misty expanse of dead land where nothing organic survives.",
      magicSystem: "Chronos-Mana Resonance. Humans can inject liquefied ether directly into their neuro-conduits to manipulate localized physical constants (gravity, heat, inertia). However, overcharging corrupts the neural pathways, causing 'Core-fever' or complete spatial phase-out.",
      loreText: "The Shattering occurred six centuries ago, when the planetary core collapsed. The remaining survivors harnessed gravity-anchors and celestial magnets to lift chunks of the continental shelf into the skies, forming the Seven Skyland Alliances."
    },
    mainThemes: ["Sacrifice vs. Progress", "The Commodification of Time", "Techno-Feudal Tyranny", "Cognitive Fragmentation"],
    storyHighlights: [
      "Winner of the 2026 Interactive Fiction Grand Prize",
      "Stunning high-contrast worldbuilding blending mechanical depth with celestial awe",
      "Non-linear lore elements revealed through sensory annotations",
      "Deeply complex characters with conflicting moral compasses"
    ],
    characters: [
      {
        id: "char-1",
        name: "Kaelen Vex",
        role: "Protagonist",
        faction: "The Under-Sector Syndicate",
        affinity: "Void-Resonance",
        avatar: "KV",
        cardImage: "rgba(139, 92, 246, 0.15)",
        description: "A pragmatic Core technician whose exposure to the Shadow Core granted him the terrifying ability to dissolve momentum and phase through physical boundaries, at the cost of his own cellular stability.",
        stats: { power: 84, intellect: 92, resonance: 97 }
      },
      {
        id: "char-2",
        name: "Archon Selene",
        role: "Antagonist",
        faction: "Aethelgard High Council",
        affinity: "Gravity Nullifier",
        avatar: "AS",
        cardImage: "rgba(239, 68, 68, 0.15)",
        description: "The absolute ruler of the Elysium Spire. Blinded by the conviction that Aethelgard's survival requires infinite power, she intends to trigger a total Core Harvest, erasing the lower sectors to elevate her tier into the star-ways.",
        stats: { power: 98, intellect: 95, resonance: 89 }
      },
      {
        id: "char-3",
        name: "Lyra Thorn",
        role: "Companion",
        faction: "The Astral Guild of Exiles",
        affinity: "Chronos-Weaver",
        avatar: "LT",
        cardImage: "rgba(6, 182, 212, 0.15)",
        description: "An aristocratic rebel and daughter of a disgraced council lord. Lyra can stitch localized temporal anomalies, allowing her to rewind private events by exactly four seconds, a lethal gift in duel mechanics.",
        stats: { power: 76, intellect: 88, resonance: 94 }
      },
      {
        id: "char-4",
        name: "Maelis Karr",
        role: "Deuteragonist",
        faction: "The Iron Clad Guard",
        affinity: "Kinetic Shear",
        avatar: "MK",
        cardImage: "rgba(234, 179, 8, 0.15)",
        description: "A battle-hardened commander who chose exile over a mass purge order. Maelis commands heavy cybernetic plating and can convert incoming physical kinetic force directly into explosive close-quarters heat.",
        stats: { power: 95, intellect: 79, resonance: 68 }
      }
    ],
    factions: [
      {
        id: "fac-1",
        name: "The High Council",
        description: "The elite caste who control the flow of Lumina and govern the city from their gilded gardens in Upper Elysium. They maintain power through complete surveillance and the elite Praetorian Guard.",
        region: "Tier 1: Upper Elysium",
        sigil: "Gold Ring with a Crown of Light"
      },
      {
        id: "fac-2",
        name: "The Under-Sector Syndicate",
        description: "A loose coalition of labor cartels, shadow merchants, and rogue engineers who run the industrial underground. They survive by smuggling black-market mana and maintaining the auxiliary engines.",
        region: "Tier 3: The Under-Sectors",
        sigil: "An inverted gear enclosing a closed eye"
      },
      {
        id: "fac-3",
        name: "The Astral Seekers",
        description: "An outlawed monastic order of scholars who believe the floating sky-islands are slowly decaying and that humanity's only salvation lies in reconnecting with the ruined terrestrial surface below.",
        region: "The Edge-Outposts",
        sigil: "A shattered stellar compass"
      }
    ]
  },
  "ember-archive": {
    subtitle: "A royal archivist discovers that forbidden love letters are actually maps to a vanished kingdom.",
    authorBio: "Aarohi Vane is a master of romantic fantasy, creating lush worlds filled with intricate court conspiracies, slow-burn romances, and mysterious ancient magic.",
    authorAvatar: "AV",
    authorWorksCount: 4,
    authorFollowers: 9321,
    views: "1.2M",
    likes: "180K",
    status: "Ongoing",
    readingTime: "8 hours",
    synopsis: "Deep within the grand library of Solis-Vara, royal archivist Mira Valen translates historical treatises that have been sealed for a century. What she discovers isn't state documents, but intimate correspondence between a forgotten queen and a rebel commander. As she traces the poetry of their forbidden words, she realizes the prose holds hidden cartography—a literal coordinates system leading to the legendary Sunken Citadel of Aethelgard. Mira is forced to partner with the current Crown Prince's personal shadow agent to locate the ruins before the fanatical inquisitors of the Sun-Order burn the records.",
    timeline: "Year 312 of the Golden Crest (The Sovereign Epoch)",
    worldInfo: {
      cosmos: "Solis-Vara is a kingdom built along massive coastal cliffs, bordering the Searing Wastes. It is famous for its Grand Archives, carved directly into the basalt cliffs, containing records dating back before the Great Shatter.",
      magicSystem: "Glyph-Ink Resonance. Scribers can infuse their own life-force into specialized gold-laced ink, writing symbols that bend light, alter weight, or transmit silent thoughts to matching parchments.",
      loreText: "The Shattered Treaty occurred three generations ago, outlawing all magic related to the Sunken Citadel. The Order of Solar Inquisitors was created to search out and burn all literature containing hidden glyph-links."
    },
    mainThemes: ["Forbidden Truths", "Loyalty to Crown vs. History", "The Power of Written Words", "Slow-Burn Complicity"],
    storyHighlights: [
      "Richly descriptive prose and architectural mystery",
      "High-stakes royal court political intrigue",
      "Dynamic puzzles hidden inside historical documents",
      "Heart-tugging letters woven directly into the chapter progression"
    ],
    characters: [
      {
        id: "char-1",
        name: "Mira Valen",
        role: "Protagonist",
        faction: "The Grand Archives",
        affinity: "Glyph Translation",
        avatar: "MV",
        cardImage: "rgba(139, 92, 246, 0.15)",
        description: "An quiet, observant royal archivist who can decode ancient encrypted texts. Her discovery of the Queen's letters turns her from a quiet scholar into a wanted fugitive.",
        stats: { power: 45, intellect: 98, resonance: 88 }
      },
      {
        id: "char-2",
        name: "Prince Kaelen",
        role: "Deuteragonist",
        faction: "Solis-Vara Royalty",
        affinity: "Solar Blade",
        avatar: "PK",
        cardImage: "rgba(234, 179, 8, 0.15)",
        description: "The handsome Crown Prince who hides his rebellious ideals behind courtly masks. He needs the Sunken Citadel to save his dying kingdom, even if it means betraying his father.",
        stats: { power: 94, intellect: 85, resonance: 72 }
      },
      {
        id: "char-3",
        name: "Inquisitor Malakor",
        role: "Antagonist",
        faction: "The Order of Solar Purge",
        affinity: "Ashen Flame",
        avatar: "IM",
        cardImage: "rgba(239, 68, 68, 0.15)",
        description: "A cold, fanatical inquisitor dedicated to wiping out all traces of the old magic. He will burn down the archives if it stops the Citadel's secrets from returning to light.",
        stats: { power: 90, intellect: 92, resonance: 80 }
      },
      {
        id: "char-4",
        name: "Sylvia Vane",
        role: "Companion",
        faction: "The Silent Ink Syndicate",
        affinity: "Shadow Scribe",
        avatar: "SV",
        cardImage: "rgba(6, 182, 212, 0.15)",
        description: "A black-market merchant specializing in magical inks and forged royal seals. Her connection to Prince Kaelen makes her a vital ally in smuggling Mira out of the palace.",
        stats: { power: 72, intellect: 89, resonance: 92 }
      }
    ],
    factions: [
      {
        id: "fac-1",
        name: "The Royal Archives",
        description: "A guild of scholars and scribers who guard the basalt vaults of Solis-Vara. They believe in the preservation of history above any royal decree.",
        region: "The Sea Cliffs of Solis",
        sigil: "An open tome enclosing an ink quill"
      },
      {
        id: "fac-2",
        name: "The Solar Inquisition",
        description: "A militant religious order dedicated to hunting down banned scrolls and purifying those who practice written magic. They answer only to the High Inquisitor.",
        region: "The Citadel of Sun",
        sigil: "A burning sunburst enclosing a sword"
      },
      {
        id: "fac-3",
        name: "The Whisperers of the Citadel",
        description: "A secret society of descendants of the vanished kingdom. They pass down historical scrolls through code, waiting for the archivist who can open the way.",
        region: "The Under-City Sewers",
        sigil: "A crescent moon overlapping a gold key"
      }
    ]
  },
  "monsoon-court": {
    subtitle: "A courtroom poet challenges an empire with a verse that can either free a nation or destroy her family.",
    authorBio: "Meera Sable is a highly acclaimed writer of historical and political fiction. Her work explores themes of colonial clash, classical arts, and the moral choices of courtly life.",
    authorAvatar: "MS",
    authorWorksCount: 3,
    authorFollowers: 7205,
    views: "920K",
    likes: "115K",
    status: "Ongoing",
    readingTime: "10 hours",
    synopsis: "Set in the grand monsoon palace of Sundar-Raj, courtroom poet Devaki is tasked with writing the victory epic for the conquering Emperor. Instead, Devaki discovers that the conquest was built on a fabricated treaty that led to the execution of her husband's family. To expose the truth, she must weave the actual events of the massacre into the classical court meters, creating a double-meaning poem that will be read aloud in front of the entire Royal Court. If she succeeds, the provinces will rise. If she fails, her family's name will be erased from the imperial registers.",
    timeline: "Year 174 of the Rain Epoch (The Imperial Annexation)",
    worldInfo: {
      cosmos: "Sundar-Raj is a river-delta empire famous for its marble floating palaces, which are designed to rise and fall with the monsoon floods. The court politics revolve around poetic debate and agricultural treaties.",
      magicSystem: "Metered Resonance. Certain court singers can alter the atmosphere (humidity, barometric pressure, wind currents) by reciting classical poetry in precise, mathematically perfect meters.",
      loreText: "The Imperial Code was written by the conquering Emperor, outlawing regional dialects and restricting court poetry to the formal royal script, designed to suppress local history."
    },
    mainThemes: ["Art as Rebellion", "The Weight of Truth", "Imperial Tyranny", "Marital Compromise"],
    storyHighlights: [
      "Beautifully researched historical worldbuilding",
      "Deeply emotional family dynamics and court tension",
      "Stunning sequences of poetic duals and verbal battles",
      "Rich cultural tapestry reflecting riverine aesthetics"
    ],
    characters: [
      {
        id: "char-1",
        name: "Devaki Sable",
        role: "Protagonist",
        faction: "The Delta Scholars",
        affinity: "Atmospheric Verse",
        avatar: "DS",
        cardImage: "rgba(6, 182, 212, 0.15)",
        description: "The chief courtroom poet of Sundar-Raj. Her quick wit and absolute mastery of the royal meters make her both the Emperor's favorite and his greatest unseen threat.",
        stats: { power: 50, intellect: 97, resonance: 95 }
      },
      {
        id: "char-2",
        name: "Emperor Arjun",
        role: "Antagonist",
        faction: "The Imperial Throne",
        affinity: "Barometric Command",
        avatar: "EA",
        cardImage: "rgba(239, 68, 68, 0.15)",
        description: "A calculating, charismatic conqueror who believes the empire needs absolute unity to survive the changing seasons. He uses poetry to enforce order, but fears losing control.",
        stats: { power: 96, intellect: 91, resonance: 84 }
      },
      {
        id: "char-3",
        name: "Vikas Sable",
        role: "Companion",
        faction: "The Delta Resistance",
        affinity: "Scribe of Records",
        avatar: "VS",
        cardImage: "rgba(139, 92, 246, 0.15)",
        description: "Devaki's husband and a former royal clerk. Having survived the purge of the river-clans, he works secretly to gather documents proving the treaty was forged.",
        stats: { power: 65, intellect: 92, resonance: 60 }
      },
      {
        id: "char-4",
        name: "Poet Ramendra",
        role: "Deuteragonist",
        faction: "The Court of Whispers",
        affinity: "Rain Churner",
        avatar: "PR",
        cardImage: "rgba(234, 179, 8, 0.15)",
        description: "An elderly court poet who acts as Devaki's mentor. He holds the secrets of the ancient monsoon chants, but warns Devaki against using them for open war.",
        stats: { power: 80, intellect: 88, resonance: 90 }
      }
    ],
    factions: [
      {
        id: "fac-1",
        name: "The Imperial Throne",
        description: "The centralized royal government that rules from the Marble Spires. They control the grain reserves and enforce the Imperial Code using armored horse regiments.",
        region: "The Upper Delta",
        sigil: "A golden sun over a river wall"
      },
      {
        id: "fac-2",
        name: "The Delta Resistance",
        description: "A secret coalition of provincial governors, river boatmen, and poets who seek to restore the autonomy of the delta clans.",
        region: "The Lower Delta Marshes",
        sigil: "A lotus flower with three droplets"
      },
      {
        id: "fac-3",
        name: "The Monsoon Scribes",
        description: "A scholarly guild that tracks weather cycles and records court disputes. They maintain the ancient archives of rainfall and treaties.",
        region: "The River Observatories",
        sigil: "An open scroll behind a water drop"
      }
    ]
  }
};

export function getStoryLore(slug: string, title?: string, tags?: string[]): StoryLore {
  // Return static lore if matched
  if (staticLoreMap[slug]) {
    return staticLoreMap[slug];
  }

  // Otherwise generate dynamic fallback lore based on story name and tags
  const cleanTitle = title || slug.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  const cleanTags = tags && tags.length > 0 ? tags : ["Fantasy", "Intrigue", "Mystery"];
  
  const mainTag = cleanTags[0];
  const secTag = cleanTags[1] || cleanTags[0];

  // Helper to extract initials
  const initials = cleanTitle.split(" ").map(w => w.charAt(0).toUpperCase()).join("").slice(0, 2) || "ST";

  return {
    subtitle: `An epic tale of ${cleanTags.join(", ")}. Explore the secrets behind the veil of ${cleanTitle}.`,
    authorBio: `The author is a passionate creator specializing in ${mainTag} fiction, crafting detailed settings, immersive pacing, and memorable character interactions.`,
    authorAvatar: initials,
    authorWorksCount: 3,
    authorFollowers: 2840,
    views: "180K",
    likes: "24K",
    status: "Ongoing",
    readingTime: "6 hours",
    synopsis: `The world of ${cleanTitle} is on the brink of a historic turning point. Built around the principles of ${mainTag}, the central conflicts trace the balance of power, forgotten histories, and personal sacrifices. As the truth begins to unravel, characters find themselves caught between their oaths and their deepest desires, forcing a confrontation that will reshape their universe forever.`,
    timeline: "Year 125 of the Unified Calendar",
    worldInfo: {
      cosmos: `The story takes place within a detailed territory shaped by ${mainTag} elements, featuring distinct cultural regions, political factions, and environmental boundaries that challenge the survival of its inhabitants.`,
      magicSystem: `Resonance of ${secTag}. Characters can interact with the natural order or technology by channeling their focus, matching precise frequencies to materialize shifts in reality.`,
      loreText: `According to historical records, the world underwent a massive restructuring several generations ago, creating the current societal divisions and hidden artifacts that fuel the ongoing conflict.`
    },
    mainThemes: [`The Burden of truth`, `Duty vs. personal freedom`, `Power and corruption`],
    storyHighlights: [
      `High-stakes worldbuilding reflecting ${mainTag} principles`,
      `Intricate character relationships and secrets`,
      `Puzzles, clues, and revelations hidden throughout the story progression`
    ],
    characters: [
      {
        id: `char-dyn-1`,
        name: `Valen Crest`,
        role: "Protagonist",
        faction: "The Free Guild",
        affinity: `${mainTag} Focus`,
        avatar: "VC",
        cardImage: "rgba(139, 92, 246, 0.15)",
        description: `A determined explorer from the borderlands whose discovery of a hidden truth forces them into the center of the conflict.`,
        stats: { power: 78, intellect: 89, resonance: 92 }
      },
      {
        id: `char-dyn-2`,
        name: `Lord Marcus`,
        role: "Antagonist",
        faction: "The Ruling Council",
        affinity: `${secTag} Control`,
        avatar: "LM",
        cardImage: "rgba(239, 68, 68, 0.15)",
        description: `A powerful council leader whose ruthless methods are driven by the conviction that the current order must be preserved at all costs.`,
        stats: { power: 92, intellect: 94, resonance: 82 }
      },
      {
        id: `char-dyn-3`,
        name: `Aria Vance`,
        role: "Companion",
        faction: "The Shadow Alliance",
        affinity: "Silent Step",
        avatar: "AV",
        cardImage: "rgba(6, 182, 212, 0.15)",
        description: `A skilled rogue who operates in the shadows. Aria provides critical intelligence and mechanical support to Valen.`,
        stats: { power: 70, intellect: 88, resonance: 90 }
      }
    ],
    factions: [
      {
        id: `fac-dyn-1`,
        name: "The Ruling Council",
        description: `The central governing body that enforces laws and controls the distribution of resources within the core territory.`,
        region: "The Golden Spire",
        sigil: "A scale balanced on a sword"
      },
      {
        id: `fac-dyn-2`,
        name: "The Free Guild",
        description: `A loose confederation of rebels, traders, and scholars operating in the borderlands, advocating for historical openness.`,
        region: "The Outer Provinces",
        sigil: "A broken chain behind a star"
      }
    ]
  };
}
