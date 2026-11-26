/** Next.js page `searchParams`: untrusted input, always validated before use. */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
