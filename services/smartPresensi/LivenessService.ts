/**
 * LivenessService.ts
 * Randomized Dynamic Liveness Challenge & Anti-Photo Replay Verification Engine.
 * 
 * STRICT COMPLIANCE:
 * 1. Runs 100% locally client-side without paid AI APIs or cloud tokens.
 * 2. Distinguishes live biological human interaction from static photos, screenshots, or gallery replays.
 * 3. Uses randomized multi-step challenges (e.g. Kedip, Tengok Kiri, Tengok Kanan, Senyum, Gerak Kepala).
 * 4. Transparently documents detection cues without claiming 100% impossible absolute spoof-proofing.
 */

import * as faceapi from '@vladmandic/face-api';
import { LivenessChallenge, LivenessChallengeType } from '../../types';

export const LIVENESS_CHALLENGES: Record<LivenessChallengeType, Omit<LivenessChallenge, 'id'>> = {
  BLINK: {
    type: 'BLINK',
    instruction: 'Silakan Kedipkan Mata',
    subInstruction: 'Kedipkan kedua mata Anda dengan santai',
    icon: 'bi-eye',
    durationMs: 7000
  },
  LOOK_LEFT: {
    type: 'LOOK_LEFT',
    instruction: 'Silakan Tengok ke Kiri',
    subInstruction: 'Arahkan wajah Anda sedikit ke sisi kiri',
    icon: 'bi-arrow-left-circle',
    durationMs: 7000
  },
  LOOK_RIGHT: {
    type: 'LOOK_RIGHT',
    instruction: 'Silakan Tengok ke Kanan',
    subInstruction: 'Arahkan wajah Anda sedikit ke sisi kanan',
    icon: 'bi-arrow-right-circle',
    durationMs: 7000
  },
  SMILE: {
    type: 'SMILE',
    instruction: 'Silakan Tersenyum',
    subInstruction: 'Tunjukkan senyuman natural ke arah kamera',
    icon: 'bi-emoji-smile',
    durationMs: 7000
  },
  NOD_HEAD: {
    type: 'NOD_HEAD',
    instruction: 'Gerakkan Kepala Sedikit',
    subInstruction: 'Anggukkan atau gerakkan kepala perlahan',
    icon: 'bi-person-bounding-box',
    durationMs: 7000
  }
};

/**
 * Generates a randomized list of 1 to 2 dynamic liveness challenges
 */
export function generateRandomLivenessSequence(count = 2): LivenessChallenge[] {
  const types: LivenessChallengeType[] = ['BLINK', 'LOOK_LEFT', 'LOOK_RIGHT', 'SMILE', 'NOD_HEAD'];
  // Shuffle randomly
  const shuffled = [...types].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, count);

  return selected.map((type, idx) => ({
    id: `chal_${Date.now()}_${idx}`,
    ...LIVENESS_CHALLENGES[type]
  }));
}

export interface LivenessFrameAnalysis {
  faceDetected: boolean;
  box?: { x: number; y: number; width: number; height: number };
  earLeft?: number;
  earRight?: number;
  avgEar?: number;
  yaw?: number;
  pitch?: number;
  smileScore?: number;
  motionScore?: number;
}

/**
 * Computes Eye Aspect Ratio (EAR) from 6 landmark points
 * EAR = (||p2 - p6|| + ||p3 - p5||) / (2 * ||p1 - p4||)
 */
function computeEyeAspectRatio(eyePoints: any[]): number {
  if (!eyePoints || eyePoints.length < 6) return 0.3;
  const p1 = eyePoints[0];
  const p2 = eyePoints[1];
  const p3 = eyePoints[2];
  const p4 = eyePoints[3];
  const p5 = eyePoints[4];
  const p6 = eyePoints[5];

  const distV1 = Math.hypot(p2.x - p6.x, p2.y - p6.y);
  const distV2 = Math.hypot(p3.x - p5.x, p3.y - p5.y);
  const distH = Math.hypot(p1.x - p4.x, p1.y - p4.y);

  if (distH === 0) return 0.3;
  return (distV1 + distV2) / (2.0 * distH);
}

/**
 * Evaluates live video frame for landmarks and liveness signals
 */
