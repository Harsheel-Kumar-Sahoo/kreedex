import { useEffect, useRef, useState } from "react";
import { DrawingUtils, PoseLandmarker } from "@mediapipe/tasks-vision";
import { loadPose } from "../pose";
import { useT } from "../lang";

// Landmark indexes: 0 = nose, 27 = left ankle, 28 = right ankle
const KEY_POINTS = [0, 27, 28];

export default function PoseCamera({ facing, onFrame, overlay }) {
  const { t } = useT();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;

  const [status, setStatus] = useState("cam.s.start"); // a string key
  const [error, setError] = useState(null); // { key, detail }
  const [fullBody, setFullBody] = useState(false);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let stream = null;
    let raf = 0;
    const video = videoRef.current;

    async function start() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("https");
        }

        setStatus("cam.s.model");
        const landmarker = await loadPose();
        if (cancelled) return;

        setStatus("cam.s.camera");
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((tr) => tr.stop());
          return;
        }

        video.srcObject = stream;
        await video.play();

        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        const drawer = new DrawingUtils(ctx);

        setStatus("cam.s.ready");

        let lastTime = -1;
        let lastFull = false;
        let frames = 0;
        let t0 = performance.now();

        const loop = () => {
          if (cancelled) return;

          if (video.currentTime !== lastTime) {
            lastTime = video.currentTime;
            const now = performance.now();
            const res = landmarker.detectForVideo(video, now);
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const pose = res.landmarks[0];
            let full = false;
            if (pose) {
              drawer.drawConnectors(pose, PoseLandmarker.POSE_CONNECTIONS, {
                color: "#ffffff",
                lineWidth: 3,
              });
              drawer.drawLandmarks(pose, { color: "#ea580c", radius: 3 });
              full = KEY_POINTS.every((i) => (pose[i].visibility ?? 0) > 0.5);
            }
            if (full !== lastFull) {
              lastFull = full;
              setFullBody(full);
            }

            if (onFrameRef.current) {
              onFrameRef.current(pose, now, canvas.width / canvas.height);
            }

            frames++;
            if (now - t0 >= 1000) {
              setFps(Math.round((frames * 1000) / (now - t0)));
              frames = 0;
              t0 = now;
            }
          }
          raf = requestAnimationFrame(loop);
        };
        loop();
      } catch (e) {
        if (cancelled) return;
        if (e.name === "NotAllowedError") {
          setError({ key: "cam.e.denied" });
        } else if (e.name === "NotFoundError") {
          setError({ key: "cam.e.none" });
        } else if (e.message === "https") {
          setError({ key: "cam.e.https" });
        } else {
          setError({ key: "cam.e.other", detail: e.message });
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((tr) => tr.stop());
      if (video) video.srcObject = null;
    };
  }, [facing]);

  const mirrored = facing === "user";

  return (
    <div className="cam">
      <div className="stagewrap">
        <div className={"stage" + (mirrored ? " mirror" : "")}>
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} />
        </div>
        {overlay}
      </div>

      {error ? (
        <p className="error">
          {t(error.key)}
          {error.detail ? ` (${error.detail})` : ""}
        </p>
      ) : (
        <div className="pills">
          <span className="pill">{t(status)}</span>
          {status === "cam.s.ready" && (
            <>
              <span className={"pill " + (fullBody ? "ok" : "warn")}>
                {fullBody ? t("cam.full") : t("cam.step")}
              </span>
              <span className="pill">{t("cam.fps", { n: fps })}</span>
            </>
          )}
        </div>
      )}
    </div>
  );
}