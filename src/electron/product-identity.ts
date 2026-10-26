import { join } from "node:path"

interface ApplicationIdentity {
  readonly isPackaged: boolean
  commandLine: { hasSwitch(name: string): boolean }
  getPath(name: "appData" | "userData"): string
  setPath(name: "userData", path: string): void
  setName(name: string): void
}

/** Return the display-name change to run at ready, after Electron selects its encryption identity. */
export function applyProductIdentity(app: ApplicationIdentity): () => void {
  const existingUserData = app.isPackaged && !app.commandLine.hasSwitch("user-data-dir")
    ? join(app.getPath("appData"), "DAWN Science")
    : app.getPath("userData")
  // Electron 43 chooses macOS/Linux encryption storage from the name before ready.
  // Keep that identity compatible with existing encrypted credentials.
  if (app.isPackaged) app.setName("DAWN Science")
  app.setPath("userData", existingUserData)
  return () => {
    app.setName("EcoAI")
    app.setPath("userData", existingUserData)
  }
}
