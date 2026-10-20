import { describe, expect, it } from 'vitest';
import { landPathData } from './landPath.js';

const polygon = (...rings: [number, number][][]) => ({ geometry: { type: 'Polygon', coordinates: rings } });

describe('landPathData', () => {
  it('writes relative moves in tenths of a degree, dropping repeats', () => {
    const geo = { features: [polygon([[0, 0], [1.24, 0], [1.24, 0], [1.2, -0.5], [0, 0]])] };
    // x = lon + 180, y = 90 - lat
    expect(landPathData(geo)).toBe('M180 90l1.2 0 0 .5-1.2-.5z');
  });

  it('joins every ring of polygons and multipolygons', () => {
    const square: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 0]];
    const geo = {
      features: [
        polygon(square, square),
        { geometry: { type: 'MultiPolygon', coordinates: [[square], [square]] } },
      ],
    };
    expect(landPathData(geo).match(/M/g)).toHaveLength(4);
  });
});
