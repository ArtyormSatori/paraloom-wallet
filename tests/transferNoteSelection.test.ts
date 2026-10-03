import { describe, expect, it, vi } from "vitest"

vi.mock("~lib/prover", () => ({ NATIVE_ASSET_HEX: "00".repeat(32) }))

import { NATIVE_ASSET_HEX } from "../lib/prover"
import type { ShieldedNote } from "../lib/paraloom/notes"
import { unspentSolNotes, selectSolTransferNotes } from "../src/popup/Home"

describe("shielded transfer note selection (paraloom-core#852)", () => {
  const dummyNote = (amount: bigint, assetId: string = NATIVE_ASSET_HEX, spent = false, mint?: string): ShieldedNote => ({
    amount: amount.toString(),
    blinding: "00".repeat(32),
    assetId,
    mint,
    signature: "sig123",
    createdAt: Date.now(),
    spent,
  })

  const SPL_ASSET = "11".repeat(32)

  it("unspentSolNotes filters out spent notes and SPL token notes", () => {
    const sol1 = dummyNote(1_000_000_000n, NATIVE_ASSET_HEX)
    const sol2 = dummyNote(2_000_000_000n, "") // empty assetId is native SOL
    const spentSol = dummyNote(5_000_000_000n, NATIVE_ASSET_HEX, true)
    const splNote = dummyNote(10_000_000_000n, SPL_ASSET, false, "USDC_MINT")

    const filtered = unspentSolNotes([sol1, spentSol, splNote, sol2])
    expect(filtered).toHaveLength(2)
    expect(filtered.map(n => n.amount)).toEqual(["2000000000", "1000000000"])
  })

  it("selectSolTransferNotes picks the largest native SOL notes without touching SPL notes", () => {
    const smallSol = dummyNote(500_000_000n, NATIVE_ASSET_HEX)
    const largeSpl = dummyNote(50_000_000_000n, SPL_ASSET, false, "USDC_MINT")
    const midSol = dummyNote(800_000_000n, NATIVE_ASSET_HEX)

    // Asking for 1 SOL (1e9)
    const selected = selectSolTransferNotes([smallSol, largeSpl, midSol], 1_000_000_000n)
    expect(selected).not.toBeNull()
    expect(selected!).toHaveLength(2)
    expect(selected!.every(n => !n.assetId || n.assetId === NATIVE_ASSET_HEX)).toBe(true)
    expect(selected!.some(n => n.assetId === SPL_ASSET)).toBe(false)
  })

  it("returns null if native SOL notes cannot cover the requested amount", () => {
    const smallSol = dummyNote(100_000_000n, NATIVE_ASSET_HEX)
    const hugeSpl = dummyNote(1_000_000_000_000n, SPL_ASSET, false, "USDC_MINT")

    const selected = selectSolTransferNotes([smallSol, hugeSpl], 500_000_000n)
    expect(selected).toBeNull()
  })
})
