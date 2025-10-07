import { SharpGPU } from "sharp-gpu";
import { Pane } from "tweakpane";
import {
  applyToneCurveState,
  createToneCurveControl,
  createToneCurveState,
  ToneCurveControl,
  ToneCurveState,
} from "./utils/tone-curve";

type LinearColor = {
  r: number;
  g: number;
  b: number;
  a: number;
};

type AppParams = {
  blur: number;
  brightness: number;
  saturation: number;
  hue: number;
  lightness: number;
  multiply: LinearColor;
  add: LinearColor;
  gamma: number;
  negate: boolean;
  toneCurve: ToneCurveState;
};

const mapAddChannel = (value: number) => (value - 0.5) * 2;

function createDefaultParams(): AppParams {
  return {
    blur: 0,
    brightness: 1,
    saturation: 1,
    hue: 0,
    lightness: 0,
    multiply: { r: 1, g: 1, b: 1, a: 1 },
    add: { r: 0.5, g: 0.5, b: 0.5, a: 0.5 },
    gamma: 1,
    negate: false,
    toneCurve: createToneCurveState(),
  };
}

function applyParams(target: AppParams, source: AppParams) {
  target.blur = source.blur;
  target.brightness = source.brightness;
  target.saturation = source.saturation;
  target.hue = source.hue;
  target.lightness = source.lightness;
  target.gamma = source.gamma;
  target.negate = source.negate;

  Object.assign(target.multiply, source.multiply);
  Object.assign(target.add, source.add);

  applyToneCurveState(target.toneCurve, source.toneCurve);
}

async function main() {
  const canvas = document.getElementById("main") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas element with id 'main' not found");
  }

  let image = await SharpGPU.from("/example.png");
  image.resize({ width: 500 });

  const params = createDefaultParams();

  const render = () => {
    const multiplyVec: [number, number, number, number] = [
      params.multiply.r,
      params.multiply.g,
      params.multiply.b,
      params.multiply.a,
    ];

    const addVec: [number, number, number, number] = [
      mapAddChannel(params.add.r),
      mapAddChannel(params.add.g),
      mapAddChannel(params.add.b),
      mapAddChannel(params.add.a),
    ];

    let pipeline = image
      .clone()
      .modulate({
        brightness: params.brightness,
        saturation: params.saturation,
        hue: params.hue,
        lightness: params.lightness,
      })
      .linear(multiplyVec, addVec)
      .gamma(params.gamma);

    if (params.toneCurve.enabled) {
      pipeline = pipeline.lut(params.toneCurve.lut);
    }

    if (params.blur > 0) {
      pipeline = pipeline.blur(params.blur);
    }

    if (params.negate) {
      pipeline = pipeline.negate();
    }

    pipeline.toCanvas(canvas);
  };

  const pane = new Pane({ title: "SharpGPU Controls" });

  const effectsFolder = pane.addFolder({ title: "Effects" });
  effectsFolder
    .addBinding(params, "blur", { min: 0, max: 32, step: 0.1, label: "Blur" })
    .on("change", render);

  const colorFolder = pane.addFolder({ title: "Color" });

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

  colorFolder
    .addBinding(params, "multiply", {
      label: "Linear Multiply",
      color: { type: "float", alpha: true },
      picker: "inline",
    })
    .on("change", render);

  colorFolder
    .addBinding(params, "add", {
      label: "Linear Add",
      color: { type: "float", alpha: true },
      picker: "inline",
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

  const toneCurveFolder = pane.addFolder({
    title: "Tone Curve",
    expanded: false,
  });

  const toneCurveToggle = toneCurveFolder.addBinding(
    params.toneCurve,
    "enabled",
    {
      label: "Enable",
    },
  );

  const toneCurveControl: ToneCurveControl = createToneCurveControl(
    toneCurveFolder,
    params.toneCurve,
    render,
  );
  toneCurveControl.setEnabled(params.toneCurve.enabled);
  toneCurveControl.refresh({ emit: false });

  toneCurveToggle.on("change", (ev) => {
    toneCurveControl.setEnabled(ev.value as boolean);
    render();
  });

  colorFolder
    .addBinding(params, "negate", {
      label: "Negate",
    })
    .on("change", render);

  pane.addButton({ title: "Reset All" }).on("click", () => {
    const defaults = createDefaultParams();
    applyParams(params, defaults);
    toneCurveControl.setEnabled(params.toneCurve.enabled);
    toneCurveControl.refresh({ emit: true });
    pane.refresh();
  });

  render();
}

main();
