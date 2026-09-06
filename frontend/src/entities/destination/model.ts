/** Curated destination templates used by discovery surfaces (dashboard tiles,
 * the trips carousel) and as seeds for the create-trip wizard.
 *
 * Photos live in `public/destinations/` and are re-fetched by
 * `scripts/fetch-destination-images.mjs`. Each is a Wikimedia Commons file kept
 * with its author and licence so the attribution ships with the app.
 */

/** Photo attribution. CC0 / public-domain entries need no visible credit, but
 * the record is kept for every image so the source stays traceable. */
export interface DestinationCredit {
  artist: string;
  license: string;
  source: string;
}

export interface DestinationTemplate {
  id: string;
  name: string;
  country: string;
  rating: number;
  badge?: string;
  description: string;
  /** Path under `public/`, served locally rather than hotlinked. */
  image: string;
  days: number;
  estimatedBudget: string;
  tags: string[];
  credit: DestinationCredit;
}

export const POPULAR_DESTINATIONS: DestinationTemplate[] = [
  {
    id: "genin-lake",
    name: "Genin Lake",
    country: "France",
    rating: 4.9,
    badge: "New for you",
    description: "Serene alpine lake ringed by pine forest and quiet walking trails in the Jura.",
    image: "/destinations/genin-lake.jpg",
    days: 4,
    estimatedBudget: "$650 / person",
    tags: ["Nature","Hiking","Alpine"],
    credit: {
      artist: "Meister",
      license: "CC BY-SA 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Lac_Genin_3.jpg",
    },
  },
  {
    id: "lake-como",
    name: "Lake Como",
    country: "Italy",
    rating: 4.8,
    badge: "Top Pick",
    description: "Dramatic shoreline, neoclassical villas, and long lakeside dinners in Lombardy.",
    image: "/destinations/lake-como.jpg",
    days: 5,
    estimatedBudget: "$890 / person",
    tags: ["Romantic","Scenic","Dining"],
    credit: {
      artist: "Luca Casartelli",
      license: "CC BY-SA 2.0",
      source: "https://commons.wikimedia.org/wiki/File:Sentiero_del_Viandante_DSC_6340_(14020554463).jpg",
    },
  },
  {
    id: "banff-park",
    name: "Banff National Park",
    country: "Canada",
    rating: 4.9,
    badge: "Adventure",
    description: "Turquoise glacial lakes, the Canadian Rockies, and wildlife at every turnout.",
    image: "/destinations/banff-park.jpg",
    days: 6,
    estimatedBudget: "$1,100 / person",
    tags: ["Mountains","Wildlife","Kayaking"],
    credit: {
      artist: "Gorgo",
      license: "Public domain",
      source: "https://commons.wikimedia.org/wiki/File:Moraine_Lake_17092005.jpg",
    },
  },
  {
    id: "kyoto-old-town",
    name: "Kyoto & Arashiyama",
    country: "Japan",
    rating: 4.9,
    badge: "Culture",
    description: "Bamboo groves, riverside temples, and old-town lanes best walked at dawn.",
    image: "/destinations/kyoto-old-town.jpg",
    days: 5,
    estimatedBudget: "$950 / person",
    tags: ["Temples","Autumn","Food"],
    credit: {
      artist: "lumoplank",
      license: "CC0",
      source: "https://commons.wikimedia.org/wiki/File:Arashiyama,_Part_II_-_Arashiyama7534.jpg",
    },
  },
  {
    id: "santorini",
    name: "Santorini",
    country: "Greece",
    rating: 4.7,
    badge: "Sunsets",
    description: "Whitewashed cliffs above a flooded caldera, and the best sunset in the Aegean.",
    image: "/destinations/santorini.jpg",
    days: 4,
    estimatedBudget: "$820 / person",
    tags: ["Islands","Sunsets","Seafood"],
    credit: {
      artist: "TomasEE",
      license: "CC BY 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Oia_sunset_-_panoramio_(2).jpg",
    },
  },
  {
    id: "reykjavik",
    name: "Reykjavik",
    country: "Iceland",
    rating: 4.7,
    badge: "Northern lights",
    description: "A compact capital with geothermal pools, and aurora within an hour of town.",
    image: "/destinations/reykjavik.jpg",
    days: 5,
    estimatedBudget: "$1,250 / person",
    tags: ["Aurora","Hot springs","Road trip"],
    credit: {
      artist: "Olga Ernst",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Reykjav%C3%ADk,_view_from_Hallgr%C3%ADmskirkja_(2).jpg",
    },
  },
  {
    id: "marrakesh",
    name: "Marrakesh",
    country: "Morocco",
    rating: 4.6,
    badge: "Markets",
    description: "Souks, riad courtyards, and garden pavilions under the Atlas foothills.",
    image: "/destinations/marrakesh.jpg",
    days: 4,
    estimatedBudget: "$700 / person",
    tags: ["Markets","Design","Desert"],
    credit: {
      artist: "Acp",
      license: "CC BY-SA 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Pavillon_Menarag%C3%A4rten.jpg",
    },
  },
  {
    id: "queenstown",
    name: "Queenstown",
    country: "New Zealand",
    rating: 4.8,
    badge: "Adventure",
    description: "Alpine lake town built for hiking, jet boats, and long scenic drives.",
    image: "/destinations/queenstown.jpg",
    days: 7,
    estimatedBudget: "$1,400 / person",
    tags: ["Hiking","Adrenaline","Lakes"],
    credit: {
      artist: "Bernard Spragg. NZ from Christchurch, New Zealand",
      license: "CC0",
      source: "https://commons.wikimedia.org/wiki/File:Queenstown_1_(8168013172).jpg",
    },
  },
  {
    id: "ha-long-bay",
    name: "Ha Long Bay",
    country: "Vietnam",
    rating: 4.7,
    badge: "Island cruise",
    description: "Limestone karsts rising out of the bay, best seen from an overnight boat.",
    image: "/destinations/ha-long-bay.jpg",
    days: 3,
    estimatedBudget: "$480 / person",
    tags: ["Cruise","Kayaking","Caves"],
    credit: {
      artist: "Taewangkorea",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Ha_Long_Bay_in_2019.jpg",
    },
  },
  {
    id: "machu-picchu",
    name: "Machu Picchu",
    country: "Peru",
    rating: 4.9,
    badge: "Bucket list",
    description: "Inca terraces on a ridge above the Urubamba, reached by rail or the trail.",
    image: "/destinations/machu-picchu.jpg",
    days: 6,
    estimatedBudget: "$1,320 / person",
    tags: ["History","Trekking","Andes"],
    credit: {
      artist: "Draceane",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Machu_Picchu,_2023_(012).jpg",
    },
  },
  {
    id: "ubud",
    name: "Ubud",
    country: "Indonesia",
    rating: 4.6,
    badge: "Slow travel",
    description: "Rice terraces, river gorges, and a walkable town full of warungs and studios.",
    image: "/destinations/ubud.jpg",
    days: 5,
    estimatedBudget: "$540 / person",
    tags: ["Rice fields","Wellness","Cafes"],
    credit: {
      artist: "Jorge Franganillo",
      license: "CC BY 2.0",
      source: "https://commons.wikimedia.org/wiki/File:Ubud_(49818456887).jpg",
    },
  },
  {
    id: "langkawi",
    name: "Langkawi",
    country: "Malaysia",
    rating: 4.5,
    badge: "Close to home",
    description: "Duty-free island with rainforest cable cars, mangrove tours, and easy beaches.",
    image: "/destinations/langkawi.jpg",
    days: 4,
    estimatedBudget: "$420 / person",
    tags: ["Beaches","Rainforest","Island"],
    credit: {
      artist: "Ttt.Osakanman",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Eagle_square_at_Kuah_Langkawi.jpg",
    },
  },
];
