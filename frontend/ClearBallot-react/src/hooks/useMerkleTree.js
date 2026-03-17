import { useCallback } from "react";
import { buildPoseidon } from "circomlibjs";

// ─────────────────────────────────────────────────────────────────────────────
// Constants — must match vote.circom
// ─────────────────────────────────────────────────────────────────────────────

const TREE_LEVELS = 16;

// Poseidon(0) — used to pad the tree to 2^TREE_LEVELS leaves
const ZERO_VALUE = BigInt(
  "21663839004416932945382355908790599225266501822907911457504978515578255421292"
);

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useMerkleTree() {

  // ── Build full Merkle tree from voter secrets ─────────────────────────────
  // Each leaf = Poseidon(secret, 1) matching vote.circom leafHasher

  const buildTree = useCallback(async (secrets) => {
    const poseidon = await buildPoseidon();

    const leaves = secrets.map((s) =>
      poseidon.F.toObject(poseidon([s, BigInt(1)]))
    );

    // Pad to 2^TREE_LEVELS
    const paddedLeaves = [...leaves];
    while (paddedLeaves.length < Math.pow(2, TREE_LEVELS)) {
      paddedLeaves.push(ZERO_VALUE);
    }

    // Build layers bottom-up
    const layers = [paddedLeaves];
    let current = paddedLeaves;
    while (current.length > 1) {
      const next = [];
      for (let i = 0; i < current.length; i += 2) {
        next.push(poseidon.F.toObject(poseidon([current[i], current[i + 1] ?? ZERO_VALUE])));
      }
      layers.push(next);
      current = next;
    }

    return { root: current[0], leaves: paddedLeaves, layers };
  }, []);

  // ── Get Merkle path for a leaf index ─────────────────────────────────────
  // Returns sibling hashes + left/right indices for the circuit

  const getMerklePath = useCallback((tree, leafIndex) => {
    const pathElements = [];
    const pathIndices = [];
    let idx = leafIndex;

    for (let level = 0; level < TREE_LEVELS; level++) {
      const isRight = idx % 2 === 1;
      const siblingIndex = isRight ? idx - 1 : idx + 1;
      pathIndices.push(isRight ? 1 : 0);
      pathElements.push(tree.layers[level][siblingIndex] ?? ZERO_VALUE);
      idx = Math.floor(idx / 2);
    }

    return { pathElements, pathIndices };
  }, []);

  // ── Compute nullifier = Poseidon(secret, 0) ───────────────────────────────
  // Matches vote.circom nullifierHasher — domain separator 0

  const computeNullifier = useCallback(async (secret) => {
    const poseidon = await buildPoseidon();
    return poseidon.F.toObject(poseidon([secret, BigInt(0)]));
  }, []);

  // ── Generate a secure random voter secret ─────────────────────────────────
  // 31 bytes = 248 bits, safely within BN128 scalar field

  const generateSecret = useCallback(() => {
    const bytes = new Uint8Array(31);
    crypto.getRandomValues(bytes);
    return BigInt("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));
  }, []);

  return { buildTree, getMerklePath, computeNullifier, generateSecret };
}