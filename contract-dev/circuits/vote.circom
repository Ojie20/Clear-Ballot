pragma circom 2.0.0;

// circomlib gives us Poseidon (ZKP-friendly hash) and comparators
include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

// ─────────────────────────────────────────────────────────────────────────────
// MerkleTreeInclusionProof
//
// Proves that a leaf exists in a Merkle tree without revealing which leaf.
//
// At each level we need to hash (current, sibling) or (sibling, current)
// depending on whether we are the left or right child.
//
// Instead of MuxOne we use arithmetic to select ordering:
//   If pathIndex == 0 (we are left child):
//     left  = currentHash
//     right = pathElement
//   If pathIndex == 1 (we are right child):
//     left  = pathElement
//     right = currentHash
//
// This is achieved with:
//   left  = currentHash + pathIndex * (pathElement - currentHash)
//   right = pathElement + pathIndex * (currentHash - pathElement)
// Which simplifies to a linear constraint — no extra template needed.
// ─────────────────────────────────────────────────────────────────────────────

template MerkleTreeInclusionProof(levels) {
    signal input  leaf;
    signal input  pathElements[levels];
    signal input  pathIndices[levels];
    signal output root;

    component hashers[levels];

    // Intermediate signals for left/right inputs at each level
    signal lefts[levels];
    signal rights[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        // pathIndices[i] must be binary (0 or 1)
        pathIndices[i] * (pathIndices[i] - 1) === 0;

        // Inline mux using linear arithmetic — no external template needed:
        //   index=0 → left=current, right=sibling
        //   index=1 → left=sibling, right=current
        lefts[i]  <== levelHashes[i]  + pathIndices[i] * (pathElements[i] - levelHashes[i]);
        rights[i] <== pathElements[i] + pathIndices[i] * (levelHashes[i]  - pathElements[i]);

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== lefts[i];
        hashers[i].inputs[1] <== rights[i];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root <== levelHashes[levels];
}


// ─────────────────────────────────────────────────────────────────────────────
// VoteProof — the main circuit
//
// PRIVATE inputs (never leave the browser):
//   secret           — random value the voter generated at registration
//   pathElements     — sibling hashes along the Merkle path
//   pathIndices      — left/right directions along the Merkle path
//
// PUBLIC inputs (visible to the contract for verification):
//   merkleRoot       — root of the registered voters tree (stored on-chain)
//   nullifierHash    — Poseidon(secret, 0) — unique per voter, not reversible
//   candidateId      — which candidate the voter is voting for
//   candidateCount   — total number of candidates (for range check)
//
// Constraints proved:
//   1. nullifierHash == Poseidon(secret, 0)      → voter knows the secret
//   2. Poseidon(secret, 1) is in the Merkle tree → voter is registered
//   3. nullifierHash is unique                   → no double voting
//   4. 1 <= candidateId <= candidateCount        → vote is valid
//   5. secret never exposed                      → identity stays hidden
// ─────────────────────────────────────────────────────────────────────────────

template VoteProof(TREE_LEVELS) {

    // ── Private inputs ────────────────────────────────────────────────────────
    signal input secret;
    signal input pathElements[TREE_LEVELS];
    signal input pathIndices[TREE_LEVELS];

    // ── Public inputs ─────────────────────────────────────────────────────────
    signal input merkleRoot;
    signal input nullifierHash;
    signal input candidateId;
    signal input candidateCount;

    // ─────────────────────────────────────────────────────────────────────────
    // Constraint 1 & 3: nullifierHash = Poseidon(secret, 0)
    //
    // Poseidon(secret, 0) — domain separator 0 = nullifier
    // This proves the voter knows the secret behind the nullifier.
    // The contract checks nullifierHash hasn't been used before (no double vote).
    // ─────────────────────────────────────────────────────────────────────────
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== 0;

    nullifierHash === nullifierHasher.out;

    // ─────────────────────────────────────────────────────────────────────────
    // Constraint 2: voter is registered
    //
    // The Merkle leaf for each voter is Poseidon(secret, 1).
    // Domain separator 1 keeps leaf hashes distinct from nullifier hashes.
    //
    // We compute the leaf then verify it exists in the Merkle tree
    // whose root matches the public merkleRoot stored on-chain.
    // ─────────────────────────────────────────────────────────────────────────
    component leafHasher = Poseidon(2);
    leafHasher.inputs[0] <== secret;
    leafHasher.inputs[1] <== 1;

    component merkleProof = MerkleTreeInclusionProof(TREE_LEVELS);
    merkleProof.leaf         <== leafHasher.out;
    for (var i = 0; i < TREE_LEVELS; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i]  <== pathIndices[i];
    }

    merkleRoot === merkleProof.root;

    // ─────────────────────────────────────────────────────────────────────────
    // Constraint 4: vote choice is valid  (1 <= candidateId <= candidateCount)
    //
    // LessEqThan(n) outputs 1 if in[0] <= in[1], using n-bit comparison.
    // We use 32 bits — handles up to ~4 billion candidates.
    // ─────────────────────────────────────────────────────────────────────────

    // 1 <= candidateId
    component geOne = LessEqThan(32);
    geOne.in[0] <== 1;
    geOne.in[1] <== candidateId;
    geOne.out   === 1;

    // candidateId <= candidateCount
    component leCount = LessEqThan(32);
    leCount.in[0] <== candidateId;
    leCount.in[1] <== candidateCount;
    leCount.out   === 1;

    // ─────────────────────────────────────────────────────────────────────────
    // Constraint 5: identity stays hidden
    //
    // Structural guarantee — secret is private input, never in public outputs.
    // nullifierHash = Poseidon(secret) is a one-way function.
    // No additional constraint needed.
    // ─────────────────────────────────────────────────────────────────────────
}

// Instantiate with TREE_LEVELS = 16 (supports up to 65536 registered voters)
component main {public [merkleRoot, nullifierHash, candidateId, candidateCount]} = VoteProof(16);
