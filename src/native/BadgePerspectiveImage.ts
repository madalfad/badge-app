import { requireNativeModule } from "expo";

import type { CropCorners } from "@/storage/cropGeometry";

type PerspectiveTransformInput = {
  sourceUri: string;
  corners: CropCorners;
  rotation?: number;
  maxLongEdge: number;
  compress: number;
};

type PerspectiveTransformResult = {
  uri: string;
  width: number;
  height: number;
};

type BadgePerspectiveImageModule = {
  transformAsync: (
    input: PerspectiveTransformInput,
  ) => Promise<PerspectiveTransformResult>;
};

let nativeModule: BadgePerspectiveImageModule | null | undefined;

function getNativeModule() {
  if (nativeModule !== undefined) {
    return nativeModule;
  }

  try {
    nativeModule = requireNativeModule<BadgePerspectiveImageModule>(
      "BadgePerspectiveImage",
    );
  } catch {
    nativeModule = null;
  }

  return nativeModule;
}

export async function transformPerspectiveImageAsync(
  input: PerspectiveTransformInput,
) {
  const module = getNativeModule();
  if (!module) {
    throw new Error("BadgePerspectiveImage native module is unavailable.");
  }

  return module.transformAsync(input);
}
