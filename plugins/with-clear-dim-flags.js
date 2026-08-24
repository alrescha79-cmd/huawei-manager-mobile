// Config plugin: clear stale Android window dim/brightness state.
//
// Root cause: on some OEM ROMs (MIUI, ColorOS, OxygenOS, …), when a
// full-screen RN Modal or a Google Mobile Ads full-screen window (App Open Ad,
// consent form, interstitial) closes, the WindowManager leaves the activity
// window dimmed (FLAG_DIM_BEHIND) or with an overridden screenBrightness. The
// stale dim/brightness persists until the activity is recreated (force-stop),
// which users see as "the screen dims on open until I restart the app".
//
// The plugin patches MainActivity to reset that window state whenever the
// activity resumes or regains window focus (i.e. right after any overlay
// window — dialog, ad activity — closes). It also clears FLAG_SECURE, matching
// the manual edit the dev build has, so CI prebuilds keep the same behavior.
'use strict';

const { withMainActivity } = require('@expo/config-plugins');

const ANCHOR = 'override fun getMainComponentName(): String = "main"';

const WINDOW_RESET = `
  override fun onResume() {
    super.onResume()
    resetWindowDimState()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      resetWindowDimState()
    }
  }

  private fun resetWindowDimState() {
    try {
      val dimFlag = android.view.WindowManager.LayoutParams.FLAG_DIM_BEHIND
      window.clearFlags(dimFlag)
      // Toggle the flag once to force WindowManager to recompose its dim
      // layer stack; some OEM ROMs otherwise keep the dim layer attached to
      // the activity after an overlay window closes.
      window.setFlags(dimFlag, dimFlag)
      window.clearFlags(dimFlag)
      // Some OEMs or libraries set FLAG_SECURE; explicitly clear it here.
      window.clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE)
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
