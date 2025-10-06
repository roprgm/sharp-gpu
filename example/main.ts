import { SharpGPU } from "sharp-gpu";
import { Pane } from "tweakpane";

const canvas = document.getElementById("main") as HTMLCanvasElement;

async function main() {
  let image = await SharpGPU.from("/example.png");

  // Create controls
  const params = {
    // Effects
    blur: 0,

    // Color adjustments
    brightness: 1,
    saturation: 1,
    hue: 0,
    lightness: 0,

    // Tint
    tint: { r: 255, g: 255, b: 255 },

    // LUT
    lutFactor: 0.5,
  };

  const render = () => {
    image
      .clone()
      .blur(params.blur)
      .modulate({
        brightness: params.brightness,
        saturation: params.saturation,
        hue: params.hue,
        lightness: params.lightness,
        tint: [params.tint.r / 255, params.tint.g / 255, params.tint.b / 255],
      })
      .lut((x: number) => Math.pow(x, params.lutFactor))
      .toCanvas(canvas);
  };

  const pane = new Pane({
    title: "SharpGPU Controls",
  });

  // Effects folder
  const effectsFolder = pane.addFolder({
    title: "Effects",
  });

  effectsFolder
    .addBinding(params, "blur", {
      min: 0,
      max: 32,
      step: 0.1,
      label: "Blur",
    })
    .on("change", render);

  // Color folder
  const colorFolder = pane.addFolder({
    title: "Color",
  });

  colorFolder
    .addBinding(params, "brightness", {
      min: 0,
      max: 1,
      step: 0.01,
      label: "Brightness",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "saturation", {
      min: 0,
      max: 2,
      step: 0.01,
      label: "Saturation",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "hue", {
      min: 0,
      max: 360,
      step: 1,
      label: "Hue Rotate",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "lightness", {
      min: -1,
      max: 1,
      step: 0.01,
      label: "Lightness",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "tint", {
      label: "Tint",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "lutFactor", {
      min: 0,
      max: 2,
      step: 0.01,
      label: "LUT Factor",
    })
    .on("change", render);

  // Reset button
  pane
    .addButton({
      title: "Reset All",
    })
    .on("click", () => {
      params.blur = 0;
      params.brightness = 1;
      params.saturation = 1;
      params.hue = 0;
      params.lightness = 0;
      params.tint = { r: 255, g: 255, b: 255 };
      params.lutFactor = 0.5;
      pane.refresh();
      render();
    });

  render();
}

main();
