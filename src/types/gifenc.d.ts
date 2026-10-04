declare module "gifenc" {
  export function quantize(
    data: Uint8ClampedArray | number[] | Uint8Array,
    maxColors: number,
    options?: unknown
  ): number[][];
  export function applyPalette(
    data: Uint8ClampedArray | number[] | Uint8Array,
    palette: number[][],
    format?: "rgb444" | "rgba4444" | "rgb565"
  ): number[];
  export function GIFEncoder(opts?: { auto?: boolean }): {
    writeFrame(
      index: number[] | Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: number[][];
        delay?: number;
        transparent?: boolean;
        repeat?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    reset(): void;
  };
}
