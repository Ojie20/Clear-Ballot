import { useState, useCallback } from "react";
import { groth16 } from "snarkjs";
import {
  computeNullifier,
  MerkleTree,
} from "../utils/MerkleTree";

// Paths to files in public/ — Vite serves these statically
const WASM_PATH = "/vote.wasm";
const ZKEY_PATH = "/vote_final.zkey";

export function useZKP() {
  const [step, setStep] = useState("idle");
  const [error, setError] = useState(null);

  /**
   * Generate a Groth16 ZK proof for a vote.
   *
   * @param merkleTree     — the MerkleTree instance built from registered voter secrets
   * @param voterSecret    — this voter's secret (stored locally, never sent anywhere)
   * @param candidateId    — the candidate being voted for
   * @param candidateCount — total number of candidates in this election
   */
  const generateProof = useCallback(async (
    merkleTree,
    voterSecret,
    candidateId,
    candidateCount,
  ) => {
    setStep("idle");
    setError(null);

    try {
      // ── Step 1: Compute nullifier ─────────────────────────────────────────
      setStep("generating_secret");
      const nullifierHash = await computeNullifier(voterSecret);

      // ── Step 2: Build Merkle witness ──────────────────────────────────────
      setStep("building_witness");
      const merkleProof = await merkleTree.generateProof(voterSecret);

      // Circuit inputs — names must match signal names in vote.circom exactly
      const inputs = {
        secret: voterSecret.toString(),
        pathElements: merkleProof.pathElements.map((e) => e.toString()),
        pathIndices: merkleProof.pathIndices.map((i) => i.toString()),
        merkleRoot: merkleProof.root.toString(),
        nullifierHash: nullifierHash.toString(),
        candidateId: candidateId.toString(),
        candidateCount: candidateCount.toString(),
      };

      // ── Step 3: Generate zk-SNARK proof ───────────────────────────────────
      setStep("creating_proof");
      const { proof, publicSignals } = await groth16.fullProve(inputs, WASM_PATH, ZKEY_PATH);
      console.log("Public Signals",publicSignals);
      

      // ── Step 4: Encode proof for Solidity calldata ────────────────────────
      setStep("encoding");

      const a = [
        BigInt(proof.pi_a[0]),
        BigInt(proof.pi_a[1]),
      ];

      // pi_b indices are swapped for Solidity — this is a snarkjs convention
      const b = [
        [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
        [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])],
      ];

      const c = [
        BigInt(proof.pi_c[0]),
        BigInt(proof.pi_c[1]),
      ];

      setStep("done");
      return { a, b, c, nullifierHash };

    } catch (err) {
      const msg = err?.message ?? "Proof generation failed";
      setError(msg);
      setStep("error");
      console.error("[useZKP]", err);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setStep("idle");
    setError(null);
  }, []);

  return { step, error, generateProof, reset };
}