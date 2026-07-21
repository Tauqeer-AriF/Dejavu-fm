import React from "react";
import { PremiumRingLoader } from "../../components/PremiumRingLoader";

export function LoadingFallback() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <PremiumRingLoader size="md" />
    </div>
  );
}
