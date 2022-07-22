/// <reference lib="DOM" />

declare module "crypto" {
  namespace webcrypto {
    const subtle: SubtleCrypto;
    function getRandomValues(buf: Buffer): Buffer;
  }
}