export async function analyzeLivenessFrame(videoElement: HTMLVideoElement): Promise<LivenessFrameAnalysis> {
  try {
    const detection = await faceapi
      .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.4 }))
      .withFaceLandmarks();

    if (!detection) {
      return { faceDetected: false };
    }

    const landmarks = detection.landmarks;
    const box = detection.detection.box;

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    const nose = landmarks.getNose();
    const mouth = landmarks.getMouth();

    const earLeft = computeEyeAspectRatio(leftEye);
    const earRight = computeEyeAspectRatio(rightEye);
    const avgEar = (earLeft + earRight) / 2;

    // Yaw estimation: distance from nose tip to eye centers
    let yaw = 0;
    if (nose.length && leftEye.length && rightEye.length) {
      const eyeCenter = (leftEye[0].x + rightEye[3].x) / 2;
      const noseTip = nose[3].x;
      const eyeDist = Math.abs(rightEye[3].x - leftEye[0].x) || 1;
      yaw = (noseTip - eyeCenter) / eyeDist; // Negative = facing left, Positive = facing right
    }

    // Smile estimation: mouth corner distance relative to mouth height
    let smileScore = 0;
    if (mouth.length >= 12) {
      const mouthWidth = Math.hypot(mouth[0].x - mouth[6].x, mouth[0].y - mouth[6].y);
      const mouthHeight = Math.hypot(mouth[3].x - mouth[9].x, mouth[3].y - mouth[9].y);
      smileScore = mouthWidth / (mouthHeight || 1);
    }

    return {
      faceDetected: true,
      box: { x: box.x, y: box.y, width: box.width, height: box.height },
      earLeft,
      earRight,
      avgEar,
      yaw,
      smileScore
    };
  } catch (e) {
    return { faceDetected: false };
  }
}

/**
 * Evaluates whether a specific challenge was successfully completed across a history of frames
 */
export function evaluateChallengeSuccess(
  challenge: LivenessChallenge,
  frameHistory: LivenessFrameAnalysis[]
): { passed: boolean; progress: number } {
  if (frameHistory.length < 3) return { passed: false, progress: 10 };

  switch (challenge.type) {
    case 'BLINK': {
      // Look for a drop in EAR below 0.22 followed by an open state (> 0.28)
      let hasClosed = false;
      let hasReopened = false;
      let minEar = 1.0;

      for (const f of frameHistory) {
        if (f.avgEar !== undefined) {
          if (f.avgEar < minEar) minEar = f.avgEar;
          if (f.avgEar < 0.22) {
            hasClosed = true;
          }
          if (hasClosed && f.avgEar > 0.27) {
            hasReopened = true;
          }
        }
      }

      if (hasClosed && hasReopened) {
        return { passed: true, progress: 100 };
      }
      const progress = hasClosed ? 75 : Math.min(60, Math.round((1 - minEar) * 100));
      return { passed: false, progress: Math.max(10, progress) };
    }

    case 'LOOK_LEFT': {
      // User looks to their left -> In mirrored camera, nose moves to the left or right
      let maxLeftYaw = 0;
      for (const f of frameHistory) {
        if (f.yaw !== undefined) {
          if (Math.abs(f.yaw) > maxLeftYaw && f.yaw < -0.15) {
            maxLeftYaw = Math.abs(f.yaw);
          }
        }
      }
      if (maxLeftYaw >= 0.20) return { passed: true, progress: 100 };
      return { passed: false, progress: Math.min(90, Math.round((maxLeftYaw / 0.20) * 100)) };
    }

    case 'LOOK_RIGHT': {
      // User looks to their right
      let maxRightYaw = 0;
      for (const f of frameHistory) {
        if (f.yaw !== undefined) {
          if (f.yaw > maxRightYaw && f.yaw > 0.15) {
            maxRightYaw = f.yaw;
          }
        }
      }
      if (maxRightYaw >= 0.20) return { passed: true, progress: 100 };
      return { passed: false, progress: Math.min(90, Math.round((maxRightYaw / 0.20) * 100)) };
    }

    case 'SMILE': {
      let maxSmile = 0;
      for (const f of frameHistory) {
        if (f.smileScore !== undefined) {
          if (f.smileScore > maxSmile) maxSmile = f.smileScore;
        }
      }
      // Smile ratio typical is 2.5 - 3.5
      if (maxSmile >= 2.8) return { passed: true, progress: 100 };
      return { passed: false, progress: Math.min(90, Math.round((maxSmile / 2.8) * 100)) };
    }

    case 'NOD_HEAD':
    default: {
      // Check for bounding box / nose Y coordinate variation
      if (frameHistory.length >= 6) {
        const yCoords = frameHistory.map(f => f.box?.y || 0).filter(y => y > 0);
        if (yCoords.length >= 4) {
          const minY = Math.min(...yCoords);
          const maxY = Math.max(...yCoords);
          const deltaY = maxY - minY;
          if (deltaY >= 12) return { passed: true, progress: 100 };
          return { passed: false, progress: Math.min(90, Math.round((deltaY / 12) * 100)) };
        }
      }
      return { passed: false, progress: 30 };
    }
  }
}
