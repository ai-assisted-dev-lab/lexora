export interface WeeklyDataPoint {
  day: string;
  words: number;
}

export interface MasteryLevel {
  label: string;
  count: number;
  color: string;
}

export interface WeakTopic {
  topic: string;
  deck: string;
  accuracy: number;
  count: number;
}
