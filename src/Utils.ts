/**
 * Generates a numeric array consisting of the numbers spanning the range [0, total) in sequential order.
 * @param total The total number of elements to return.
 * @returns The corresponding array.
 */
export function generateNumericArray(total: number): number[] {
  return Array.from(Array(total).keys());
}
