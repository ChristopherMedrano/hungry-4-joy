export const OPERATOR_TOKEN_BYTE_LENGTH = 32

type RandomValues = (bytes: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>

interface ClipboardWriter {
  writeText(value: string): Promise<void>
}

export type TokenCopyResult = 'copied' | 'failed' | 'stale'

export class TokenCopyGuard {
  private generation = 0

  invalidate(): void {
    this.generation += 1
  }

  async copy(
    token: string,
    currentToken: () => string,
    clipboard?: ClipboardWriter,
  ): Promise<TokenCopyResult> {
    const operationGeneration = ++this.generation

    try {
      await copyOperatorToken(token, clipboard)
    } catch {
      return this.isCurrent(operationGeneration, token, currentToken()) ? 'failed' : 'stale'
    }

    return this.isCurrent(operationGeneration, token, currentToken()) ? 'copied' : 'stale'
  }

  private isCurrent(generation: number, copiedToken: string, currentToken: string): boolean {
    return generation === this.generation && copiedToken === currentToken
  }
}

export function generateOperatorToken(
  getRandomValues?: RandomValues,
): string {
  const randomValues = getRandomValues ?? ((bytes: Uint8Array<ArrayBuffer>) => {
    if (!globalThis.crypto) {
      throw new Error('Secure token generation is unavailable in this browser.')
    }

    return globalThis.crypto.getRandomValues(bytes)
  })

  const bytes = new Uint8Array(new ArrayBuffer(OPERATOR_TOKEN_BYTE_LENGTH))
  randomValues(bytes)

  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function copyOperatorToken(
  token: string,
  clipboard: ClipboardWriter | undefined = globalThis.navigator?.clipboard,
): Promise<void> {
  if (!clipboard) {
    throw new Error('Clipboard access is unavailable.')
  }

  await clipboard.writeText(token)
}
