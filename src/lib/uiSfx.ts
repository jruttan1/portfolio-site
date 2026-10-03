import { createUISFX, type CueName, type UISFXPlayer } from "uisfx";

const SELECTED_PACK = "cinematic" as const;
let player: UISFXPlayer | null = null;

export function getUISFX(): UISFXPlayer | null {
  if (typeof window === "undefined") return null;

  if (!player) {
    player = createUISFX({
      pack: SELECTED_PACK,
      volume: 0.46,
      enabled: true
    });
  }

  return player;
}

export async function unlockUISFX(): Promise<boolean> {
  return (await getUISFX()?.unlock()) ?? false;
}

export async function unlockAndPlayUISFX(cue: CueName, volume?: number): Promise<void> {
  const ui = getUISFX();
  if (!ui || !ui.isEnabled()) return;
  const unlocked = await ui.unlock();
  if (unlocked) ui.play(cue, volume === undefined ? undefined : { volume });
}

export { SELECTED_PACK };
