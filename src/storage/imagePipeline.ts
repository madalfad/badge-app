import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { transformPerspectiveImageAsync } from "@/native/BadgePerspectiveImage";

import { copyFileToCardDirectory, deleteCardDirectory } from "./cardFileStore";
import {
  dimensionsAfterRotation,
  getBoundingCropRectFromCorners,
  normalizeRotation,
  type CropPreset,
  type PerspectiveCropData,
} from "./cropGeometry";

export type CardImageSide = "front" | "back";
export type { CropPreset, PerspectiveCropData } from "./cropGeometry";

export type SourceCardImage = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
  rotateDegrees?: number;
  cropPreset?: CropPreset;
  cropData?: PerspectiveCropData | null;
};

export type ProcessedCardAsset = {
  side: CardImageSide;
  fileUri: string;
  displayUri: string;
  thumbnailUri: string;
  mimeType: string;
  width: number;
  height: number;
  thumbnailWidth: number;
  thumbnailHeight: number;
  fileSize: number | null;
  cropDataJson: string | null;
};

type ProcessAndStoreCardImageOptions = {
  fileNamePrefix?: string;
};

type ResizeTarget = {
  width?: number | null;
  height?: number | null;
};

type CropRect = {
  originX: number;
  originY: number;
  width: number;
  height: number;
};

const DISPLAY_MAX_LONG_EDGE = 2200;
const THUMBNAIL_MAX_LONG_EDGE = 640;
const LANDSCAPE_CARD_ASPECT_RATIO = 1.58;
const PORTRAIT_CARD_ASPECT_RATIO = 1 / LANDSCAPE_CARD_ASPECT_RATIO;

function getResizeTarget(
  width: number,
  height: number,
  maxLongEdge: number,
): ResizeTarget {
  if (width <= 0 || height <= 0) {
    return { width: maxLongEdge, height: null };
  }

  const longEdge = Math.max(width, height);
  if (longEdge <= maxLongEdge) {
    return { width, height };
  }

  if (width >= height) {
    return { width: maxLongEdge, height: null };
  }

  return { width: null, height: maxLongEdge };
}

function getCropAspectRatio(preset: CropPreset | undefined) {
  if (preset === "landscape") {
    return LANDSCAPE_CARD_ASPECT_RATIO;
  }

  if (preset === "portrait") {
    return PORTRAIT_CARD_ASPECT_RATIO;
  }

  return null;
}

function getCenterCropRect(
  width: number,
  height: number,
  targetAspectRatio: number,
): CropRect | null {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const sourceAspectRatio = width / height;
  if (Math.abs(sourceAspectRatio - targetAspectRatio) < 0.02) {
    return null;
  }

  if (sourceAspectRatio > targetAspectRatio) {
    const cropWidth = Math.round(height * targetAspectRatio);
    return {
      originX: Math.max(0, Math.floor((width - cropWidth) / 2)),
      originY: 0,
      width: cropWidth,
      height,
    };
  }

  const cropHeight = Math.round(width / targetAspectRatio);
  return {
    originX: 0,
    originY: Math.max(0, Math.floor((height - cropHeight) / 2)),
    width,
    height: cropHeight,
  };
}

function getOriginalExtension(source: SourceCardImage) {
  const fileNameExtension = source.fileName?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (fileNameExtension) {
    return fileNameExtension.toLowerCase();
  }

  const uriExtension = source.uri
    .split("?")[0]
    ?.match(/\.([a-zA-Z0-9]+)$/)?.[1];
  if (uriExtension) {
    return uriExtension.toLowerCase();
  }

  if (source.mimeType?.includes("png")) {
    return "png";
  }

  if (source.mimeType?.includes("webp")) {
    return "webp";
  }

  if (source.mimeType?.includes("heic")) {
    return "heic";
  }

  return "jpg";
}

async function deleteCacheFile(uri: string) {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Cache cleanup is best effort only.
  }
}

async function renderVariant(
  source: SourceCardImage,
  cropRect: CropRect | null,
  maxLongEdge: number,
  compress: number,
) {
  const rotation = normalizeRotation(source.rotateDegrees);
  const rotatedDimensions = dimensionsAfterRotation(
    source.width,
    source.height,
    rotation,
  );
  const cropDimensions = cropRect
    ? { width: cropRect.width, height: cropRect.height }
    : rotatedDimensions;
  const resizeTarget = getResizeTarget(
    cropDimensions.width,
    cropDimensions.height,
    maxLongEdge,
  );
  const context = ImageManipulator.manipulate(source.uri);

  if (rotation) {
    context.rotate(rotation);
  }

  if (cropRect) {
    context.crop(cropRect);
  }

  context.resize(resizeTarget);

  const rendered = await context.renderAsync();
  return rendered.saveAsync({
    compress,
    format: SaveFormat.JPEG,
  });
}

