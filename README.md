# sharp-gpu

A GPU-accelerated image processing library for the web, powered by WebGL and REGL. Perform real-time image transformations with blur, color adjustments, LUTs, and more.

> ⚠️ **Beta software**: SharpGPU is actively under development and not yet ready for production workloads.

## Features

- 🚀 GPU-accelerated image processing using WebGL
- 🎨 Color adjustments (brightness, saturation, hue, lightness, tint)
- 🌫️ Gaussian blur with variable radius
- 🎭 LUT (Look-Up Table) support for custom color grading
- ⛓️ Chainable API for complex image pipelines
- 📦 Built with TypeScript for full type safety

## Roadmap

### Core Pipeline & I/O

- [ ] Multi-source inputs (`Buffer`, `ReadableStream`, filesystem paths)
- [x] Load from image URL/path via `SharpGPU.from`
- [ ] Metadata inspection (`metadata()`)
- [ ] File/`Buffer` outputs (`toFile`, `toBuffer`)
- [x] Canvas output (`toCanvas`)
- [x] Browser blob export (`toBlob`)

### Geometry & Resizing

- [x] Basic resize by width/height with aspect preservation
- [ ] Resize fit/cover/fill strategies (e.g. `fit: cover`, `background`)
- [ ] Crop/extract, extend/pad, trim
- [ ] Rotate, flip, flop
- [ ] Affine/projective transforms

### Color & Tone

- [x] Modulate brightness, saturation, hue, lightness
- [x] Tint
- [x] Grayscale
- [x] LUT-based grading (`lut()`)
- [ ] Linear, gamma, normalize, negate
- [ ] Thresholding
- [ ] Channel operations (remove/ensure alpha, join/extract channel)

### Effects & Convolution

- [x] Gaussian blur (single-pass separable)
- [ ] Median blur
- [ ] Sharpen
- [ ] Custom convolution kernels
- [ ] Composite/overlay operations

### Pipeline Composition

- [x] Chainable operation builder
- [ ] Stream-based piping (`pipeline()`, `clone()` semantics for concurrency)
- [ ] Queued/concurrent job control (`queue()`, `limitInputPixels`)

## Installation

```bash
bun add sharp-gpu
```

## Usage

```typescript
import { SharpGPU } from "sharp-gpu";

// Load an image and apply transformations
const canvas = document.getElementById("output") as HTMLCanvasElement;

const image = await SharpGPU.from("/path/to/image.png");

await image
  .blur(10)
  .modulate({
    brightness: 1.2,
    saturation: 1.5,
    hue: 30,
  })
  .toCanvas(canvas);

// Or export as a blob
const blob = await image.blur(5).grayscale().toBlob("image/png");
```

### Available Operations

```typescript
// Blur with radius
.blur(radius: number)

// Color modulation
.modulate({
  brightness?: number,  // 0-2 (default: 1)
  saturation?: number,  // 0-2 (default: 1)
  hue?: number,         // 0-360 degrees (default: 0)
  lightness?: number,   // -1 to 1 (default: 0)
  tint?: [r, g, b]     // 0-1 normalized RGB (default: [1, 1, 1])
})

// Grayscale (shorthand for saturation: 0)
.grayscale()

// Tint
.tint([r, g, b])

// Look-Up Table (custom color grading)
.lut((x: number) => number) // Function mapping
.lut([...values])           // Array of values

// Resize
.resize({ width: number, height: number })
```

## Development

```bash
# Install dependencies
bun install

# Build the library
bun run build

# Watch mode for development
bun run dev

# Type checking
bun run typecheck

# Run example
cd example && bun install && bun run dev
```

## Example

Check out the [`example/`](./example) folder for a working interactive demo with Tweakpane controls.

## License

MIT
