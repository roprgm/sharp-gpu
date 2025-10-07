import type { FolderApi } from "tweakpane";

export type ToneCurvePoint = {
  x: number;
  y: number;
  fixedX?: boolean;
};

export type ToneCurveState = {
  enabled: boolean;
  points: ToneCurvePoint[];
  lut: number[];
};

export type ToneCurveControl = {
  refresh(options?: { emit?: boolean }): void;
  setEnabled(enabled: boolean): void;
};

const CURVE_SAMPLES = 256;
const CANVAS_WIDTH = 260;
const CANVAS_HEIGHT = 220;
const CANVAS_PADDING = 14;
const HANDLE_RADIUS = 18;
const MIN_POINT_GAP = 0.05;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const clonePoints = (points: ToneCurvePoint[]) => points.map((p) => ({ ...p }));

function createToneCurvePoints(): ToneCurvePoint[] {
  const anchors = [0, 0.2, 0.4, 0.6, 0.8, 1];
  return anchors.map((x, index, list) => ({
    x,
    y: x,
    fixedX: index === 0 || index === list.length - 1,
  }));
}

function createMonotoneInterpolator(points: ToneCurvePoint[]) {
  const sorted = clonePoints(points).sort((a, b) => a.x - b.x);
  const n = sorted.length;
  const slopes: number[] = [];
  const tangents = new Array<number>(n).fill(0);

  for (let i = 0; i < n - 1; i++) {
    const dx = sorted[i + 1].x - sorted[i].x;
    const dy = sorted[i + 1].y - sorted[i].y;
    slopes[i] = dx !== 0 ? dy / dx : 0;
  }

  tangents[0] = slopes[0];
  tangents[n - 1] = slopes[n - 2];

  for (let i = 1; i < n - 1; i++) {
    if (slopes[i - 1] * slopes[i] <= 0) {
      tangents[i] = 0;
    } else {
      tangents[i] = (slopes[i - 1] + slopes[i]) / 2;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    if (slopes[i] === 0) {
      tangents[i] = 0;
      tangents[i + 1] = 0;
      continue;
    }

    const a = tangents[i] / slopes[i];
    const b = tangents[i + 1] / slopes[i];
    const sum = a * a + b * b;

    if (sum > 9) {
      const t = 3 / Math.sqrt(sum);
      tangents[i] = t * a * slopes[i];
      tangents[i + 1] = t * b * slopes[i];
    }
  }

  return (x: number) => {
    if (x <= sorted[0].x) {
      return sorted[0].y;
    }
    if (x >= sorted[n - 1].x) {
      return sorted[n - 1].y;
    }

    let index = 0;
    while (index < n - 2 && x > sorted[index + 1].x) {
      index++;
    }

    const x0 = sorted[index].x;
    const x1 = sorted[index + 1].x;
    const t = clamp((x - x0) / (x1 - x0), 0, 1);

    const h00 = 2 * t * t * t - 3 * t * t + 1;
    const h10 = t * t * t - 2 * t * t + t;
    const h01 = -2 * t * t * t + 3 * t * t;
    const h11 = t * t * t - t * t;

    const y0 = sorted[index].y;
    const y1 = sorted[index + 1].y;
    const m0 = tangents[index];
    const m1 = tangents[index + 1];
    const h = x1 - x0;

    return clamp(h00 * y0 + h10 * h * m0 + h01 * y1 + h11 * h * m1, 0, 1);
  };
}

export function generateToneCurveLut(
  points: ToneCurvePoint[],
  samples = CURVE_SAMPLES,
) {
  const evaluate = createMonotoneInterpolator(points);
  const lut = new Array<number>(samples);
  for (let i = 0; i < samples; i++) {
    const t = i / (samples - 1);
    lut[i] = clamp(evaluate(t), 0, 1);
  }
  return lut;
}

export function createToneCurveState(): ToneCurveState {
  const points = createToneCurvePoints();
  return {
    enabled: false,
    points,
    lut: generateToneCurveLut(points),
  };
}

export function applyToneCurveState(
  target: ToneCurveState,
  source: ToneCurveState,
) {
  target.enabled = source.enabled;
  target.lut = [...source.lut];
  target.points.splice(0, target.points.length, ...clonePoints(source.points));
}

export function createToneCurveControl(
  folder: FolderApi,
  state: ToneCurveState,
  onChange: () => void,
): ToneCurveControl {
  const controller = (
    folder as unknown as {
      controller?: { view?: { containerElement?: HTMLElement } };
    }
  ).controller;

  const mount =
    controller?.view?.containerElement ??
    (folder as unknown as { element?: HTMLElement }).element ??
    document.createElement("div");

  const container = document.createElement("div");
  container.className = "tp-tone-curve";

  const canvas = document.createElement("canvas");
  canvas.className = "tp-tone-curve__canvas";
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(CANVAS_WIDTH * dpr);
  canvas.height = Math.floor(CANVAS_HEIGHT * dpr);
  canvas.style.width = `${CANVAS_WIDTH}px`;
  canvas.style.height = `${CANVAS_HEIGHT}px`;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Failed to acquire 2D context for tone curve");
  }
  ctx.scale(dpr, dpr);

  container.appendChild(canvas);
  mount.appendChild(container);

  let activeIndex: number | null = null;

  const axisWidth = CANVAS_WIDTH - CANVAS_PADDING * 2;
  const axisHeight = CANVAS_HEIGHT - CANVAS_PADDING * 2;

  const toCanvasPoint = (point: ToneCurvePoint) => ({
    x: CANVAS_PADDING + point.x * axisWidth,
    y: CANVAS_PADDING + (1 - point.y) * axisHeight,
  });

  const toCurvePoint = (px: number, py: number) => ({
    x: clamp((px - CANVAS_PADDING) / axisWidth, 0, 1),
    y: clamp(1 - (py - CANVAS_PADDING) / axisHeight, 0, 1),
  });

  const drawBackground = () => {
    ctx.save();
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = "#161616";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 1;

    for (let i = 1; i < 4; i++) {
      const x = CANVAS_PADDING + (axisWidth * i) / 4;
      const y = CANVAS_PADDING + (axisHeight * i) / 4;

      ctx.beginPath();
      ctx.moveTo(x, CANVAS_PADDING);
      ctx.lineTo(x, CANVAS_HEIGHT - CANVAS_PADDING);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(CANVAS_PADDING, y);
      ctx.lineTo(CANVAS_WIDTH - CANVAS_PADDING, y);
      ctx.stroke();
    }

    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    ctx.moveTo(CANVAS_PADDING, CANVAS_HEIGHT - CANVAS_PADDING);
    ctx.lineTo(CANVAS_WIDTH - CANVAS_PADDING, CANVAS_PADDING);
    ctx.stroke();
    ctx.restore();
  };

  const drawCurve = () => {
    drawBackground();

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#4dabf7";
    ctx.beginPath();

    state.lut.forEach((value, index) => {
      const t = index / (state.lut.length - 1);
      const { x, y } = toCanvasPoint({ x: t, y: value });
      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    ctx.restore();

    ctx.save();
    state.points.forEach((point, index) => {
      const { x, y } = toCanvasPoint(point);
      ctx.beginPath();
      ctx.arc(x, y, index === activeIndex ? 6 : 5, 0, Math.PI * 2);
      ctx.fillStyle = "#f8f9fa";
      ctx.fill();
      ctx.strokeStyle =
        index === activeIndex ? "#4dabf7" : "rgba(0, 0, 0, 0.6)";
      ctx.stroke();
    });
    ctx.restore();
  };

  const recompute = (emit: boolean) => {
    state.lut = generateToneCurveLut(state.points);
    drawCurve();
    if (emit) {
      onChange();
    }
  };

  const updatePoint = (
    index: number,
    px: number,
    py: number,
    emit: boolean,
  ) => {
    const curvePoint = toCurvePoint(px, py);
    const point = state.points[index];

    if (!point.fixedX) {
      const prevLimit =
        index > 0 ? state.points[index - 1].x + MIN_POINT_GAP : curvePoint.x;
      const nextLimit =
        index < state.points.length - 1
          ? state.points[index + 1].x - MIN_POINT_GAP
          : curvePoint.x;

      point.x = clamp(curvePoint.x, prevLimit, nextLimit);
    }

    point.y = curvePoint.y;

    if (point.fixedX) {
      point.x = index === 0 ? 0 : 1;
    }

    recompute(emit);
  };

  const getPointerPosition = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (container.classList.contains("tp-tone-curve--disabled")) {
      return;
    }

    const { x, y } = getPointerPosition(event);

    let nearest = -1;
    let nearestDistance = Number.POSITIVE_INFINITY;

    state.points.forEach((point, index) => {
      const canvasPoint = toCanvasPoint(point);
      const distance = Math.hypot(canvasPoint.x - x, canvasPoint.y - y);
      if (distance < nearestDistance && distance <= HANDLE_RADIUS) {
        nearest = index;
        nearestDistance = distance;
      }
    });

    if (nearest < 0) {
      return;
    }

    activeIndex = nearest;
    canvas.setPointerCapture(event.pointerId);
    updatePoint(nearest, x, y, true);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (activeIndex === null) {
      return;
    }
    const { x, y } = getPointerPosition(event);
    updatePoint(activeIndex, x, y, true);
  });

  const releasePointer = (event: PointerEvent) => {
    if (activeIndex === null) {
      return;
    }
    const { x, y } = getPointerPosition(event);
    updatePoint(activeIndex, x, y, true);
    canvas.releasePointerCapture(event.pointerId);
    activeIndex = null;
    drawCurve();
  };

  canvas.addEventListener("pointerup", releasePointer);
  canvas.addEventListener("pointercancel", releasePointer);

  recompute(false);

  return {
    refresh(options = {}) {
      recompute(Boolean(options.emit));
    },
    setEnabled(enabled: boolean) {
      container.classList.toggle("tp-tone-curve--disabled", !enabled);
      canvas.style.pointerEvents = enabled ? "auto" : "none";
    },
  };
}