async function renderPerspectiveVariant(
  source: SourceCardImage,
  cropData: PerspectiveCropData,
  maxLongEdge: number,
  compress: number,
) {
  try {
    return await transformPerspectiveImageAsync({
      sourceUri: source.uri,
      corners: cropData.corners,
      rotation: cropData.rotation,
      maxLongEdge,
      compress,
    });
  } catch {
    const rotatedDimensions = dimensionsAfterRotation(
      source.width,
      source.height,
      cropData.rotation,
    );
    const cropRect = getBoundingCropRectFromCorners(
      cropData.corners,
      rotatedDimensions.width,
      rotatedDimensions.height,
    );

    return renderVariant(
      { ...source, rotateDegrees: cropData.rotation },
      cropRect,
      maxLongEdge,
      compress,
    );
  }
}

// fallow-ignore-next-line complexity
export async function processAndStoreCardImage(
  cardId: string,
  side: CardImageSide,
  source: SourceCardImage,
  options: ProcessAndStoreCardImageOptions = {},
): Promise<ProcessedCardAsset> {
  const perspectiveCrop = source.cropData?.mode === "perspective"
    ? source.cropData
    : null;
  const rotation = normalizeRotation(
    perspectiveCrop?.rotation ?? source.rotateDegrees,
  );
  const rotatedDimensions = dimensionsAfterRotation(
    source.width,
    source.height,
    rotation,
  );
  const cropAspectRatio = perspectiveCrop
    ? null
    : getCropAspectRatio(source.cropPreset);
  const cropRect =
    !perspectiveCrop && cropAspectRatio
      ? getCenterCropRect(
          rotatedDimensions.width,
          rotatedDimensions.height,
          cropAspectRatio,
        )
      : null;
  const cropDataJson = perspectiveCrop
    ? JSON.stringify({ ...perspectiveCrop, rotation })
    : cropRect || rotation || (source.cropPreset && source.cropPreset !== "auto")
      ? JSON.stringify({
          rotation,
          preset: source.cropPreset ?? "auto",
          cropRect,
        })
      : null;

  const originalExtension = getOriginalExtension(source);
  const fileNamePrefix = options.fileNamePrefix ?? side;
  const originalUri = await copyFileToCardDirectory(
    source.uri,
    cardId,
    `${fileNamePrefix}-original.${originalExtension}`,
  );

  const display = perspectiveCrop
    ? await renderPerspectiveVariant(
        source,
        { ...perspectiveCrop, rotation },
        DISPLAY_MAX_LONG_EDGE,
        0.9,
      )
    : await renderVariant(source, cropRect, DISPLAY_MAX_LONG_EDGE, 0.9);
  const thumbnail = perspectiveCrop
    ? await renderPerspectiveVariant(
        source,
        { ...perspectiveCrop, rotation },
        THUMBNAIL_MAX_LONG_EDGE,
        0.78,
      )
    : await renderVariant(source, cropRect, THUMBNAIL_MAX_LONG_EDGE, 0.78);

  const displayUri = await copyFileToCardDirectory(
    display.uri,
    cardId,
    `${fileNamePrefix}-display.jpg`,
  );
  const thumbnailUri = await copyFileToCardDirectory(
    thumbnail.uri,
    cardId,
    `${fileNamePrefix}-thumb.jpg`,
  );

  await deleteCacheFile(display.uri);
  await deleteCacheFile(thumbnail.uri);

  const originalFile = new File(originalUri);

  return {
    side,
    fileUri: originalUri,
    displayUri,
    thumbnailUri,
    mimeType: (source.mimeType ?? originalFile.type) || "image/jpeg",
    width: display.width,
    height: display.height,
    thumbnailWidth: thumbnail.width,
    thumbnailHeight: thumbnail.height,
    fileSize: originalFile.exists ? originalFile.size : null,
    cropDataJson,
  };
}

export function cleanupFailedImport(cardId: string) {
  deleteCardDirectory(cardId);
}
