import { FilesetResolver, PoseLandmarker } from "@mediapipe/tasks-vision";

let landmarkerPromise = null;

async function create(delegate) {
  const vision = await FilesetResolver.forVisionTasks("/wasm");
  return PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: "/models/pose_landmarker_lite.task",
      delegate,
    },
    runningMode: "VIDEO",
    numPoses: 1,
  });
}

export function loadPose() {
  if (!landmarkerPromise) {
    landmarkerPromise = create("GPU")
      .catch(() => create("CPU"))
      .catch((err) => {
        landmarkerPromise = null;
        throw err;
      });
  }
  return landmarkerPromise;
}