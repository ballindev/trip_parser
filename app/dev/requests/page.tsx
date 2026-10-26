import { DevGate } from "@/components/dev/DevGate";
import { DevScreen } from "@/components/dev/DevScreen";

export default function DevRequestsPage() {
  return (
    <DevGate>
      <DevScreen />
    </DevGate>
  );
}
