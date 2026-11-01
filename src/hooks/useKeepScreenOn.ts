// src/hooks/useKeepScreenOn.ts
// Applies the "keep the screen on" preference to the native side.
//
// The preference itself lives in useKeepScreenOnStore; this hook is what pushes it
// to the native layer at startup. The native side does not keep the state across
// process restarts (on iOS `isIdleTimerDisabled` only lasts for the current run),
// so it has to be re-sent every time the app starts.
//
// On the desktop there is nothing to do: the desktop build has its own setting
// ("prevent display sleep during playback"), and the native module this hook
// reaches for does not exist there.
import { useEffect } from 'react';
import { syncKeepScreenOnToNative } from '../stores/useKeepScreenOnStore';

export function useKeepScreenOn() {
    useEffect(() => {
        syncKeepScreenOnToNative();
    }, []);
}
