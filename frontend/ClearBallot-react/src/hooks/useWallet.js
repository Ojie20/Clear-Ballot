import { useState, useCallback, useEffect } from "react";
import { BrowserProvider } from "ethers";
import { CHAIN_ID } from "../constants/contract";

export function useWallet() {
  const [wallet, setWallet] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [chainOk, setChainOk] = useState(false);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const checkChain = useCallback(async () => {
    if (!window.ethereum) return;
    const provider = new BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    setChainOk(Number(network.chainId) === CHAIN_ID);
  }, []);

  // ── Connect ───────────────────────────────────────────────────────────────

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      if (typeof window.ethereum !== "undefined") {
        const provider = new BrowserProvider(window.ethereum);
        const accounts = await provider.send("eth_requestAccounts", []);
        setWallet(accounts[0]);
        await checkChain();
      } else {
        // Demo mode — no MetaMask installed
        await new Promise((r) => setTimeout(r, 1200));
        setWallet("0xDe4dB33F3C2A8B1E9a7C054F12d3e5A0b2C9f871");
        setChainOk(true);
      }
    } catch (err) {
      console.warn("Wallet connection rejected", err);
    } finally {
      setConnecting(false);
    }
  }, [checkChain]);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
    setChainOk(false);
  }, []);

  // ── Listen for account / chain changes ────────────────────────────────────

  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        setWallet(accounts[0]);
      }
    };

    const onChainChanged = () => {
      // Recommended by MetaMask: reload on chain change
      window.location.reload();
    };

    window.ethereum.on("accountsChanged", onAccountsChanged);
    window.ethereum.on("chainChanged", onChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", onAccountsChanged);
      window.ethereum?.removeListener("chainChanged", onChainChanged);
    };
  }, [disconnectWallet]);

  // ── Utils ─────────────────────────────────────────────────────────────────

  const shortAddr = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return { wallet, connecting, chainOk, connectWallet, disconnectWallet, shortAddr };
}