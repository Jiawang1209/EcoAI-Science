import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { applyProductIdentity } from "../../src/electron/product-identity.js"

describe("product branding preserves user data", () => {
  function application(isPackaged: boolean, initial: string, overridden = false) {
    let name = "Electron"
    let userData = initial
    return {
      isPackaged,
      commandLine: { hasSwitch: () => overridden },
      getPath: (key: "appData" | "userData") => key === "appData" ? "/profiles" : userData,
      setName(next: string) { name = next; userData = join("/profiles", next) },
      setPath(_key: "userData", next: string) { userData = next },
      name: () => name,
    }
  }

  it("keeps the legacy encryption identity until Electron is ready, then displays EcoAI-Science", () => {
    const app = application(true, "/profiles/EcoAI")
    const reveal = applyProductIdentity(app)
    expect(app.name()).toBe("DAWN Science")
    expect(reveal).toBeTypeOf("function")
    reveal()
    expect(app.name()).toBe("EcoAI-Science")
    expect(app.getPath("userData")).toBe(join("/profiles", "DAWN Science"))
  })

  it("keeps the existing packaged data directory when the installed product is renamed", () => {
    const app = application(true, "/profiles/EcoAI")
    applyProductIdentity(app)()
    expect(app.name()).toBe("EcoAI-Science")
    expect(app.getPath("userData")).toBe(join("/profiles", "DAWN Science"))
  })

  it("keeps a packaged test's explicit user-data-dir instead of opening a real profile", () => {
    const app = application(true, "/isolated/packaged-test", true)
    applyProductIdentity(app)()
    expect(app.name()).toBe("EcoAI-Science")
    expect(app.getPath("userData")).toBe("/isolated/packaged-test")
  })

  it.each(["/profiles/Electron", "/isolated/dev-preview"])("keeps the source runtime's existing profile %s", profile => {
    const app = application(false, profile)
    const reveal = applyProductIdentity(app)
    expect(app.name()).toBe("Electron")
    reveal()
    expect(app.name()).toBe("EcoAI-Science")
    expect(app.getPath("userData")).toBe(profile)
  })
})
