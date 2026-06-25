import { promises as fs } from "fs";
import path from "path";

const settingsPath = path.join(process.cwd(), "lib", "monetization-settings.json");

export async function getMonetizationSettings() {
  try {
    const data = await fs.readFile(settingsPath, "utf-8");
    return JSON.parse(data);
  } catch {
    const defaults = {
      maxDiscountPercent: 45,
      activeCampaign: "Summer Coin Sale"
    };
    await saveMonetizationSettings(defaults);
    return defaults;
  }
}

export async function saveMonetizationSettings(settings: any) {
  await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2), "utf-8");
}
