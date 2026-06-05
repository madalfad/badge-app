export type CropPreset = "auto" | "landscape" | "portrait" | "free";

export type CropPoint = {
  x: number;
  y: number;
};

export type CropCorners = {
  tl: CropPoint;
  tr: CropPoint;
  br: CropPoint;
  bl: CropPoint;
};

export type PerspectiveCropData = {
  version: 2;
  mode: "perspective";
  rotation: number;
  preset: CropPreset;
  sourceWidth: number;
  sourceHeight: number;
  corners: CropCorners;
};

export type LegacyCropData = {
  rotation?: number;
  preset?: CropPreset;
  cropRect?: {
    originX: number;
    originY: number;
    width: number;
    height: number;
  } | null;
};

const LANDSCAPE_CARD_ASPECT_RATIO = 1.58;
const PORTRAIT_CARD_ASPECT_RATIO = 1 / LANDSCAPE_CARD_ASPECT_RATIO;

export function normalizeRotation(degrees: number | undefined) {
  if (!degrees) {
    return 0;
  }

  const normalized = degrees % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

export function dimensionsAfterRotation(
  width: number,
  height: number,
  degrees: number,
) {
  const normalized = normalizeRotation(degrees);
  if (normalized === 90 || normalized === 270) {
    return { width: height, height: width };
  }
  return { width, height };
}

function clampUnit(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

export function clampCropCorners(corners: CropCorners): CropCorners {
  return {
    tl: { x: clampUnit(corners.tl.x), y: clampUnit(corners.tl.y) },
    tr: { x: clampUnit(corners.tr.x), y: clampUnit(corners.tr.y) },
    br: { x: clampUnit(corners.br.x), y: clampUnit(corners.br.y) },
    bl: { x: clampUnit(corners.bl.x), y: clampUnit(corners.bl.y) },
  };
}

function getPresetAspectRatio(preset: CropPreset) {
  if (preset === "landscape") {
    return LANDSCAPE_CARD_ASPECT_RATIO;
  }

  if (preset === "portrait") {
    return PORTRAIT_CARD_ASPECT_RATIO;
  }

  return null;
}

function getCenteredAspectCorners(
  width: number,
  height: number,
  targetAspectRatio: number,
): CropCorners {
  if (width <= 0 || height <= 0) {
    return getFullFrameCorners();
  }

  const sourceAspectRatio = width / height;
  if (sourceAspectRatio > targetAspectRatio) {
    const cropWidth = height * targetAspectRatio;
    const insetX = (width - cropWidth) / 2 / width;
    return {
      tl: { x: insetX, y: 0 },
      tr: { x: 1 - insetX, y: 0 },
      br: { x: 1 - insetX, y: 1 },
      bl: { x: insetX, y: 1 },
    };
  }

  const cropHeight = width / targetAspectRatio;
  const insetY = (height - cropHeight) / 2 / height;
  return {
    tl: { x: 0, y: insetY },
    tr: { x: 1, y: insetY },
    br: { x: 1, y: 1 - insetY },
    bl: { x: 0, y: 1 - insetY },
  };
}

export function getFullFrameCorners(): CropCorners {
  return {
    tl: { x: 0, y: 0 },
    tr: { x: 1, y: 0 },
    br: { x: 1, y: 1 },
    bl: { x: 0, y: 1 },
  };
}

export function createPerspectiveCropData(input: {
  width: number;
  height: number;
  rotation?: number;
  preset?: CropPreset;
  corners?: CropCorners;
}): PerspectiveCropData {
  const rotation = normalizeRotation(input.rotation);
  const rotatedDimensions = dimensionsAfterRotation(
    input.width,
    input.height,
    rotation,
  );
  const preset = input.preset ?? "free";
  const presetAspectRatio = getPresetAspectRatio(preset);
  const corners =
    input.corners ??
    (presetAspectRatio
      ? getCenteredAspectCorners(
          rotatedDimensions.width,
          rotatedDimensions.height,
          presetAspectRatio,
        )
      : getFullFrameCorners());

  return {
    version: 2,
    mode: "perspective",
    rotation,
    preset,
    sourceWidth: input.width,
    sourceHeight: input.height,
    corners: clampCropCorners(corners),
  };
}

export function parsePerspectiveCropData(
  cropDataJson: string | null | undefined,
): PerspectiveCropData | null {
  if (!cropDataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(cropDataJson) as Partial<PerspectiveCropData>;
    if (
      parsed?.version === 2 &&
      parsed.mode === "perspective" &&
      parsed.corners
    ) {
      return createPerspectiveCropData({
        width: parsed.sourceWidth ?? 0,
        height: parsed.sourceHeight ?? 0,
        rotation: parsed.rotation,
        preset: parsed.preset ?? "free",
        corners: parsed.corners,
      });
    }
  } catch {
    return null;
  }

  return null;
}

export function parseLegacyCropData(
  cropDataJson: string | null | undefined,
): LegacyCropData | null {
  if (!cropDataJson) {
    return null;
  }

  try {
    const parsed = JSON.parse(cropDataJson) as LegacyCropData;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

export function getBoundingCropRectFromCorners(
  corners: CropCorners,
  width: number,
  height: number,
) {
  const clamped = clampCropCorners(corners);
  const xs = [clamped.tl.x, clamped.tr.x, clamped.br.x, clamped.bl.x];
  const ys = [clamped.tl.y, clamped.tr.y, clamped.br.y, clamped.bl.y];
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    originX: Math.max(0, Math.floor(minX * width)),
    originY: Math.max(0, Math.floor(minY * height)),
    width: Math.max(1, Math.ceil((maxX - minX) * width)),
    height: Math.max(1, Math.ceil((maxY - minY) * height)),
  };
}
