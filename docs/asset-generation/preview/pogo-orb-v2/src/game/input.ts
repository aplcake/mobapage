export interface RawKeyboardInputFrame {
  moveX: number
  moveZ: number
  jumpPressed: boolean
  jumpHeld: boolean
  sprintHeld: boolean
  interactPressed: boolean
  resetPressed: boolean
}

const movementKeys = new Set([
  "w",
  "a",
  "s",
  "d",
  "arrowup",
  "arrowdown",
  "arrowleft",
  "arrowright",
])

const actionKeys = new Set([" ", "spacebar", "shift", "e", "r"])

export class KeyboardInputTracker {
  private readonly keysDown = new Set<string>()
  private readonly keysPressed = new Set<string>()
  private disposed = false

  constructor(private readonly target: Window) {
    target.addEventListener("keydown", this.handleKeyDown, { passive: false })
    target.addEventListener("keyup", this.handleKeyUp, { passive: false })
    target.addEventListener("blur", this.handleBlur)
  }

  dispose(): void {
    if (this.disposed) return

    this.target.removeEventListener("keydown", this.handleKeyDown)
    this.target.removeEventListener("keyup", this.handleKeyUp)
    this.target.removeEventListener("blur", this.handleBlur)
    this.disposed = true
  }

  getFrameInput(): RawKeyboardInputFrame {
    const moveX = axis(this.isHeld("d") || this.isHeld("arrowright"), this.isHeld("a") || this.isHeld("arrowleft"))
    const moveZ = axis(this.isHeld("w") || this.isHeld("arrowup"), this.isHeld("s") || this.isHeld("arrowdown"))

    const frame: RawKeyboardInputFrame = {
      moveX,
      moveZ,
      jumpPressed: this.consumePressed(" ") || this.consumePressed("spacebar"),
      jumpHeld: this.isHeld(" ") || this.isHeld("spacebar"),
      sprintHeld: this.isHeld("shift"),
      interactPressed: this.consumePressed("e"),
      resetPressed: this.consumePressed("r"),
    }

    return frame
  }

  private isHeld(key: string): boolean {
    return this.keysDown.has(key)
  }

  private consumePressed(key: string): boolean {
    const pressed = this.keysPressed.has(key)
    this.keysPressed.delete(key)
    return pressed
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    const key = normalizeKey(event.key)

    if (movementKeys.has(key) || actionKeys.has(key)) {
      event.preventDefault()
    }

    if (!this.keysDown.has(key)) {
      this.keysPressed.add(key)
    }

    this.keysDown.add(key)
  }

  private readonly handleKeyUp = (event: KeyboardEvent): void => {
    const key = normalizeKey(event.key)

    if (movementKeys.has(key) || actionKeys.has(key)) {
      event.preventDefault()
    }

    this.keysDown.delete(key)
  }

  private readonly handleBlur = (): void => {
    this.keysDown.clear()
    this.keysPressed.clear()
  }
}

export function createKeyboardInputTracker(target: Window): KeyboardInputTracker {
  return new KeyboardInputTracker(target)
}

function normalizeKey(key: string): string {
  const lower = key.toLowerCase()
  if (lower === "space") return " "
  if (lower === "spacebar") return "spacebar"
  if (lower === "shiftleft" || lower === "shiftright") return "shift"
  return lower
}

function axis(positive: boolean, negative: boolean): number {
  if (positive === negative) return 0
  return positive ? 1 : -1
}
