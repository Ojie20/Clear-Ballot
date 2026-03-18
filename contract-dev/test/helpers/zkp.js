const { groth16 } = require("snarkjs");
const { buildPoseidon } = require("circomlibjs");
const path = require("path");

const wasmPath = path.join(__dirname, "../../circuits/build/vote_js/vote.wasm");
const zkeyPath = path.join(__dirname, "../../circuits/keys/vote_final.zkey");

let poseidon;

async function getPoseidon() {
  if (!poseidon) poseidon = await buildPoseidon();
  return poseidon;
}

/**
 * Computes Poseidon(a, b) and returns a BigInt
 */
async function poseidonHash(a, b) {
  const p = await getPoseidon();
  const hash = p([a, b]);
  return BigInt(p.F.toString(hash));
}

/**
 * Builds a Merkle tree from an array of leaves and returns
 * { root, pathElements, pathIndices } for a given leaf index.
 */
async function buildMerkleProof(leaves, leafIndex, levels = 16) {
  const p = await getPoseidon();

  const size = 2 ** levels;
  const tree = new Array(size).fill(0n);
  for (let i = 0; i < leaves.length; i++) tree[i] = leaves[i];

  let currentLevel = [...tree];
  const layers = [currentLevel];

  for (let lvl = 0; lvl < levels; lvl++) {
    const nextLevel = [];
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left  = currentLevel[i];
      const right = currentLevel[i + 1] ?? 0n;
      const hash  = p([left, right]);
      nextLevel.push(BigInt(p.F.toString(hash)));
    }
    layers.push(nextLevel);
    currentLevel = nextLevel;
  }

  const root = layers[levels][0];

  const pathElements = [];
  const pathIndices  = [];
  let idx = leafIndex;

  for (let lvl = 0; lvl < levels; lvl++) {
    const isRight    = idx % 2;
    const siblingIdx = isRight ? idx - 1 : idx + 1;
    pathIndices.push(isRight);
    pathElements.push(layers[lvl][siblingIdx] ?? 0n);
    idx = Math.floor(idx / 2);
  }

  return { root, pathElements, pathIndices };
}

/**
 * Generates a full Groth16 proof for a voter.
 *
 * @param {BigInt} secret          - voter's secret
 * @param {BigInt[]} allLeaves     - all registered voter leaves in the tree
 * @param {number} voterIndex      - index of this voter's leaf in the tree
 * @param {number} candidateId     - candidate being voted for
 * @param {number} candidateCount  - total number of candidates
 */
async function generateVoteProof(secret, allLeaves, voterIndex, candidateId, candidateCount) {
  const nullifierHash = await poseidonHash(secret, 0n);
  const leaf          = await poseidonHash(secret, 1n);

  const { root, pathElements, pathIndices } = await buildMerkleProof(allLeaves, voterIndex);

  const input = {
    // Private inputs
    secret:        secret.toString(),
    pathElements:  pathElements.map((e) => e.toString()),
    pathIndices:   pathIndices.map((i) => i.toString()),
    // Public inputs
    merkleRoot:     root.toString(),
    nullifierHash:  nullifierHash.toString(),
    candidateId:    candidateId.toString(),
    candidateCount: candidateCount.toString(),
  };

  const { proof, publicSignals } = await groth16.fullProve(input, wasmPath, zkeyPath);
  const calldata = await groth16.exportSolidityCallData(proof, publicSignals);
  const [a, b, c] = JSON.parse("[" + calldata + "]");

  return { a, b, c, nullifierHash, root };
}

module.exports = { poseidonHash, buildMerkleProof, generateVoteProof };