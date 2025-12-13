// src/hooks/useMakeReadyBoard.tsx
import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { MakeReadyBoardTurn } from '../types/makeReady';

export interface MakeReadyBoardContextType {
  turns: MakeReadyBoardTurn[];
  addTurn: (turn: MakeReadyBoardTurn) => void;
  updateTurn: (id: string, partial: Partial<MakeReadyBoardTurn>) => void;
  removeTurn: (id: string) => void;
  setTurns: (turns: MakeReadyBoardTurn[]) => void;
}

export const MakeReadyBoardContext = createContext<MakeReadyBoardContextType | undefined>(undefined);

export function MakeReadyBoardProvider({ children }: { children: ReactNode }) {
  const [turns, setTurns] = useState<MakeReadyBoardTurn[]>([]);

  const addTurn = useCallback((turn: MakeReadyBoardTurn): void => {
    setTurns((prev) => [turn, ...prev]);
  }, []);

  const updateTurn = useCallback((id: string, partial: Partial<MakeReadyBoardTurn>): void => {
    setTurns((prev) =>
      prev.map((turn) => (turn.id === id ? { ...turn, ...partial } : turn))
    );
  }, []);

  const removeTurn = useCallback((id: string): void => {
    setTurns((prev) => prev.filter((turn) => turn.id !== id));
  }, []);

  const value: MakeReadyBoardContextType = {
    turns,
    addTurn,
    updateTurn,
    removeTurn,
    setTurns,
  };

  return (
    <MakeReadyBoardContext.Provider value={value}>
      {children}
    </MakeReadyBoardContext.Provider>
  );
}

export const useMakeReadyBoard = (): MakeReadyBoardContextType => {
  const context = useContext(MakeReadyBoardContext);
  if (!context) {
    throw new Error('useMakeReadyBoard must be used within MakeReadyBoardProvider');
  }
  return context;
};
