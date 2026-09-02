import { chain, contractAddress, isConfigured } from "./config.js";
import content from "./content.js";
import { useWallet } from "./hooks/useWallet.js";
import { useWedding } from "./hooks/useWedding.js";
import { useTributes } from "./hooks/useTributes.js";
import CelebrationModal from "./components/CelebrationModal.jsx";
import Colophon from "./components/Colophon.jsx";
import CoupleAdminPanel from "./components/CoupleAdminPanel.jsx";
import CoupleHero from "./components/CoupleHero.jsx";
import DocumentHeader from "./components/DocumentHeader.jsx";
import SetupNotice from "./components/SetupNotice.jsx";
import SignatureBlock from "./components/SignatureBlock.jsx";
import StatusPanel from "./components/StatusPanel.jsx";
import TributeForm from "./components/TributeForm.jsx";
import TributeWall from "./components/TributeWall.jsx";
import TxBanner from "./components/TxBanner.jsx";
import VowsPanel from "./components/VowsPanel.jsx";

function Wedding() {
  const wallet = useWallet();
  const wedding = useWedding(wallet);
  const tributes = useTributes();

  return (
    <div className="min-h-dvh">
      <DocumentHeader
        registryLabel={content.registryLabel}
        chain={chain}
        wallet={wallet}
      />

      <main className="mx-auto w-full max-w-2xl px-5 pb-28 sm:px-8">
        <CoupleHero
          couple={content.couple}
          ceremony={wedding.ceremony}
          explorer={chain.explorer}
        />

        <StatusPanel
          ceremony={wedding.ceremony}
          chain={chain}
          monogram={content.couple.monogram}
          isLoading={wedding.isLoading}
          readError={wedding.readError}
          onOpenCelebration={wedding.celebration ? null : wedding.openCelebration}
        />

        <VowsPanel
          ceremony={wedding.ceremony}
          couple={content.couple}
          emptyVow={content.emptyVow}
        />

        <SignatureBlock
          ceremony={wedding.ceremony}
          role={wedding.role}
          wallet={wallet}
          wedding={wedding}
          chain={chain}
        />

        <TributeForm
          copy={content.tribute}
          chain={chain}
          wallet={wallet}
          wedding={wedding}
          onSent={tributes.refresh}
        />

        <TributeWall
          tributes={tributes.tributes}
          isLoading={tributes.isLoading}
          error={tributes.error}
          explorer={chain.explorer}
        />

        <Colophon
          chain={chain}
          contractAddress={contractAddress}
          readError={wedding.readError}
        />

        <CoupleAdminPanel
          role={wedding.role}
          ceremony={wedding.ceremony}
          wedding={wedding}
        />
      </main>

      <TxBanner tx={wedding.tx} chain={chain} onDismiss={wedding.resetTx} />

      {wedding.celebration ? (
        <CelebrationModal
          celebration={wedding.celebration}
          copy={content.celebration}
          couple={content.couple}
          chain={chain}
          emptyVow={content.emptyVow}
          onClose={wedding.dismissCelebration}
        />
      ) : null}
    </div>
  );
}

export default function App() {
  return isConfigured ? <Wedding /> : <SetupNotice />;
}
