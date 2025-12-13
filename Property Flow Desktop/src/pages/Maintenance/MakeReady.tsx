// Integration of existing MakeReadyBoard component from Property Flow Tech
// This component is mounted as-is without modifications
// Note: MakeReadyBoard expects optional props: selectedTurnId, onSelectTurn
// For now, we mount it in uncontrolled mode (no props passed)
import MakeReadyBoard from '../MakeReadyBoard/MakeReadyBoard.tsx';

const MaintenanceMakeReady = () => {
  return <MakeReadyBoard />;
};

export default MaintenanceMakeReady;
