# Tvispy Android icon

The default icon is full colour: mint/cyan, gold and pink neon on #0C1523.
The monochrome layer is used only when the user enables launcher-themed icons.

## Deliverables

- `foreground-source.png`: original transparent foreground, created with built-in ImageGen.
- `export/Tvispy-icon-512.png`: full-bleed square icon for store artwork, no baked corner mask.
- `export/Tvispy-icon-1024.png`: large composite icon.
- `export/Tvispy-foreground-1080.png`: normalized transparent adaptive foreground.
- `export/Tvispy-icon-preview.png`: round, rounded-square and square previews, including small sizes.
- Android `mipmap-*` resources: 108–432px adaptive layers and 48–192px legacy icons.
- Android `mipmap-anydpi-v26`: separate opaque background and transparent foreground.
- Android `mipmap-anydpi-v33`: adds a simplified native vector for optional themed icons.

Run `scripts/package-android-icon.ps1` on Windows to reproduce colour density exports
without modifying the source artwork. The script checks transparency and fits visible
content inside a 64dp-diameter circle on Android's 108dp layer, leaving a reserve within
the 66dp safe circle. Preview masks show the central 72dp viewport. Low-opacity bloom
may extend outside the central artwork, but never the face or T core.

Specification: https://developer.android.com/develop/ui/compose/system/icon_design_adaptive

The app ID and save-data identifiers remain stable. The Android launcher label is Tvispy.
The website's existing interface branding is outside this icon change.

## Final art prompt (built-in ImageGen, edit)

Create the final Android launcher foreground by editing the Tvispy logo. Genuine
transparent RGBA background. Preserve the friendly mint/cyan snake face looking right,
cream muzzle, smiling mouth and glossy blue eye. Make the circuit T compact by shortening
the lower stem. Simplify to two strong circuit paths and large terminal nodes. Preserve
bright near-white glowing cores with cyan, warm gold and pink neon bloom fading to
transparency. Keep the emblem centered with transparent breathing room. No text,
confetti, border or background. Strong small-size silhouette.

The optional monochrome companion is a native Android vector with broad negative-space
eye and smile cutouts; it does not replace or recolour the default artwork.
