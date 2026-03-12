import { useState, useCallback } from "react";

export function useWallet() {
  const [wallet, setWallet]         = useState(null);
  const [connecting, setConnecting] = useState(false);

  const connectWallet = useCallback(async () => {
    setConnecting(true);
    try {
      if (typeof window.ethereum !== "undefined") {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        setWallet(accounts[0]);
      } else {
        // Demo mode — simulate wallet connection
        await new Promise((r) => setTimeout(r, 1200));
        setWallet("0xDe4dB33F3C2A8B1E9a7C054F12d3e5A0b2C9f871");
      }
    } catch {
      // User rejected connection
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
  }, []);

  const shortAddr = (addr) =>
    addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "";

  return { wallet, connecting, connectWallet, disconnectWallet, shortAddr };
}