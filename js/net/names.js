// Witty geography-themed starter names for the leaderboard ("Tectonic Toucan 42"). Players can keep one,
// shuffle for another, or type their own. Every suggestion passes the same name rules as typed names.
import { nameProblem, NAME_MAX } from './profanity.js';

const ADJ = ['Lost', 'Wandering', 'Tectonic', 'Sleepy', 'Brave', 'Dizzy', 'Mighty', 'Polar', 'Tropical', 'Jolly',
  'Curious', 'Sneaky', 'Rogue', 'Cosmic', 'Humble', 'Restless', 'Windswept', 'Volcanic', 'Coastal', 'Nomadic',
  'Upside Down', 'Equatorial', 'Landlocked', 'Misplaced', 'Fearless', 'Spinning', 'Tidal', 'Frosty', 'Sunburnt', 'Uncharted'];
const NOUN = ['Meridian', 'Fjord', 'Atoll', 'Isthmus', 'Tundra', 'Glacier', 'Delta', 'Mesa', 'Steppe', 'Volcano',
  'Lagoon', 'Penguin', 'Yak', 'Toucan', 'Narwhal', 'Llama', 'Compass', 'Nomad', 'Explorer', 'Capybara',
  'Monsoon', 'Sherpa', 'Walrus', 'Iceberg', 'Dune', 'Peninsula', 'Kangaroo', 'Oasis', 'Plateau', 'Sextant'];
const TITLE = ['Captain', 'Professor', 'Doctor', 'Sir', 'Lady', 'Baron', 'Admiral', 'Agent'];
const FEATURE = ['Equator', 'Longitude', 'Latitude', 'Atlas', 'Mercator', 'Tropics', 'Compass', 'Hemisphere', 'Isobar', 'Contour'];
const PUNS = ['Mapsalot', 'Globetrotter', 'Strait Shooter', 'Lord of the Fjords', 'Gulf Stream Queen', 'Ctrl Alt Delta',
  'Continental Drifter', 'Bay Watcher', 'Isle Be Back', 'Seas the Day', 'Fjord Focus', 'Peak Performer',
  'Tundra Thunder', 'Cape Crusader', 'Rock and Roll Basin', 'Lava Lamp', 'Moor or Less', 'Plate Tectonix'];

const pick = (list, rand) => list[Math.floor(rand() * list.length)];

/** A fresh suggestion, at most NAME_MAX characters, always valid under nameProblem(). */
export function generateName(rand = Math.random) {
  for (let tries = 0; tries < 40; tries++) {
    const style = rand();
    let base = style < 0.55 ? `${pick(ADJ, rand)} ${pick(NOUN, rand)}`
      : style < 0.8 ? `${pick(TITLE, rand)} ${pick(FEATURE, rand)}`
        : pick(PUNS, rand);
    // a short number keeps names unique on the board without looking like a serial code
    const withNum = `${base} ${10 + Math.floor(rand() * 90)}`;
    const name = withNum.length <= NAME_MAX ? withNum : base;
    if (name.length <= NAME_MAX && !nameProblem(name)) return name;
  }
  return 'Globe Explorer ' + (10 + Math.floor(rand() * 90));
}
