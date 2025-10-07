import { SharpGPU } from "sharp-gpu";
import { Pane } from "tweakpane";

const canvas = document.getElementById("main") as HTMLCanvasElement;

const defaultParams = {
  // Effects
  blur: 0,

  // Color adjustments
  brightness: 1,
  saturation: 1,
  hue: 0,
  lightness: 0,

  // Linear adjustment
  multiply: { r: 1, g: 1, b: 1, a: 1 },
  add: { r: 0, g: 0, b: 0, a: 0 },

  // Gamma
  gamma: 1.0,

  // Negate
  negate: false,
};

async function main() {
  let image = await SharpGPU.from("/example.png");
  image.resize({ width: 500 });

  // Create controls
  const params = { ...defaultParams };

  const render = () => {
    let pipeline = image
      .clone()
      .modulate({
        brightness: params.brightness,
        saturation: params.saturation,
        hue: params.hue,
        lightness: params.lightness,
      })
      .gamma(params.gamma)
      .multiply([
        params.multiply.r,
        params.multiply.g,
        params.multiply.b,
        params.multiply.a,
      ])
      .add([params.add.r, params.add.g, params.add.b, params.add.a]);

    if (params.blur) {
      pipeline = pipeline.blur(params.blur);
    }

    if (params.negate) {
      pipeline = pipeline.negate();
    }

    pipeline.toCanvas(canvas);
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
      label: "Hue",
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

  // Linear & Gamma controls
  colorFolder
    .addBinding(params, "multiply", {
      label: "Multiply",
      color: { type: "float", alpha: true },
      picker: "inline",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "add", {
      label: "Add",
      picker: "inline",
      color: { type: "float", alpha: true },
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "gamma", {
      label: "Gamma",
      min: 0.1,
      max: 2,
      step: 0.01,
    })
    .on("change", render);

  // Negate folder
  colorFolder
    .addBinding(params, "negate", {
      label: "Negate",
    })
    .on("change", render);

  // Reset button
  pane
    .addButton({
      title: "Reset All",
    })
    .on("click", () => {
      Object.assign(params, defaultParams);
      pane.refresh();
      render();
    });

  render();
}

main();
