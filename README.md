# ISpooferMotion

**ISpooferMotion** is an animation spoofing utility designed for Roblox developers and animators (Animation Spoofer / Asset Spoofer). It helps you quickly upload and apply animation overrides.

## 🟢STATUS : WORKING!; Join the discord for status updates! https://discord.gg/d5cJzAURBH

- Audio And Image Spoofing Soon

## Features

- **Auto-detect Roblox cookie:** Seamlessly logs you in by detecting your Roblox session cookie.
- **Instant animation upload:** Upload animations directly from the app without hassle.
- **Link animations to Roblox Studio:** Quickly connect your uploaded animations to the [ISpooferMotion plugin for Roblox Studio](https://create.roblox.com/store/asset/77166107193979/ISpooferMotion) for real-time spoofing.

## How It Works

1. **Login:** The app automatically detects your Roblox cookie or you can put in your cookie manually.
2. **Upload animations:** Upload your animations instantly to Roblox.
3. **Apply spoofing:** Use the official ISpooferMotion Roblox Studio plugin (linked above) to link and spoof animations in your game projects.
4. **Spoofs** Spoofs animations inside of scripts and replaces them alongside replacing animation objects.

## API-key mode and privacy in this fork

Select **API key only** in the desktop app's Quick Setup to download through Open Cloud and upload animations or audio without a Roblox session cookie. New profiles select this mode by default. Existing profiles keep their previous cookie workflow until you switch modes.

- Configure Asset Delivery access for downloads (`legacy-asset:manage` in Roblox's scope documentation), plus Assets Read and Write for uploads and upload status checks.
- Enter your Roblox User ID for personal uploads, or a Group ID for group uploads. The key must have permission to upload for that creator.
- Scan with the Studio plugin, start the operation, then use **Push to Studio** to apply the returned mappings. Back up the project before applying replacements.
- API-key mode reports restricted assets as failures. Choose **Cookie + API key** explicitly if you need the existing download workflow. Audio quota previews and place-context search are available in cookie mode. Roblox still checks quotas during API-key uploads.
- API keys are sensitive. Saved profiles currently store credentials in the app's local JSON file. Use a dedicated key with minimum permissions and revoke it when finished.

This fork removes usage heartbeats, remote crash reporting, asset/place cache sharing, and remote maintenance configuration. Local logs and job history remain available on your computer. Update checks use this fork's GitHub releases. Asset operations contact Roblox, and the Studio plugin also downloads a public Roblox API description from GitHub.

## Installation

Download the latest release executable from the [Releases](https://github.com/IncrediDev/ISpooferMotion/releases) section.

## Usage

- Install and Launch the app.
- Install the studio Plugin [ISpooferMotion plugin for Roblox Studio](https://create.roblox.com/store/asset/77166107193979/ISpooferMotion) or get it from the releases tab.
- Once Installed in studio go to the Plugins tab and find this ![image](https://github.com/user-attachments/assets/afd6b9ca-84ce-4ab5-9ae1-67df58ef8d66).
- Click the Get Id's Button and a window should popup in studio
- Highlight and copy everything inside of the textbox ![image](https://github.com/user-attachments/assets/10624efe-2f53-430a-8aa4-4ed32ec24a95)
- Open the ISpooferMotion app and paste the ids into the textbox ![image](https://github.com/user-attachments/assets/0a126ebd-1ab3-4a17-b55b-c763d5021e15)
- Next you can enter your cookie manually or select the Auto Detect Cookie option for the account you want to upload the animations to ![image](https://github.com/user-attachments/assets/ca442d20-07ec-4d9e-81a2-ee7c86c4e8ad)
- Optionally you can enter a Group ID To upload the animations to a Group you have permissions in
- Click Run Spoofer and then wait for the output
- The output should look like this ![image](https://github.com/user-attachments/assets/35bb3c92-fb03-4f81-b5f4-77ce7a9c7407)
- Copy the contents of the output, Then head back to studio and click the Replace Id's Button in the Plugins tab ![image](https://github.com/user-attachments/assets/e45f4ee0-8d5b-4531-91f6-4dc9d50206ab)
- Paste the contents into the TextBox and click Run ![image](https://github.com/user-attachments/assets/e063ab9e-0867-4ca3-bf2d-733a9855cadd)
- Thats it! All animations are spoofed and replaced in your game!

- Upload your animation files.
- Open Roblox Studio and use the ISpooferMotion plugin to link and spoof the animations.

## License

This project is licensed under the GPL-3.0-or-later license.

---

If you have any questions or want to contribute, feel free to open an issue or pull request!

---

**Author:** IncredibroXP  
**GitHub:** [https://github.com/IncrediDev/ISpooferMotion](https://github.com/IncrediDev/ISpooferMotion)
