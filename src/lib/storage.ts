/**
 * App Settings
 */
export function getSettings(): Settings {
  const defaultSettings: Settings = {
    model: "gpt-3.5-turbo",
    enterBehaviour: "send",
    // Disabled by default, since token parsing requires downloading larger deps
    countTokens: false,
    justShowMeTheCode: false,
  };

  const settings = localStorage.getItem("settings");
  if (!settings) {
    return defaultSettings;
  }

  return { ...defaultSettings, ...JSON.parse(settings) };
}

export function setSettings(settings: Settings) {
  localStorage.setItem("settings", JSON.stringify(settings));
}
