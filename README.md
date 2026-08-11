# Gallery Excluder

Keep media in your Obsidian vault out of Android gallery apps.

Gallery Excluder creates Android `.nomedia` files in selected vault folders. Your images remain ordinary files, so they still appear in Obsidian, work in embeds, and can be synchronized normally.

> [!NOTE]
> You can configure the plugin on any platform, but it creates and removes `.nomedia` files only in Obsidian for Android.

## Features

- Protect the entire vault, the configured attachment folder, or selected custom folders.
- Apply protection when the vault opens on Android and when a configured folder is created later.
- Leave any `.nomedia` file that already exists at a target location untouched.
- Track the paths it creates so they can be removed explicitly.
- Show an optional notice only when new protection files are created.

## How it works

Android media scanners recognize a file named `.nomedia` as a request not to index media in that folder or its subfolders. Gallery Excluder places an empty `.nomedia` file at each location covered by the selected protection mode.

This affects compatible Android gallery and media apps only. It does not delete, move, encrypt, or hide files inside Obsidian.

## Installation

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest release.
2. Create `YourVault/.obsidian/plugins/gallery-excluder/`.
3. Copy the three files into that folder.
4. Restart Obsidian or reload the app.
5. Open **Settings → Community plugins** and enable **Gallery Excluder**.

### Build from source

Building from source generates `main.js`. The other two required plugin files, `manifest.json` and `styles.css`, are already included in the repository.

1. Install [Node.js](https://nodejs.org/), which includes npm.
2. Clone the repository and open its folder:

   ```bash
   git clone https://github.com/Calmtea5209/Gallery-Excluder.git
   cd Gallery-Excluder
   ```

3. Install the exact dependencies recorded in `package-lock.json`, then create a production build:

   ```bash
   npm ci
   npm run build
   ```

4. After the build finishes, find the generated `main.js` in the project root.
5. Create `YourVault/.obsidian/plugins/gallery-excluder/`.
6. Copy `main.js`, `manifest.json`, and `styles.css` into that folder.
7. Restart Obsidian or reload the app.
8. Open **Settings → Community plugins** and enable **Gallery Excluder**.

The `.obsidian` folder and `.nomedia` files are hidden by many file managers. Enable hidden-file display if you need to inspect them.

## Usage

Protection is enabled by default for the entire vault. On Android, Gallery Excluder applies the selected mode after the vault is ready. You can change its behavior under **Settings → Gallery Excluder**.

| Setting | What it does |
| --- | --- |
| **Enable protection** | Enables or pauses automatic protection. Disabling it does not remove existing `.nomedia` files. |
| **Protection mode** | Chooses the folders that Gallery Excluder protects. |
| **Show notification when `.nomedia` is created** | Shows one notice after the plugin creates one or more new protection files. |
| **Apply protection now** | Immediately applies the current configuration on Android when protection is enabled. |
| **Remove plugin-created `.nomedia` files** | Removes `.nomedia` files from paths recorded as created by Gallery Excluder. |

### Protection modes

| Mode | Protected location |
| --- | --- |
| **Entire vault** | The vault root, covering media throughout the vault. |
| **Attachment folder only** | The attachment folder configured under Obsidian's **Files and links** settings. |
| **Custom folders** | One or more vault-relative folders, such as `attachments`, `assets`, or `images/screenshots`. A configured folder can be created later. |

If Obsidian stores attachments relative to the current note, such as `./` or `./assets`, there is no single vault-wide attachment folder. In **Attachment folder only** mode, Gallery Excluder asks for a fixed vault-relative fallback folder.

## Old images still appear in your gallery

Creating `.nomedia` stops compatible media scanners from indexing the protected folders, but a gallery app may keep images that it indexed earlier. On Android:

1. Open **Settings → Apps**, then select your gallery app.
2. Tap **Force stop**.
3. Open **Storage**, then tap **Clear cache**.
4. Do not tap **Clear data**; that can reset the gallery app's settings.
5. Restart the phone, then open the gallery app again.

Menu names may vary between devices and gallery apps. These instructions are also shown at the top of the plugin settings page on Android.

## Safety and limitations

- If `.nomedia` already exists when Gallery Excluder checks a target, the plugin does not overwrite or track it.
- The removal button deletes `.nomedia` files at paths recorded as plugin-created. If a different `.nomedia` file later replaces one at the same path, Gallery Excluder cannot distinguish it and will remove it too.
- Disabling protection or changing modes does not silently remove files from the previous mode. Use the removal button when you want to clean them up.
- If protection remains enabled, applying it again or restarting Obsidian can recreate required files that were removed.
- Some third-party gallery apps may ignore `.nomedia`.
- A `.nomedia` file may sync to other devices. Windows, macOS, and iOS do not use it for Android media scanning, so it normally has no effect there.
- Obsidian does not expose a reliable per-file API that lets this plugin exclude `.nomedia` from Obsidian Sync.
- Absolute paths and paths containing `..` are rejected. Missing or unwritable folders are reported without modifying other locations.
