import { buildPoseidon } from "circomlibjs";

// ─────────────────────────────────────────────────────────────────────────────
// Poseidon singleton — initialised once, reused
// ─────────────────────────────────────────────────────────────────────────────

let poseidonFn = null;

async function getPoseidon() {
  if (!poseidonFn) {
    const p = await buildPoseidon();
    poseidonFn = (inputs) => p.F.toObject(p(inputs));
  }
  return poseidonFn;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Domain-separated hashes matching the circuit exactly:
//   leaf       = Poseidon(secret, 1)
//   nullifier  = Poseidon(secret, 0)
export async function computeLeaf(secret) {
  const poseidon = await getPoseidon();
  return poseidon([secret, 1n]);
}

export async function computeNullifier(secret) {
  const poseidon = await getPoseidon();
  return poseidon([secret, 0n]);
}

// Generate a cryptographically random voter secret
export function generateSecret() {
  const arr = new Uint8Array(31); // 31 bytes = 248 bits, safely within BN128 field
  crypto.getRandomValues(arr);
  return BigInt("0x" + Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join(""));
}

// ─────────────────────────────────────────────────────────────────────────────
// MerkleTree
//
// A binary Merkle tree using Poseidon hashing, matching the circuit's
// MerkleTreeInclusionProof template exactly.
//
// - LEVELS must match the circuit's TREE_LEVELS parameter (16)
// - Leaves are padded with zeros to fill 2^LEVELS slots
// - Internal nodes: Poseidon(left, right)
// ─────────────────────────────────────────────────────────────────────────────

export class MerkleTree {
  constructor(levels = 16) {
    this.levels = levels;
    this.leaves = [];
    this.layers = [];
    this.poseidon = null;
  }

  async init() {
    if (!this.poseidon) {
      this.poseidon = await getPoseidon();
    }
  }

  hash(left, right) {
    return this.poseidon([left, right]);
  }

  // Zero value at each level — used to pad incomplete trees
  zeros() {
    const z = [0n];
    for (let i = 1; i <= this.levels; i++) {
      z[i] = this.hash(z[i - 1], z[i - 1]);
    }
    return z;
  }

  // Build the full tree from current leaves
  buildLayers() {
    const size = 2 ** this.levels;
    const zeros = this.zeros();
    const bottom = [...this.leaves];

    // Pad to full size with zeros
    while (bottom.length < size) bottom.push(zeros[0]);

    this.layers = [bottom];
    for (let level = 0; level < this.levels; level++) {
      const prev = this.layers[level];
      const next = [];
      for (let i = 0; i < prev.length; i += 2) {
        next.push(this.hash(prev[i], prev[i + 1]));
      }
      this.layers.push(next);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  /** Add a leaf (Poseidon(secret, 1)) to the tree */
  async addLeaf(secret) {
    await this.init();
    const leaf = await computeLeaf(secret);
    this.leaves.push(leaf);
    this.buildLayers();
  }

  /** Add multiple leaves at once — more efficient for bulk registration */
  async addLeaves(secrets) {
    await this.init();
    for (const s of secrets) {
      this.leaves.push(await computeLeaf(s));
    }
    this.buildLayers();
  }

  /** Current Merkle root */
  get root() {
    if (this.layers.length === 0) return 0n;
    return this.layers[this.levels][0];
  }

  /** Root as a hex string for passing to the contract */
  get rootHex() {
    return "0x" + this.root.toString(16).padStart(64, "0");
  }

  /**
   * Generate a Merkle inclusion proof for a given secret.
   * Returns the pathElements and pathIndices needed by the circuit.
   */
  async generateProof(secret) {
    await this.init();
    const leaf = await computeLeaf(secret);
    const index = this.leaves.indexOf(leaf);

    if (index === -1) throw new Error("Secret not found in tree — voter not registered");

    const zeros = this.zeros();
    const pathElements = [];
    const pathIndices = [];

    let currentIndex = index;

    for (let level = 0; level < this.levels; level++) {
      const layer = this.layers[level];
      const isRight = currentIndex % 2;           // 1 if right child, 0 if left
      const siblingIdx = isRight ? currentIndex - 1 : currentIndex + 1;
      const sibling = siblingIdx < layer.length ? layer[siblingIdx] : zeros[level];

      pathElements.push(sibling);
      pathIndices.push(isRight);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return {
      pathElements,
      pathIndices,
      root: this.root,
      leaf,
    };
  }
}