// Config plugin: clear stale Android window dim/brightness state.
//
// Root cause: on some OEM ROMs (MIUI, ColorOS, OxygenOS, …), when a
// full-screen RN Modal or a Google Mobile Ads full-screen window (App Open Ad,
// consent form, interstitial) closes, the WindowManager leaves the activity
// window dimmed (FLAG_DIM_BEHIND) or with an overridden screenBrightness. The
// stale dim/brightness persists until the activity is recreated (force-stop),
// which users see as "the screen dims on open until I restart the app".
//
// The plugin patches MainActivity to clear that window state whenever the
// activity regains window focus (i.e. right after any overlay window — dialog,
// ad activity — closes). It also clears FLAG_SECURE, matching the manual edit
// the dev build has, so CI prebuilds keep the same behavior.
//
// IMPORTANT: We do NOT call resetWindowDimState() in onResume() because that
// fires before the splash screen is dismissed and before any closing overlay
// has fully detached, which can cause a black/blank screen on some OEM ROMs.
// Instead, we only clear flags in onWindowFocusChanged(true), which fires
// after the overlay window has completely closed and focus returns to the
// activity. We also never SET FLAG_DIM_BEHIND (no toggle) — setting it even
// momentarily causes a visible dim flash or persistent black screen on
// certain devices.
'use strict';

const { withMainActivity } = require('@expo/config-plugins');

const ANCHOR = 'override fun getMainComponentName(): String = "main"';

const WINDOW_RESET = `
  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      resetWindowDimState()
    }
  }

  private fun resetWindowDimState() {
    try {
      // Only CLEAR flags — never SET FLAG_DIM_BEHIND, even momentarily.
      // Setting it (even to "toggle") causes a dim flash or black screen
      // on MIUI/ColorOS because the dim layer is composited before clear.
      window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND)
      // Some OEMs or libraries set FLAG_SECURE; explicitly clear it here.
      window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
      // Reset screenBrightness to system default if an ad/overlay overrode it.
      val attrs = window.attributes
      if (attrs.screenBrightness in 0f..1f) {
        attrs.screenBrightness = -1f
        window.attributes = attrs
      }
    } catch (e: Exception) {
    }
  }
`;

module.exports = function withClearDimFlags(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.contents.includes('resetWindowDimState')) {
      return cfg;
    }
    if (!cfg.modResults.contents.includes(ANCHOR)) {
      throw new Error(
        'withClearDimFlags: could not find MainActivity anchor for window-reset injection'
      );
    }
    cfg.modResults.contents = cfg.modResults.contents.replace(ANCHOR, ANCHOR + WINDOW_RESET);
    return cfg;
  });
};
