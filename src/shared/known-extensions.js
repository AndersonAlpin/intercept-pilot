// Fallback mapping used only when chrome.management.get is unavailable
// or fails (e.g., permission denied, extension uninstalled).
// Source of truth is the live management API; this list just covers the
// most common iframe-injecting extensions for a friendlier label.
export const KNOWN_EXTENSIONS = {
  iohjgamcilhbgmhbnllfolmkmmekfmci: 'Jam',
  hdokiejnpimakedhajhdlcegeplioahd: 'LastPass',
  bmnlcjabgnpnenekpadlanbbkooimhnj: 'Honey',
  kbfnbcaeplbcioakkpcpgfkobkghlhen: 'Grammarly',
  aeblfdkhhhdcdjpifhhbdiojplfjncoa: '1Password',
  nngceckbapebfimnlniiiahkandclblb: 'Bitwarden',
  pkehgijcmpdhfbdbbnkijodmdjhbjlgp: 'Privacy Badger'
}
