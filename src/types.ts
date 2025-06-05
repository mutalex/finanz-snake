export type ItemType = 'leasing' | 'mietkauf' | 'factoring' | 'hindernis' | 'finanzamt';

export interface Item {
  x: number;
  y: number;
  type: ItemType;
}

export type MissionType = 'factoring' | 'kombiniert' | 'zeit' | 'ekquote';

export interface Mission {
  typ: MissionType;
  ziel: number;
  reward: number;
  progress: number;
  active: boolean;
  startTime?: number;
}
