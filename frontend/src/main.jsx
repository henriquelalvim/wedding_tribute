import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider } from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import App from "./App.jsx";
import { hasPrivy, privyAppId, privyChain } from "./config.js";
import "./index.css";

// PrivyProvider throws if given an empty/invalid appId, so it's only mounted once a
// real one is configured — the MetaMask path works either way, it never depends on
// this provider existing.
function Root() {
  if (!hasPrivy) return <App />;
  return (
    <PrivyProvider
      appId={privyAppId}
      config={{
        loginMethods: ["google", "email"],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        defaultChain: privyChain,
        supportedChains: [privyChain],
      }}
    >
      <SmartWalletsProvider>
        <App />
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>,
);
