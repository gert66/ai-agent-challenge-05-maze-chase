/**
 * Original level layouts for Glimmerdash, described as ASCII tile maps.
 *
 * Legend:
 *   #  wall
 *   o  pellet (floor tile with a collectable pellet)
 *   *  power pellet (floor tile with a temporary power-up pellet)
 *   B  Bloomburst (floor tile with the empowerment power-up: while it lasts,
 *      touching a Duskwisp defeats it for bonus score instead of costing a life)
 *   P  player spawn (plain floor once parsed)
 *   G  Duskwisp den - enemy pen/spawn area (walkable floor)
 *   T  tunnel edge - wraps horizontally to the opposite edge of the same row
 *
 * Row lengths are built from `wall(n)`/`floor(n)` repeats rather than typed
 * out by hand, so every row's width is guaranteed correct by arithmetic
 * instead of manual character counting. The layout is left-right symmetric
 * and is an original design, not a reproduction of any existing game's maze.
 */

export interface LevelDefinition {
  name: string;
  rows: string[];
}

const wall = (n: number): string => '#'.repeat(n);
const floor = (n: number): string => 'o'.repeat(n);

const HOLLOW_GARDEN_ROWS: string[] = [
  wall(23),
  '#' + floor(21) + '#',
  '#' + 'B' + '*' + floor(17) + '*' + 'B' + '#',
  '#' + floor(2) + wall(3) + floor(4) + wall(3) + floor(4) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(4) + wall(3) + floor(4) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(21) + '#',
  '#' + floor(8) + wall(5) + floor(8) + '#',
  '#' + floor(2) + wall(3) + floor(3) + wall(5) + floor(3) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(8) + wall(2) + 'G' + wall(2) + floor(8) + '#',
  '#' + floor(8) + '#' + 'G'.repeat(3) + '#' + floor(8) + '#',
  'T' + floor(8) + '#' + 'G'.repeat(3) + '#' + floor(8) + 'T',
  '#' + floor(8) + wall(5) + floor(8) + '#',
  '#' + floor(21) + '#',
  '#' + floor(8) + wall(5) + floor(8) + '#',
  '#' + floor(8) + wall(5) + floor(8) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(2) + wall(3) + floor(11) + wall(3) + floor(2) + '#',
  '#' + floor(21) + '#',
  '#' + floor(5) + wall(3) + floor(5) + wall(3) + floor(5) + '#',
  '#' + floor(5) + wall(3) + floor(5) + wall(3) + floor(5) + '#',
  '#' + 'B' + '*' + floor(8) + 'P' + floor(8) + '*' + 'B' + '#',
  '#' + floor(21) + '#',
  wall(23),
];

export const LEVELS: LevelDefinition[] = [{ name: 'The Hollow Garden', rows: HOLLOW_GARDEN_ROWS }];
