/* =========================================================================
 * STGRMatchControl — Firebase configuration
 * -------------------------------------------------------------------------
 * EDIT THIS FILE with your own Firebase project's web config, commit it, and
 * everything (control panel + every OBS overlay) will sync in real time from
 * any device.
 *
 * HOW TO GET THIS (one time, free):
 *   1. Go to https://console.firebase.google.com  ->  Add project
 *   2. Build  ->  Realtime Database  ->  Create Database  ->  Start in TEST mode
 *      (or paste the rules from the README for a locked-down setup)
 *   3. Project settings (gear icon)  ->  "Your apps"  ->  Web app  (</> icon)
 *   4. Copy the values from the `firebaseConfig` object it shows you into
 *      the object below.
 *
 * NOTE: these values are NOT secret — Firebase web configs are meant to be
 * public. Access is controlled by your Database Rules (see README).
 *
 * Leave it as-is to run in LOCAL mode (localStorage + BroadcastChannel),
 * which works when the control panel and overlays are in the same browser
 * (e.g. OBS docks + browser sources). Set the values to go fully remote.
 * ========================================================================= */
// Points at the SAME Firebase project as the main SteigerDojoEsports site, so
// teams that register in a tournament flow straight into Match Control.
// IMPORTANT: `databaseURL` must be your project's REAL Realtime Database URL.
// After you create the database (Firebase Console > Build > Realtime Database),
// copy the URL it shows and replace the value below if the region differs.
window.STGR_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBSHoQfGF99ItNVFymfpHt6z-WmuzTosR4",
  authDomain:        "steigerdojoesports.firebaseapp.com",
  databaseURL:       "https://steigerdojoesports-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "steigerdojoesports",
  storageBucket:     "steigerdojoesports.firebasestorage.app",
  messagingSenderId: "395475824618",
  appId:             "1:395475824618:web:f05ddf3e5a07d421480c93"
};
