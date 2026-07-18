# JuniorIgnite License Generator (ELIGNITE only)

Offline tool that signs JuniorIgnite activation codes with the Ed25519 **private
key**. The app ships only the matching **public key** and verifies codes locally —
no server, no internet. Keep this tool and its `keys/` folder private to ELIGNITE.

## One-time setup

```bash
cd tools/license-gen
node license-gen.mjs keygen
```

This writes `keys/license-private.pem` (SECRET — never commit or ship) and
`keys/license-public.pem`. Copy the printed PUBLIC key block into
`electron/main/services/licensing/crypto.ts` → `LICENSE_PUBLIC_KEY_PEM`, then
rebuild and distribute the app. Do this **before** shipping to real schools so
the bundled dev/public key is replaced by one whose private half only you hold.

> The repo ships with a development public key so the flow works out of the box.
> It is safe to distribute internally, but rotate to your own key (as above)
> before public release.

## Issuing / renewing a license

A school gives you its **School ID** and **Device ID** (shown at setup and on the
in-app License page). Then:

```bash
# Runs until the next end-of-February (the annual renewal deadline):
node license-gen.mjs issue --school JI-4F9A-2C7B --device 1b2c3d4e-... --out school.lic

# Or pin an explicit expiry:
node license-gen.mjs issue --school JI-4F9A-2C7B --device 1b2c3d4e-... --until 2027-02-28
```

Send the printed activation code (or the `.lic` file) to the school. In the app
they open **License → Activate License**, paste the code (or import the file),
and every feature unlocks immediately — no reinstall. The code only works on that
one School ID + Device ID, so it cannot be copied to another computer.
