# sharp-gpu

A GPU-accelerated image processing library for the web, powered by WebGL and REGL. Perform real-time image transformations with blur, color adjustments, LUTs, and more.

## Features

- 🚀 GPU-accelerated image processing using WebGL
- 🎨 Color adjustments (brightness, saturation, hue, lightness, tint)
- 🌫️ Gaussian blur with variable radius
- 🎭 LUT (Look-Up Table) support for custom color grading
- ⛓️ Chainable API for complex image pipelines
- 📦 Built with TypeScript for full type safety

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
